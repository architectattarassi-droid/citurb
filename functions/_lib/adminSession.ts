/**
 * Session back-office par mot de passe (sans Cloudflare Access).
 *
 * Partagé par functions/api/cc/_middleware.ts (garde) et login.ts / logout.ts.
 * Ce fichier n'exporte aucun gestionnaire onRequest : Pages n'en fait pas une route.
 *
 * Secrets (Workers & Pages → citurbarea → Settings → Variables and secrets) :
 *   ADMIN_PASSWORD_HASH   produit par scripts/admin-password-hash.mjs
 *   ADMIN_SESSION_SECRET  ≥ 32 octets aléatoires (signe le cookie)
 *   ADMIN_LOGIN_EMAIL     facultatif : identité affichée / auteur des notes
 *                         (sinon la première adresse de ADMIN_EMAILS, sinon « admin »)
 *
 * Format du hash : pbkdf2c$sha256$<itérations>$<sel_b64>$<hash_b64>
 *   Le runtime Workers refuse PBKDF2 au-delà de 100 000 itérations par appel.
 *   « pbkdf2c » = PBKDF2-HMAC-SHA256 enchaîné : le total est découpé en passes
 *   de ≤ 100 000, la clé dérivée d'une passe sert de mot de passe à la
 *   suivante (même sel). Coût pour un attaquant = somme des passes.
 *
 * Cookie cc_session = v1.<exp_s>.<email_b64url>.<hmac_b64url>,
 *   hmac = HMAC-SHA256(ADMIN_SESSION_SECRET, "v1.<exp_s>.<email_b64url>").
 */

export interface PasswordEnv {
  ADMIN_PASSWORD_HASH?: string;
  ADMIN_SESSION_SECRET?: string;
  ADMIN_LOGIN_EMAIL?: string;
  ADMIN_EMAILS?: string;
}

export const COOKIE = "cc_session";
export const DUREE_S = 12 * 3600;
const PASSE_MAX = 100_000;
const ITER_MIN = 210_000;
const enc = new TextEncoder();

const b64 = (u: Uint8Array): string => btoa(String.fromCharCode(...u));
const deB64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (u: Uint8Array): string => b64(u).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64url = (s: string): Uint8Array => deB64(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));

/** Comparaison en temps constant (ne dépend que de la longueur). */
export function egaux(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

async function pbkdf2Chaine(motDePasse: Uint8Array, sel: Uint8Array, iterations: number, octets: number): Promise<Uint8Array> {
  let cle = motDePasse;
  for (let reste = iterations; reste > 0; reste -= PASSE_MAX) {
    const k = await crypto.subtle.importKey("raw", cle as BufferSource, "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: sel as BufferSource, iterations: Math.min(reste, PASSE_MAX) }, k, octets * 8);
    cle = new Uint8Array(bits);
  }
  return cle;
}

/** Produit une valeur ADMIN_PASSWORD_HASH (même algorithme que le script node). */
export async function hacherMotDePasse(motDePasse: string, iterations = ITER_MIN): Promise<string> {
  const sel = crypto.getRandomValues(new Uint8Array(16));
  const h = await pbkdf2Chaine(enc.encode(motDePasse), sel, iterations, 32);
  return `pbkdf2c$sha256$${iterations}$${b64(sel)}$${b64(h)}`;
}

/** Vrai si le hash stocké est exploitable (format, itérations ≥ 210 000). */
export function hashValide(stocke: string | undefined): boolean {
  const p = (stocke || "").trim().split("$");
  if (p.length !== 5 || p[0] !== "pbkdf2c" || p[1] !== "sha256" || !/^\d+$/.test(p[2])) return false;
  const n = Number(p[2]);
  return n >= ITER_MIN && n <= 2_000_000 && p[3].length > 0 && p[4].length > 0;
}

export async function verifierMotDePasse(motDePasse: string, stocke: string): Promise<boolean> {
  if (!hashValide(stocke)) return false;
  const [, , it, selB64, hB64] = stocke.trim().split("$");
  let sel: Uint8Array, attendu: Uint8Array;
  try { sel = deB64(selB64); attendu = deB64(hB64); } catch { return false; }
  const h = await pbkdf2Chaine(enc.encode(motDePasse), sel, Number(it), attendu.length);
  return egaux(h, attendu);
}

/** Mode mot de passe configuré ? (hash correct + secret ≥ 32 caractères) */
export function modeMotDePasse(env: PasswordEnv): boolean {
  return hashValide(env.ADMIN_PASSWORD_HASH) && (env.ADMIN_SESSION_SECRET || "").trim().length >= 32;
}

export function identite(env: PasswordEnv): string {
  const e = (env.ADMIN_LOGIN_EMAIL || "").trim() || (env.ADMIN_EMAILS || "").split(",")[0].trim();
  return (e || "admin").toLowerCase();
}

async function hmac(secret: string, donnees: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret.trim()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(donnees)));
}

export async function creerJetonSession(email: string, secret: string, maintenant = Date.now()): Promise<string> {
  const corps = `v1.${Math.floor(maintenant / 1000) + DUREE_S}.${b64url(enc.encode(email))}`;
  return `${corps}.${b64url(await hmac(secret, corps))}`;
}

/** Renvoie l'e-mail porté par un cookie valide, sinon null. */
export async function lireJetonSession(jeton: string, secret: string, maintenant = Date.now()): Promise<string | null> {
  const p = jeton.split(".");
  if (p.length !== 4 || p[0] !== "v1" || !/^\d+$/.test(p[1])) return null;
  let mac: Uint8Array;
  try { mac = deB64url(p[3]); } catch { return null; }
  if (!egaux(await hmac(secret, `${p[0]}.${p[1]}.${p[2]}`), mac)) return null;
  const exp = Number(p[1]), s = Math.floor(maintenant / 1000);
  if (exp < s || exp > s + DUREE_S + 60) return null;
  try { return new TextDecoder().decode(deB64url(p[2])) || null; } catch { return null; }
}

export function cookieDeLaRequete(req: Request): string {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(req.headers.get("cookie") || "");
  return m ? m[1] : "";
}

export const enteteCookie = (valeur: string, maxAge: number): string =>
  `${COOKIE}=${valeur}; Path=/api/cc; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;

/** L'en-tête Origin doit être exactement l'origine de la requête (anti-CSRF). */
export function origineAutorisee(req: Request): boolean {
  return req.headers.get("origin") === new URL(req.url).origin;
}

export const json = (status: number, corps: Record<string, unknown>, entetes: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(corps), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...entetes },
  });
