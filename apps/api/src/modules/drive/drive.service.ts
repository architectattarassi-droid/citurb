import { Injectable } from "@nestjs/common";
import { ArchiveService } from "../archive/archive.service";
import { join } from "path";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  createReadStream,
  createWriteStream,
  unlinkSync,
} from "fs";
import { randomBytes } from "crypto";

/**
 * DriveService — Miroir Google Drive « rien ne se perd » (étape 1b durabilité).
 *
 * Mono-tenant : un seul compte Drive (le fondateur, architectattarassi@gmail.com).
 * Le jeton de rafraîchissement OAuth est stocké sur le volume persistant.
 * Chaque « mirror » construit le ZIP complet du dossier (mêmes données que
 * l'export archive) et le pousse dans :
 *
 *   CITURBAREA - Dossiers / <titre> [id] / dossier-<titre>-<date>.zip
 *
 * Une fois branché à Google Drive Desktop, ces fichiers se synchronisent
 * automatiquement sur le disque de l'utilisateur → triple redondance
 * (plateforme + Drive + disque local).
 *
 * Appels HTTP en REST brut (fetch global Node 20), sans lib npm — cohérent
 * avec l'approche Stripe du projet.
 */

const UPLOADS_BASE = process.env.UPLOADS_DIR || join(process.cwd(), "uploads");
const DRIVE_DIR = join(UPLOADS_BASE, "drive");
const CRED_FILE = join(DRIVE_DIR, "credentials.json");
const TMP_DIR = join(DRIVE_DIR, "tmp");
const SCOPE = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";
const ROOT_FOLDER_NAME = "CITURBAREA - Dossiers";

type Creds = {
  refreshToken?: string;
  email?: string;
  connectedAt?: string;
  pendingState?: string;
  rootFolderId?: string;
  dossierFolders?: Record<string, string>; // dossierId -> folderId Drive
};

@Injectable()
export class DriveService {
  constructor(private readonly archive: ArchiveService) {
    try {
      mkdirSync(DRIVE_DIR, { recursive: true });
    } catch {}
  }

  // ── Config OAuth (via env) ───────────────────────────────────────────
  private clientId() {
    return process.env.GOOGLE_CLIENT_ID || "";
  }
  private clientSecret() {
    return process.env.GOOGLE_CLIENT_SECRET || "";
  }
  private redirectUri() {
    return process.env.GOOGLE_DRIVE_REDIRECT_URI || "https://citurbarea.com/api/cc/drive/callback";
  }
  isConfigured() {
    return !!(this.clientId() && this.clientSecret());
  }

  // ── Persistance du jeton (volume) ────────────────────────────────────
  private readCreds(): Creds {
    try {
      return JSON.parse(readFileSync(CRED_FILE, "utf8"));
    } catch {
      return {};
    }
  }
  private writeCreds(c: Creds) {
    try {
      mkdirSync(DRIVE_DIR, { recursive: true });
    } catch {}
    writeFileSync(CRED_FILE, JSON.stringify(c, null, 2));
  }

  status() {
    const c = this.readCreds();
    return {
      configured: this.isConfigured(),
      connected: !!c.refreshToken,
      email: c.email || null,
      connectedAt: c.connectedAt || null,
      dossiersMirrored: Object.keys(c.dossierFolders || {}).length,
    };
  }

