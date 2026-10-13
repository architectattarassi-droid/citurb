/** GET /api/cc/produits?statut=PENDING — fiches produit à modérer (vue admin). Protégée par functions/api/cc/_middleware.ts. */
import { repondre, type EnvCercles } from "../../../_lib/cercles";
import { produitsAModerer } from "../../../_lib/catalogue";
import { avecDepot } from "../../../_lib/fournisseursDepot";

export async function onRequestGet(ctx: { request: Request; env: EnvCercles }): Promise<Response> {
  const statut = new URL(ctx.request.url).searchParams.get("statut") || null;
  return repondre(await avecDepot(ctx.env, (d) => produitsAModerer(statut, d), "cc/produits"));
}
