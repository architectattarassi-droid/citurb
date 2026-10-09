/**
 * GET /api/cc/fournisseurs?statut=PENDING — inscrits Cercles (vue admin, coordonnées comprises).
 * Protégée par functions/api/cc/_middleware.ts.
 */
import { repondre, type EnvCercles } from "../../../_lib/cercles";
import { listerPourAdmin } from "../../../_lib/fournisseurs";
import { avecDepot } from "../../../_lib/fournisseursDepot";

export async function onRequestGet(ctx: { request: Request; env: EnvCercles }): Promise<Response> {
  const statut = new URL(ctx.request.url).searchParams.get("statut") || null;
  return repondre(await avecDepot(ctx.env, (d) => listerPourAdmin(statut, d), "cc/fournisseurs"));
}
