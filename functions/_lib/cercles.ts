/**
 * Outils communs des Pages Functions Cercles (fournisseurs, fiches de prix,
 * demandes de prix). Aucun gestionnaire onRequest : ce n'est pas une route.
 *
 * Session fournisseur (sans mot de passe) : après vérification d'un code à
 * usage unique envoyé par e-mail (ou transmis par l'administration), un
 * cookie signé est posé :
 *   frn_session = f1.<exp_s>.<id_b64url>.<hmac_b64url>
 *   hmac = HMAC-SHA256(secret, "frn|f1.<exp_s>.<id_b64url>")
 * secret = FOURNISSEUR_SESSION_SECRET (≥ 32 caractères), à défaut
 * ADMIN_SESSION_SECRET : le préfixe « frn| » sépare les domaines, un cookie
 * admin ne peut pas servir de cookie fournisseur ni l'inverse.
 * Cookie HttpOnly, Secure, SameSite=Strict, Path=/api/cercles, 30 jours.
 */

import { egaux } from "./adminSession";

export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

export interface EnvCercles {
  DATABASE_URL?: string;
  FOURNISSEUR_SESSION_SECRET?: string;
  ADMIN_SESSION_SECRET?: string;
  RESEND_API_KEY?: string;
  LEAD_NOTIFY_TO?: string;
  LEAD_NOTIFY_FROM?: string;
}

export interface Reponse { status: number; json: Record<string, unknown> | unknown[]; entetes?: Record<string, string> }

export const repondre = (r: Reponse): Response =>
  new Response(JSON.stringify(r.json), {
    status: r.status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...(r.entetes || {}) },
  });

export const erreur = (status: number, error: string, extra: Record<string, unknown> = {}): Reponse => ({ status, json: { ok: false, error, ...extra } });
export const indisponible = (): Reponse => erreur(503, "storage_unavailable");

// ───── nettoyage des entrées ─────
const SURROGATE_ISOLE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
export const textePropre = (s: string): string => s.replace(CONTROLE, "").replace(SURROGATE_ISOLE, "�");

export function clip(v: unknown, max: number): string {
  if (typeof v !== "string" && typeof v !== "number") return "";
  return Array.from(textePropre(String(v)).trim()).slice(0, max).join("");
}

export function nombre(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? Number(v.replace(/\s/g, "").replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : null;
}

export const RE_EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']+\.[a-z]{2,}$/i;

/** Téléphone marocain (0…, +212…, 00212…) ou international E.164 ; compacté, ou null. Même règle que /api/lead-funnel/capture. */
export function telephone(t: unknown): string | null {
  const c = clip(t, 30).replace(/[\s.\-()]/g, "");
  if (/^(\+212|00212|0)[567]\d{8}$/.test(c)) return c.startsWith("00212") ? `+${c.slice(2)}` : c;
  if (/^(\+|00)[1-9]\d{7,14}$/.test(c)) return c.startsWith("00") ? `+${c.slice(2)}` : c;
  return null;
}

export function urlHttps(v: unknown, max = 300): string | null {
  const s = clip(v, max);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? u.toString() : null;
  } catch { return null; }
}

export const slugifier = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "pro";

export const nouvelId = (prefixe: string): string =>
  `${prefixe}_${Date.now().toString(36)}${Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 8)}`;

export const maintenantIso = (): string => new Date().toISOString();

/** Erreur Postgres « table absente » : la fonction reste fermée (503), sans jamais créer la table. */
export const tableAbsente = (e: unknown): boolean => (e as { code?: string })?.code === "42P01";

// ───── limite de débit (par isolat : filet best-effort) ─────
const passages = new Map<string, number[]>();
export function accepter(cle: string, max: number, fenetreMs: number, maintenant = Date.now()): boolean {
  const recents = (passages.get(cle) || []).filter((t) => maintenant - t < fenetreMs);
  if (recents.length >= max) { passages.set(cle, recents); return false; }
  recents.push(maintenant);
  passages.set(cle, recents);
  if (passages.size > 5000) passages.clear();
  return true;
}
export const reinitialiserLimites = (): void => passages.clear();

