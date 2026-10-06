/**
 * Cloudflare Pages Function — garde de /api/cc/*
 *
 * Le back-office n'a plus d'API NestJS hébergée : ses routes /api/cc/* sont
 * servies par des Pages Functions qui lisent Neon. Elles ne s'ouvrent qu'aux
 * requêtes passées par Cloudflare Access (application posée sur
 * admin.citurbarea.com, connexion par code e-mail).
 *
 * Access injecte le jeton signé dans l'en-tête Cf-Access-Jwt-Assertion (et le
 * cookie CF_Authorization). La garde le VÉRIFIE elle-même — signature RS256
 * contre les clés publiques de l'équipe, audience, émetteur, expiration,
 * adresse autorisée — car les fonctions répondent aussi sur citurbarea.com et
 * *.pages.dev, où Access ne filtre rien.
 *
 * Variables (Workers & Pages → citurbarea → Settings → Variables and secrets) :
 *   ACCESS_TEAM_DOMAIN  ex. citurbarea.cloudflareaccess.com
 *   ACCESS_AUD          « Application Audience (AUD) Tag » de l'application Access
 *   ADMIN_EMAILS        adresses autorisées, séparées par des virgules
 * Une seule absente → 503 access_not_configured : fermé par défaut.
 */

export interface AccessEnv {
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  ADMIN_EMAILS?: string;
}

interface Jwk { kid: string; kty: string; n: string; e: string; alg?: string }
export type ChargerCles = (equipe: string) => Promise<Jwk[]>;

export type Verdict = { ok: true; email: string } | { ok: false; status: number; error: string };

const b64url = (s: string): Uint8Array => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};
const jsonB64 = (s: string): Record<string, unknown> => JSON.parse(new TextDecoder().decode(b64url(s)));

/** Clés publiques de l'équipe, gardées une heure par isolat. */
let cache: { equipe: string; cles: Jwk[]; at: number } | null = null;
const chargerClesHttp: ChargerCles = async (equipe) => {
  if (cache && cache.equipe === equipe && Date.now() - cache.at < 3600_000) return cache.cles;
  const r = await fetch(`https://${equipe}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error(`certs ${r.status}`);
  const cles = ((await r.json()) as { keys?: Jwk[] }).keys || [];
  cache = { equipe, cles, at: Date.now() };
  return cles;
};

function jetonDeLaRequete(req: Request): string {
  const h = req.headers.get("cf-access-jwt-assertion");
  if (h) return h;
  const m = /(?:^|;\s*)CF_Authorization=([^;]+)/.exec(req.headers.get("cookie") || "");
  return m ? m[1] : "";
}

/** Vérification complète du jeton Access (testable avec un faux chargeur de clés). */
export async function verifierJeton(jeton: string, env: AccessEnv, charger: ChargerCles = chargerClesHttp, maintenant = Date.now()): Promise<Verdict> {
  const equipe = (env.ACCESS_TEAM_DOMAIN || "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const aud = (env.ACCESS_AUD || "").trim();
  const autorises = (env.ADMIN_EMAILS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!equipe || !aud || !autorises.length) return { ok: false, status: 503, error: "access_not_configured" };
  if (!jeton) return { ok: false, status: 401, error: "unauthenticated" };

  const parts = jeton.split(".");
  if (parts.length !== 3) return { ok: false, status: 401, error: "token_invalid" };
  let entete: Record<string, unknown>, corps: Record<string, unknown>;
  try { entete = jsonB64(parts[0]); corps = jsonB64(parts[1]); } catch { return { ok: false, status: 401, error: "token_invalid" }; }
  if (entete.alg !== "RS256") return { ok: false, status: 401, error: "token_invalid" };

  let cles: Jwk[];
  try { cles = await charger(equipe); } catch { return { ok: false, status: 503, error: "access_certs_unavailable" }; }
  const jwk = cles.find((k) => k.kid === entete.kid);
  if (!jwk) return { ok: false, status: 401, error: "token_invalid" };

  const cle = await crypto.subtle.importKey("jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const signe = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  if (!(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cle, b64url(parts[2]) as BufferSource, signe))) {
    return { ok: false, status: 401, error: "token_invalid" };
  }

  const auds = Array.isArray(corps.aud) ? corps.aud : [corps.aud];
  if (!auds.includes(aud)) return { ok: false, status: 401, error: "token_invalid" };
  if (corps.iss !== `https://${equipe}`) return { ok: false, status: 401, error: "token_invalid" };
  const s = Math.floor(maintenant / 1000);
  if (typeof corps.exp !== "number" || corps.exp < s) return { ok: false, status: 401, error: "token_expired" };
  if (typeof corps.nbf === "number" && corps.nbf > s + 60) return { ok: false, status: 401, error: "token_invalid" };

  const email = String(corps.email || "").toLowerCase();
  if (!email || !autorises.includes(email)) return { ok: false, status: 403, error: "forbidden" };
  return { ok: true, email };
}

export async function onRequest(ctx: { request: Request; env: AccessEnv; data: Record<string, unknown>; next: () => Promise<Response> }): Promise<Response> {
  const v = await verifierJeton(jetonDeLaRequete(ctx.request), ctx.env);
  if (!v.ok) {
    return new Response(JSON.stringify({ ok: false, error: v.error }), {
      status: v.status,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
  ctx.data.adminEmail = v.email;
  const res = await ctx.next();
  const out = new Response(res.body, res);
  out.headers.set("cache-control", "no-store");
  out.headers.set("x-robots-tag", "noindex");
  return out;
}
