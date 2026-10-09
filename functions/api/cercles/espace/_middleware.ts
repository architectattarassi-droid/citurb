/**
 * Garde de /api/cercles/espace/* : cookie frn_session signé (functions/_lib/cercles.ts).
 * Requête modifiante → Origin doit être l'hôte (anti-CSRF, en plus de SameSite=Strict).
 * Fermé par défaut : sans secret configuré → 503.
 */
import { cookieFournisseur, erreur, lireSessionFournisseur, origineOk, repondre, secretFournisseur, type EnvCercles } from "../../../_lib/cercles";

const LECTURE = new Set(["GET", "HEAD", "OPTIONS"]);

export async function verifierEspace(req: Request, env: EnvCercles, maintenant = Date.now()): Promise<{ ok: true; id: string } | { ok: false; status: number; error: string }> {
  const secret = secretFournisseur(env);
  if (!secret) return { ok: false, status: 503, error: "access_not_configured" };
  const brut = cookieFournisseur(req);
  const id = brut ? await lireSessionFournisseur(brut, secret, maintenant) : null;
  if (!id) return { ok: false, status: 401, error: "unauthenticated" };
  if (!LECTURE.has(req.method) && !origineOk(req)) return { ok: false, status: 403, error: "forbidden_origin" };
  return { ok: true, id };
}

export async function onRequest(ctx: { request: Request; env: EnvCercles; data: Record<string, unknown>; next: () => Promise<Response> }): Promise<Response> {
  const v = await verifierEspace(ctx.request, ctx.env);
  if (!v.ok) return repondre(erreur(v.status, v.error));
  ctx.data.fournisseurId = v.id;
  const res = await ctx.next();
  const out = new Response(res.body, res);
  out.headers.set("cache-control", "no-store");
  out.headers.set("x-robots-tag", "noindex");
  return out;
}
