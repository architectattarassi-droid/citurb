/**
 * POST /api/cercles/acces/verifier {email, code} — vérifie le code (5 essais,
 * usage unique) et pose le cookie frn_session (30 jours, Path=/api/cercles).
 */
import {
  creerSessionFournisseur, DUREE_FRN_S, enteteCookieFournisseur, erreur, lireJson, origineOk, repondre, secretFournisseur, type EnvCercles,
} from "../../../_lib/cercles";
import { verifierCode } from "../../../_lib/fournisseurs";
import { avecDepot } from "../../../_lib/fournisseursDepot";

export async function onRequestPost(ctx: { request: Request; env: EnvCercles }): Promise<Response> {
  if (!origineOk(ctx.request)) return repondre(erreur(403, "forbidden_origin"));
  const secret = secretFournisseur(ctx.env);
  if (!secret) return repondre(erreur(503, "access_not_configured"));
  const body = await lireJson(ctx.request, 2048);
  return repondre(await avecDepot(ctx.env, async (d) => {
    const r = await verifierCode(body, ctx.request.headers, d, secret);
    if (!("id" in r)) return r;
    const jeton = await creerSessionFournisseur(r.id, secret);
    return { status: 200, json: { ok: true }, entetes: { "set-cookie": enteteCookieFournisseur(jeton, DUREE_FRN_S) } };
  }, "cercles/acces/verifier"));
}
