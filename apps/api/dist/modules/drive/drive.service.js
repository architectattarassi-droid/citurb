"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriveService = void 0;
const common_1 = require("@nestjs/common");
const archive_service_1 = require("../archive/archive.service");
const path_1 = require("path");
const fs_1 = require("fs");
const crypto_1 = require("crypto");
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
const UPLOADS_BASE = process.env.UPLOADS_DIR || (0, path_1.join)(process.cwd(), "uploads");
const DRIVE_DIR = (0, path_1.join)(UPLOADS_BASE, "drive");
const CRED_FILE = (0, path_1.join)(DRIVE_DIR, "credentials.json");
const TMP_DIR = (0, path_1.join)(DRIVE_DIR, "tmp");
const SCOPE = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";
const ROOT_FOLDER_NAME = "CITURBAREA - Dossiers";
let DriveService = class DriveService {
    archive;
    constructor(archive) {
        this.archive = archive;
        try {
            (0, fs_1.mkdirSync)(DRIVE_DIR, { recursive: true });
        }
        catch { }
    }
    // ── Config OAuth (via env) ───────────────────────────────────────────
    clientId() {
        return process.env.GOOGLE_CLIENT_ID || "";
    }
    clientSecret() {
        return process.env.GOOGLE_CLIENT_SECRET || "";
    }
    redirectUri() {
        return process.env.GOOGLE_DRIVE_REDIRECT_URI || "https://citurbarea.com/api/cc/drive/callback";
    }
    isConfigured() {
        return !!(this.clientId() && this.clientSecret());
    }
    // ── Persistance du jeton (volume) ────────────────────────────────────
    readCreds() {
        try {
            return JSON.parse((0, fs_1.readFileSync)(CRED_FILE, "utf8"));
        }
        catch {
            return {};
        }
    }
    writeCreds(c) {
        try {
            (0, fs_1.mkdirSync)(DRIVE_DIR, { recursive: true });
        }
        catch { }
        (0, fs_1.writeFileSync)(CRED_FILE, JSON.stringify(c, null, 2));
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
    authUrl() {
        const state = (0, crypto_1.randomBytes)(16).toString("hex");
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
    async handleCallback(code, state) {
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
        const j = await r.json();
        if (!r.ok || !j.refresh_token) {
            throw new Error("Échec échange OAuth: " + JSON.stringify(j));
        }
        // Récupère l'email connecté (scope userinfo.email)
        let email = null;
        try {
            const ur = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                headers: { Authorization: `Bearer ${j.access_token}` },
            });
            const uj = await ur.json();
            email = uj.email || null;
        }
        catch { }
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
    async accessToken() {
        const c = this.readCreds();
        if (!c.refreshToken)
            throw new Error("Google Drive non connecté");
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
        const j = await r.json();
        if (!r.ok || !j.access_token)
            throw new Error("Refresh token Drive invalide: " + JSON.stringify(j));
        return j.access_token;
    }
    /** Cherche (ou crée) un dossier Drive par nom sous un parent optionnel. */
    async findOrCreateFolder(token, name, parentId) {
        const safe = name.replace(/'/g, "\\'");
        let q = `mimeType='application/vnd.google-apps.folder' and name='${safe}' and trashed=false`;
        if (parentId)
            q += ` and '${parentId}' in parents`;
        const sr = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`, { headers: { Authorization: `Bearer ${token}` } });
        const sj = await sr.json();
        if (sj.files && sj.files.length)
            return sj.files[0].id;
        const meta = { name, mimeType: "application/vnd.google-apps.folder" };
        if (parentId)
            meta.parents = [parentId];
        const cr = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(meta),
        });
        const cj = await cr.json();
        if (!cr.ok || !cj.id)
            throw new Error("Création dossier Drive échouée: " + JSON.stringify(cj));
        return cj.id;
    }
    /** Upload résumable (supporte les gros fichiers 3D/IFC). */
    async uploadFile(token, folderId, name, data, mimeType) {
        const init = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json; charset=UTF-8",
                "X-Upload-Content-Type": mimeType,
                "X-Upload-Content-Length": String(data.length),
            },
            body: JSON.stringify({ name, parents: [folderId] }),
        });
        const sessionUri = init.headers.get("location");
        if (!init.ok || !sessionUri)
            throw new Error("Init upload Drive échoué: " + (await init.text().catch(() => "")));
        const put = await fetch(sessionUri, {
            method: "PUT",
            headers: { "Content-Type": mimeType, "Content-Length": String(data.length) },
            body: data, // undici accepte un Buffer au runtime
        });
        const pj = await put.json();
        if (!put.ok || !pj.id)
            throw new Error("Upload Drive échoué: " + JSON.stringify(pj));
        return pj.id;
    }
    // ── Miroir d'un dossier complet ──────────────────────────────────────
    async mirrorDossier(dossierId) {
        if (!this.isConfigured())
            throw new Error("Google Drive non configuré (variables d'environnement manquantes)");
        const creds = this.readCreds();
        if (!creds.refreshToken)
            throw new Error("Google Drive non connecté");
        const token = await this.accessToken();
        // 1. Construit le ZIP complet en fichier temporaire
        const { full, files, missing } = await this.archive.collectExport(dossierId);
        const d = full.dossier;
        const safeTitle = String(d.title || d.id).replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 60) || String(d.id);
        const stamp = new Date().toISOString().slice(0, 10);
        const fileName = `dossier-${safeTitle}-${stamp}.zip`;
        try {
            (0, fs_1.mkdirSync)(TMP_DIR, { recursive: true });
        }
        catch { }
        const tmpZip = (0, path_1.join)(TMP_DIR, `${dossierId}-${Date.now()}.zip`);
        await new Promise((resolve, reject) => {
            const archiver = require("archiver");
            const out = (0, fs_1.createWriteStream)(tmpZip);
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
            for (const f of files)
                archive.append((0, fs_1.createReadStream)(f.diskPath), { name: f.zipPath });
            archive.finalize();
        });
        const data = (0, fs_1.readFileSync)(tmpZip);
        const zipBytes = data.length;
        // 2. Arborescence Drive (racine + dossier)
        const rootId = creds.rootFolderId || (await this.findOrCreateFolder(token, ROOT_FOLDER_NAME));
        const folderName = `${safeTitle} [${String(d.id).slice(0, 8)}]`;
        const folderId = (creds.dossierFolders && creds.dossierFolders[dossierId]) ||
            (await this.findOrCreateFolder(token, folderName, rootId));
        // 3. Upload du ZIP
        const fileId = await this.uploadFile(token, folderId, fileName, data, "application/zip");
        // 4. Persiste les IDs + nettoyage
        creds.rootFolderId = rootId;
        creds.dossierFolders = { ...(creds.dossierFolders || {}), [dossierId]: folderId };
        this.writeCreds(creds);
        try {
            (0, fs_1.unlinkSync)(tmpZip);
        }
        catch { }
        return { ok: true, fileId, folderId, fileName, zipBytes, missing: missing.length };
    }
};
exports.DriveService = DriveService;
exports.DriveService = DriveService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [archive_service_1.ArchiveService])
], DriveService);
