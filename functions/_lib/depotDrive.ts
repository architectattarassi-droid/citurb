/**
 * Archive Google Drive des documents déposés (décision du fondateur, 15/10) :
 * chaque document VISIBLE est copié dans « CITURBAREA — archives plateforme /
 * <contexte> / <objetId> / » du Drive du cabinet. Neon / R2 restent la
 * source d'affichage ; Drive est l'archive de référence hors de la machine.
 *
 * Connexion OAuth du compte Google du cabinet (un compte de service sans
 * Google Workspace n'a pas d'espace de stockage) — portée `drive.file` :
 * l'application ne voit que les dossiers et fichiers qu'elle a créés.
 * Variables (créées par le fondateur, guide docs/guides/configurer-google-drive.md) :
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN ; GOOGLE_DRIVE_DOSSIER_ID (facultatif).
 * Une seule absente → pas d'archive (le dépôt fonctionne).
 */
import type { LigneDocument } from "./depotRegles";

export interface EnvDrive { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string; GOOGLE_REFRESH_TOKEN?: string; GOOGLE_DRIVE_DOSSIER_ID?: string }

export const driveConfigure = (env: EnvDrive) => !!(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim() && env.GOOGLE_REFRESH_TOKEN?.trim());

const RACINE = "CITURBAREA — archives plateforme";
const DOSSIER = "application/vnd.google-apps.folder";
type Fetch = typeof fetch;

let jeton: { valeur: string; expire: number } | null = null;
async function jetonAcces(env: EnvDrive, f: Fetch): Promise<string> {
  if (jeton && jeton.expire > Date.now() + 60_000) return jeton.valeur;
  const r = await f("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID!.trim(), client_secret: env.GOOGLE_CLIENT_SECRET!.trim(), refresh_token: env.GOOGLE_REFRESH_TOKEN!.trim(), grant_type: "refresh_token" }),
  });
  if (!r.ok) throw new Error(`jeton Google ${r.status}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  jeton = { valeur: j.access_token, expire: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

const dossiers = new Map<string, string>();
const echapperQ = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

/** Dossier « nom » sous « parent » (créé s'il n'existe pas), mis en cache par isolat. */
async function dossier(f: Fetch, t: string, nom: string, parent: string | null): Promise<string> {
  const cle = `${parent ?? "racine"}/${nom}`;
  if (dossiers.has(cle)) return dossiers.get(cle)!;
  const q = `name = '${echapperQ(nom)}' and mimeType = '${DOSSIER}' and trashed = false${parent ? ` and '${parent}' in parents` : ""}`;
  const l = await f(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`, { headers: { authorization: `Bearer ${t}` } });
  let id = l.ok ? ((await l.json()) as { files: { id: string }[] }).files[0]?.id : undefined;
  if (!id) {
    const c = await f("https://www.googleapis.com/drive/v3/files?fields=id", {
      method: "POST", headers: { authorization: `Bearer ${t}`, "content-type": "application/json" },
      body: JSON.stringify({ name: nom, mimeType: DOSSIER, ...(parent ? { parents: [parent] } : {}) }),
    });
    if (!c.ok) throw new Error(`dossier Drive ${c.status}`);
    id = ((await c.json()) as { id: string }).id;
  }
  dossiers.set(cle, id);
  return id;
}

/** Copie un document dans le Drive ; renvoie son identifiant Drive (ou null si non configuré). */
export async function archiverDrive(env: EnvDrive, d: LigneDocument, octets: () => Promise<Uint8Array | ReadableStream | null>, f: Fetch = fetch): Promise<string | null> {
  if (!driveConfigure(env)) return null;
  const corps = await octets();
  if (!corps) return null;
  const t = await jetonAcces(env, f);
  const racine = env.GOOGLE_DRIVE_DOSSIER_ID?.trim() || (await dossier(f, t, RACINE, null));
  const parent = await dossier(f, t, d.objetId, await dossier(f, t, d.contexte, racine));
  const nom = `v${d.version} — ${d.nom}`;
  const description = [`Déposé par ${d.deposantNom} le ${d.createdAt}`, d.meta.phase && `Phase ${d.meta.phase}`, d.meta.categorie && `Catégorie ${d.meta.categorie}`,
    d.meta.niveau && `Niveau ${d.meta.niveau}`, d.meta.version && `Version ${d.meta.version}`, `Réf. ${d.id}`].filter(Boolean).join(" · ");
  // Envoi « reprenable » : une session, puis le contenu en une fois (taille connue).
  const s = await f("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id", {
    method: "POST",
    headers: { authorization: `Bearer ${t}`, "content-type": "application/json; charset=UTF-8", "x-upload-content-type": d.type, "x-upload-content-length": String(d.taille) },
    body: JSON.stringify({ name: nom, parents: [parent], description, appProperties: { citurbareaId: d.id } }),
  });
  const lieu = s.headers.get("location");
  if (!s.ok || !lieu) throw new Error(`session Drive ${s.status}`);
  const r = await f(lieu, { method: "PUT", headers: { "content-type": d.type, "content-length": String(d.taille) }, body: corps as BodyInit });
  if (!r.ok) throw new Error(`envoi Drive ${r.status}`);
  return ((await r.json()) as { id: string }).id;
}