export const ipDe = (h: Headers): string => h.get("cf-connecting-ip") || "inconnue";

/** Origin = hôte de la requête (anti-CSRF pour les requêtes modifiantes authentifiées par cookie). */
export const origineOk = (req: Request): boolean => req.headers.get("origin") === new URL(req.url).origin;

// ───── crypto ─────
const enc = new TextEncoder();
const b64url = (u: Uint8Array): string => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64url = (s: string): Uint8Array =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

async function hmac(secret: string, donnees: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret.trim()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(donnees)));
}

export async function sha256Hex(s: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));
  return Array.from(h, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function secretFournisseur(env: EnvCercles): string | null {
  const s = (env.FOURNISSEUR_SESSION_SECRET || "").trim() || (env.ADMIN_SESSION_SECRET || "").trim();
  return s.length >= 32 ? s : null;
}

export const COOKIE_FRN = "frn_session";
export const DUREE_FRN_S = 30 * 24 * 3600;

export async function creerSessionFournisseur(id: string, secret: string, maintenant = Date.now()): Promise<string> {
  const corps = `f1.${Math.floor(maintenant / 1000) + DUREE_FRN_S}.${b64url(enc.encode(id))}`;
  return `${corps}.${b64url(await hmac(secret, `frn|${corps}`))}`;
}

/** Identifiant du fournisseur porté par un cookie valide, sinon null. */
export async function lireSessionFournisseur(jeton: string, secret: string, maintenant = Date.now()): Promise<string | null> {
  const p = jeton.split(".");
  if (p.length !== 4 || p[0] !== "f1" || !/^\d+$/.test(p[1])) return null;
  let mac: Uint8Array;
  try { mac = deB64url(p[3]); } catch { return null; }
  if (!egaux(await hmac(secret, `frn|${p[0]}.${p[1]}.${p[2]}`), mac)) return null;
  const exp = Number(p[1]), s = Math.floor(maintenant / 1000);
  if (exp < s || exp > s + DUREE_FRN_S + 60) return null;
  try { return new TextDecoder().decode(deB64url(p[2])) || null; } catch { return null; }
}

export function cookieFournisseur(req: Request): string {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE_FRN}=([^;]+)`).exec(req.headers.get("cookie") || "");
  return m ? m[1] : "";
}

export const enteteCookieFournisseur = (valeur: string, maxAge: number): string =>
  `${COOKIE_FRN}=${valeur}; Path=/api/cercles; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;

/** Code d'accès à 6 chiffres (tirage sans biais). */
export function codeAcces(): string {
  const u = new Uint32Array(1);
  do crypto.getRandomValues(u); while (u[0] >= 4_294_000_000);
  return String(u[0] % 1_000_000).padStart(6, "0");
}
export const hacherCode = (secret: string, fournisseurId: string, code: string): Promise<string> =>
  sha256Hex(`code|${secret}|${fournisseurId}|${code}`);

// ───── e-mail (Resend, facultatif) ─────
export const echapperHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function envoyerEmail(env: EnvCercles, m: { to: string[]; subject: string; text: string; html: string }): Promise<boolean> {
  if (!env.RESEND_API_KEY || !m.to.length) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.LEAD_NOTIFY_FROM || "CITURBAREA <no-reply@citurbarea.com>", ...m }),
    });
    if (!r.ok) console.error(`[cercles] e-mail refusé (${r.status})`);
    return r.ok;
  } catch {
    console.error("[cercles] e-mail impossible");
    return false;
  }
}

export const destinatairesAdmin = (env: EnvCercles): string[] =>
  (env.LEAD_NOTIFY_TO || "").split(",").map((x) => x.trim()).filter(Boolean);

/** Lit un corps JSON borné (≤ maxOctets) ; null si illisible. */
export async function lireJson(req: Request, maxOctets = 64 * 1024): Promise<unknown> {
  try {
    const t = await req.text();
    if (t.length > maxOctets) return null;
    return JSON.parse(t);
  } catch { return null; }
}
