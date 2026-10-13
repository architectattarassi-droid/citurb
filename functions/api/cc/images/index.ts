/** GET /api/cc/images?statut=PENDING — images à modérer (aperçu par /api/cc/images/:id). Protégée par functions/api/cc/_middleware.ts. */
import { repondre, type EnvCercles } from "../../../_lib/cercles";
import { imagesAModerer } from "../../../_lib/imagesCatalogue";
import { avecDepot } from "../../../_lib/fournisseursDepot";

export const onRequestGet = async (ctx: { request: Request; env: EnvCercles }): Promise<Response> =>
  repondre(await avecDepot(ctx.env, (d) => imagesAModerer(new URL(ctx.request.url).searchParams.get("statut") || null, d), "cc/images"));