  // ── Flux OAuth ───────────────────────────────────────────────────────
  /** Construit l'URL de consentement Google + mémorise un state anti-CSRF. */
  authUrl(): string {
    const state = randomBytes(16).toString("hex");
    const c = this.readCreds();
    c.pendingState = state;
    this.writeCreds(c);
    const p = new URLSearchParams({
      client_id: this.clientId(),
      redirect_uri: this.redirectUri(),
      response_type: "code",
      scope: SCOPE,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
  }

  /** Échange le code OAuth contre un refresh_token et le persiste. */
  async handleCallback(code: string, state: string): Promise<{ email: string | null }> {
    const c = this.readCreds();
    if (!c.pendingState || c.pendingState !== state) {
      throw new Error("State OAuth invalide (anti-CSRF)");
    }
    const body = new URLSearchParams({
      code,
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      redirect_uri: this.redirectUri(),
      grant_type: "authorization_code",
    });
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const j: any = await r.json();
    if (!r.ok || !j.refresh_token) {
      throw new Error("Échec échange OAuth: " + JSON.stringify(j));
    }
    // Récupère l'email connecté (scope userinfo.email)
    let email: string | null = null;
    try {
      const ur = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${j.access_token}` },
      });
      const uj: any = await ur.json();
      email = uj.email || null;
    } catch {}

    c.refreshToken = j.refresh_token;
    c.email = email || c.email;
    c.connectedAt = new Date().toISOString();
    delete c.pendingState;
    this.writeCreds(c);
    return { email };
  }

  disconnect() {
    const c = this.readCreds();
    delete c.refreshToken;
    delete c.email;
    delete c.connectedAt;
    this.writeCreds(c);
    return { ok: true };
  }

  // ── Appels Drive ─────────────────────────────────────────────────────
  private async accessToken(): Promise<string> {
    const c = this.readCreds();
    if (!c.refreshToken) throw new Error("Google Drive non connecté");
    const body = new URLSearchParams({
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      refresh_token: c.refreshToken,
      grant_type: "refresh_token",
    });
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const j: any = await r.json();
    if (!r.ok || !j.access_token) throw new Error("Refresh token Drive invalide: " + JSON.stringify(j));
    return j.access_token;
  }

  /** Cherche (ou crée) un dossier Drive par nom sous un parent optionnel. */
  private async findOrCreateFolder(token: string, name: string, parentId?: string): Promise<string> {
    const safe = name.replace(/'/g, "\\'");
    let q = `mimeType='application/vnd.google-apps.folder' and name='${safe}' and trashed=false`;
    if (parentId) q += ` and '${parentId}' in parents`;
    const sr = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const sj: any = await sr.json();
    if (sj.files && sj.files.length) return sj.files[0].id;

    const meta: any = { name, mimeType: "application/vnd.google-apps.folder" };
    if (parentId) meta.parents = [parentId];
    const cr = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(meta),
    });
    const cj: any = await cr.json();
    if (!cr.ok || !cj.id) throw new Error("Création dossier Drive échouée: " + JSON.stringify(cj));
    return cj.id;
  }

  /** Upload résumable (supporte les gros fichiers 3D/IFC). */
  private async uploadFile(
    token: string,
    folderId: string,
    name: string,
    data: Buffer,
    mimeType: string,
  ): Promise<string> {
    const init = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mimeType,
          "X-Upload-Content-Length": String(data.length),
        },
        body: JSON.stringify({ name, parents: [folderId] }),
      },
    );
    const sessionUri = init.headers.get("location");
    if (!init.ok || !sessionUri) throw new Error("Init upload Drive échoué: " + (await init.text().catch(() => "")));

    const put = await fetch(sessionUri, {
      method: "PUT",
      headers: { "Content-Type": mimeType, "Content-Length": String(data.length) },
      body: data as any, // undici accepte un Buffer au runtime
    });
    const pj: any = await put.json();
    if (!put.ok || !pj.id) throw new Error("Upload Drive échoué: " + JSON.stringify(pj));
    return pj.id;
  }

  // ── Miroir d'un dossier complet ──────────────────────────────────────
  async mirrorDossier(dossierId: string): Promise<{
    ok: true;
    fileId: string;
    folderId: string;
    fileName: string;
    zipBytes: number;
    missing: number;
  }> {
    if (!this.isConfigured()) throw new Error("Google Drive non configuré (variables d'environnement manquantes)");
    const creds = this.readCreds();
    if (!creds.refreshToken) throw new Error("Google Drive non connecté");
    const token = await this.accessToken();

    // 1. Construit le ZIP complet en fichier temporaire
    const { full, files, missing } = await this.archive.collectExport(dossierId);
    const d: any = full.dossier;
    const safeTitle = String(d.title || d.id).replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 60) || String(d.id);
    const stamp = new Date().toISOString().slice(0, 10);
    const fileName = `dossier-${safeTitle}-${stamp}.zip`;

    try {
      mkdirSync(TMP_DIR, { recursive: true });
    } catch {}
    const tmpZip = join(TMP_DIR, `${dossierId}-${Date.now()}.zip`);

    await new Promise<void>((resolve, reject) => {
      const archiver = require("archiver");
      const out = createWriteStream(tmpZip);
      const archive = archiver("zip", { zlib: { level: 9 } });
      out.on("close", () => resolve());
      out.on("error", reject);
      archive.on("error", reject);
      archive.pipe(out);
      archive.append(JSON.stringify(full, null, 2), { name: "00_manifest.json" });
      const readme = [
        `EXPORT DOSSIER — CITURBAREA (miroir Google Drive)`,
        `Dossier : ${d.title || "(sans titre)"}  [${d.id}]`,
        `Porte   : ${d.porteType || "?"}   Statut : ${d.status || "?"}`,
        `Miroir  : ${stamp}`,
        `Fichiers inclus : ${files.length}`,
        missing.length ? `⚠️ Fichiers absents du volume : ${missing.length}` : `Aucun fichier manquant. ✅`,
      ].join("\n");
      archive.append(readme, { name: "00_LISEZ-MOI.txt" });
      for (const f of files) archive.append(createReadStream(f.diskPath), { name: f.zipPath });
      archive.finalize();
    });

    const data = readFileSync(tmpZip);
    const zipBytes = data.length;

    // 2. Arborescence Drive (racine + dossier)
    const rootId = creds.rootFolderId || (await this.findOrCreateFolder(token, ROOT_FOLDER_NAME));
    const folderName = `${safeTitle} [${String(d.id).slice(0, 8)}]`;
    const folderId =
      (creds.dossierFolders && creds.dossierFolders[dossierId]) ||
      (await this.findOrCreateFolder(token, folderName, rootId));

    // 3. Upload du ZIP
    const fileId = await this.uploadFile(token, folderId, fileName, data, "application/zip");

    // 4. Persiste les IDs + nettoyage
    creds.rootFolderId = rootId;
    creds.dossierFolders = { ...(creds.dossierFolders || {}), [dossierId]: folderId };
    this.writeCreds(creds);
    try {
      unlinkSync(tmpZip);
    } catch {}

    return { ok: true, fileId, folderId, fileName, zipBytes, missing: missing.length };
  }
}
