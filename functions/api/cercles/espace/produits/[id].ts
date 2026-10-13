/** PUT /api/cercles/espace/produits/:id — met à jour une fiche produit (matériau, équipement). DELETE — la retire. */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../../_lib/cercles";
import { enregistrerProduit, supprimerProduit } from "../../../../_lib/catalogue";
import { avecDepot } from "../../../../_lib/fournisseursDepot";

type Ctx = { request: Request; env: EnvCercles; data: Record<string, unknown>; params: { id: string } };

export async function onRequestPut(ctx: Ctx): Promise<Response> {
  const body = await lireJson(ctx.request, 24 * 1024);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => enregistrerProduit(String(ctx.data.fournisseurId), String(ctx.params.id), body, d), "cercles/espace/produits/:id"));
}

export const onRequestDelete = async (ctx: Ctx): Promise<Response> =>
  repondre(await avecDepot(ctx.env, (d) => supprimerProduit(String(ctx.data.fournisseurId), String(ctx.params.id), d), "cercles/espace/produits/:id"));
