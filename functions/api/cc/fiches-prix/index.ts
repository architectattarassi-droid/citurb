/** GET /api/cc/fiches-prix — fiches en attente ou signalées (prix hors ±50 % de la référence). */
import { repondre, type EnvCercles } from "../../../_lib/cercles";
import { fichesAModerer } from "../../../_lib/fournisseurs";
import { avecDepot } from "../../../_lib/fournisseursDepot";

export const onRequestGet = async (ctx: { env: EnvCercles }): Promise<Response> =>
  repondre(await avecDepot(ctx.env, (d) => fichesAModerer(d), "cc/fiches-prix"));
