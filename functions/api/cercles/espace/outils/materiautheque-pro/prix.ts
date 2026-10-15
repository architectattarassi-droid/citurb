/** GET /api/cercles/espace/outils/materiautheque-pro/prix?region= — position de mes prix face au marché (outil réservé). */
import { repondre, type EnvCercles } from "../../../../../_lib/cercles";
import { avecDepot } from "../../../../../_lib/fournisseursDepot";
import { positionPrix } from "../../../../../_lib/outilMateriauthequePro";

export const onRequestGet = async (ctx: { request: Request; env: EnvCercles; data: Record<string, unknown> }): Promise<Response> =>
  repondre(await avecDepot(ctx.env, (d) => positionPrix(String(ctx.data.fournisseurId), new URL(ctx.request.url).searchParams, d), "outils/materiautheque-pro/prix"));
