/** POST /api/cercles/acces/deconnexion — efface le cookie frn_session. */
import { enteteCookieFournisseur, erreur, origineOk, repondre } from "../../../_lib/cercles";

export async function onRequestPost(ctx: { request: Request }): Promise<Response> {
  if (!origineOk(ctx.request)) return repondre(erreur(403, "forbidden_origin"));
  return repondre({ status: 200, json: { ok: true }, entetes: { "set-cookie": enteteCookieFournisseur("", 0) } });
}
