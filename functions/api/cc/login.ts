/**
 * POST /api/cc/login {password} — ouvre une session back-office par mot de passe.
 *
 * Exclu de la garde de session (_middleware.ts) mais protégé ici :
 *   - Origin doit être l'hôte de la requête (anti-CSRF, en plus de SameSite=Strict) ;
 *   - 5 échecs / 15 min par IP → 429. Compteur EN MÉMOIRE PAR ISOLAT : c'est un
 *     filet, pas une barrière (Cloudflare fait tourner plusieurs isolats et les
 *     recycle). Un compteur durable demanderait Workers KV ou Durable Objects ;
 *   - délai fixe sur échec, réponse identique quelle que soit la cause.
 * Succès → cookie cc_session (HttpOnly, Secure, SameSite=Strict, Path=/api/cc, 12 h).
 */

import {
  creerJetonSession, DUREE_S, enteteCookie, identite, json, modeMotDePasse, origineAutorisee,
  verifierMotDePasse, type PasswordEnv,
} from "../../_lib/adminSession";

export const ESSAIS_MAX = 5;
export const FENETRE_MS = 15 * 60_000;
const DELAI_ECHEC_MS = 800;

type Compteurs = Map<string, { n: number; debut: number }>;
const compteursIsolat: Compteurs = new Map();

export interface OptionsLogin {
  compteurs?: Compteurs;
  attendre?: (ms: number) => Promise<void>;
  maintenant?: number;
}

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function traiterLogin(req: Request, env: PasswordEnv, o: OptionsLogin = {}): Promise<Response> {
  const compteurs = o.compteurs || compteursIsolat;
  const attendre = o.attendre || dormir;
  const now = o.maintenant ?? Date.now();

  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" }, { allow: "POST" });
  if (!origineAutorisee(req)) return json(403, { ok: false, error: "forbidden_origin" });
  if (!modeMotDePasse(env)) return json(503, { ok: false, error: "access_not_configured" });

  const ip = req.headers.get("cf-connecting-ip") || "inconnue";
  if (compteurs.size > 5000) for (const [k, v] of compteurs) if (now - v.debut > FENETRE_MS) compteurs.delete(k);
  let c = compteurs.get(ip);
  if (c && now - c.debut > FENETRE_MS) { compteurs.delete(ip); c = undefined; }
  if (c && c.n >= ESSAIS_MAX) {
    const reste = Math.ceil((c.debut + FENETRE_MS - now) / 1000);
    return json(429, { ok: false, error: "too_many_attempts" }, { "retry-after": String(Math.max(reste, 1)) });
  }

  let motDePasse = "";
  try {
    const texte = await req.text();
    if (texte.length <= 4096) {
      const b = JSON.parse(texte) as { password?: unknown };
      if (typeof b?.password === "string" && b.password.length <= 1024) motDePasse = b.password;
    }
  } catch { /* corps illisible : traité comme un échec */ }

  if (motDePasse && await verifierMotDePasse(motDePasse, env.ADMIN_PASSWORD_HASH as string)) {
    compteurs.delete(ip);
    const jeton = await creerJetonSession(identite(env), env.ADMIN_SESSION_SECRET as string, now);
    return json(200, { ok: true }, { "set-cookie": enteteCookie(jeton, DUREE_S) });
  }

  if (c) c.n++; else compteurs.set(ip, { n: 1, debut: now });
  await attendre(DELAI_ECHEC_MS);
  return json(401, { ok: false, error: "invalid_credentials" });
}

export const onRequest = (ctx: { request: Request; env: PasswordEnv }): Promise<Response> => traiterLogin(ctx.request, ctx.env);
