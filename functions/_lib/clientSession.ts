/**
 * Session client légère (lot 3a, docs/architecture/plan-rebranchement.md).
 *
 * Pas de mot de passe : le client reçoit un lien signé (`/mon-dossier/<jeton>`,
 * jetonDossier() de dossierAdmin.ts, envoyé par le cabinet ou par e-mail sur
 * demande) ; l'ouvrir échange ce lien contre un cookie de session signé.
 *
 *   Cookie cli_session = c1.<exp_s>.<userId_b64url>.<hmac_b64url>
 *     hmac = HMAC-SHA256(secret, "cli|c1.<exp_s>.<userId_b64url>"), 30 jours,
 *     Path=/api/client (HttpOnly, Secure, SameSite=Strict).
 *   Secret : CLIENT_SESSION_SECRET, à défaut DOSSIER_LIEN_SECRET, à défaut
 *     ADMIN_SESSION_SECRET (≥ 32 caractères). Aucun → 503 access_not_configured.
 *   Révocation : le compte "User" désactivé (isActive = false) ou d'un autre
 *     rôle que CLIENT n'ouvre plus aucune session, même avec un cookie valide.
 *
 * Réutilisable par les autres modules (messagerie, appels vidéo, espace projet) :
 *   lireSessionClient(request, env, sql) → { clientId, dossierIds } | null
 * Aucune table créée : "User" et "Dossier" (docs/sql/dossiers-neon.sql).
 */

import { egaux } from "./adminSession";

export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

export interface EnvClient {
  CLIENT_SESSION_SECRET?: string;
  DOSSIER_LIEN_SECRET?: string;
  ADMIN_SESSION_SECRET?: string;
}

export type SessionClient = { clientId: string; dossierIds: string[] };

export const COOKIE_CLIENT = "cli_session";
export const DUREE_CLIENT_S = 30 * 24 * 3600;
const enc = new TextEncoder();

const b64url = (u: Uint8Array): string => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64url = (s: string): Uint8Array =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

async function hmac(secret: string, donnees: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret.trim()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(donnees)));
}

export function secretClient(env: EnvClient): string | null {
  for (const s of [env.CLIENT_SESSION_SECRET, env.DOSSIER_LIEN_SECRET, env.ADMIN_SESSION_SECRET]) {
    const v = (s || "").trim();
    if (v.length >= 32) return v;
  }
  return null;
}

export async function creerJetonClient(userId: string, secret: string, maintenant = Date.now()): Promise<string> {
  const corps = `c1.${Math.floor(maintenant / 1000) + DUREE_CLIENT_S}.${b64url(enc.encode(userId))}`;
  return `${corps}.${b64url(await hmac(secret, `cli|${corps}`))}`;
}

/** Identifiant du compte porté par un jeton valide (signature, expiration), sinon null. */
export async function lireJetonClient(jeton: string, secret: string, maintenant = Date.now()): Promise<string | null> {
  const p = jeton.split(".");
  if (p.length !== 4 || p[0] !== "c1" || !/^\d+$/.test(p[1])) return null;
  let mac: Uint8Array;
  try { mac = deB64url(p[3]); } catch { return null; }
  if (!egaux(await hmac(secret, `cli|${p[0]}.${p[1]}.${p[2]}`), mac)) return null;
  const exp = Number(p[1]), s = Math.floor(maintenant / 1000);
  if (exp < s || exp > s + DUREE_CLIENT_S + 60) return null;
  try { return new TextDecoder().decode(deB64url(p[2])) || null; } catch { return null; }
}

export function cookieClient(req: Request): string {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE_CLIENT}=([^;]+)`).exec(req.headers.get("cookie") || "");
  return m ? m[1] : "";
}

export const enteteCookieClient = (valeur: string, maxAge: number): string =>
  `${COOKIE_CLIENT}=${valeur}; Path=/api/client; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;

/** Compte client actif ? (rôle CLIENT, non désactivé) */
export async function compteClientActif(sql: Sql, userId: string): Promise<boolean> {
  const r = await sql`SELECT "role", "isActive" FROM "User" WHERE "id" = ${userId} LIMIT 1`;
  return !!r[0] && String(r[0].role) === "CLIENT" && r[0].isActive !== false;
}

/** Dossiers non archivés dont le client est propriétaire (du plus récent au plus ancien). */
export async function dossiersDuClient(sql: Sql, userId: string): Promise<string[]> {
  const r = await sql`SELECT "id" FROM "Dossier" WHERE "ownerId" = ${userId} AND "archivedAt" IS NULL ORDER BY "createdAt" DESC LIMIT 50`
    .catch(async () => sql`SELECT "id" FROM "Dossier" WHERE "ownerId" = ${userId} ORDER BY "createdAt" DESC LIMIT 50`);
  return r.map((x) => String(x.id));
}

/**
 * Session client de la requête : cookie valide ET compte CLIENT actif.
 * À utiliser par toute route qui doit reconnaître le client (messagerie, appels…).
 */
export async function lireSessionClient(req: Request, env: EnvClient, sql: Sql, maintenant = Date.now()): Promise<SessionClient | null> {
  const secret = secretClient(env);
  const jeton = cookieClient(req);
  if (!secret || !jeton) return null;
  const clientId = await lireJetonClient(jeton, secret, maintenant);
  if (!clientId || !(await compteClientActif(sql, clientId))) return null;
  return { clientId, dossierIds: await dossiersDuClient(sql, clientId) };
}
