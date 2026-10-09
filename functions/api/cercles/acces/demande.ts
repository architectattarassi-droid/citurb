/**
 * POST /api/cercles/acces/demande {email} — demande un code d'accès à usage unique.
 * Réponse identique que l'adresse existe ou non. Avec RESEND_API_KEY : code
 * envoyé par e-mail (15 min) ; sans : la demande apparaît dans /cc/fournisseurs
 * et l'administration génère le code et le transmet.
 */
import { erreur, lireJson, origineOk, repondre, secretFournisseur, type EnvCercles } from "../../../_lib/cercles";
import { demanderCode } from "../../../_lib/fournisseurs";
import { avecDepot } from "../../../_lib/fournisseursDepot";

export async function onRequestPost(ctx: { request: Request; env: EnvCercles }): Promise<Response> {
  if (!origineOk(ctx.request)) return repondre(erreur(403, "forbidden_origin"));
  const secret = secretFournisseur(ctx.env);
  if (!secret) return repondre(erreur(503, "access_not_configured"));
  const body = await lireJson(ctx.request, 2048);
  const origine = new URL(ctx.request.url).origin;
  return repondre(await avecDepot(ctx.env, (d) => demanderCode(body, ctx.request.headers, d, ctx.env, secret, origine), "cercles/acces/demande"));
}
