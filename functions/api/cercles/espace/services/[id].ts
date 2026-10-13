/** PUT /api/cercles/espace/services/:id — met à jour une fiche service (pose, étude, essai…). DELETE — la retire. */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../../_lib/cercles";
import { enregistrerService, supprimerService } from "../../../../_lib/catalogue";
import { avecDepot } from "../../../../_lib/fournisseursDepot";

type Ctx = { request: Request; env: EnvCercles; data: Record<string, unknown>; params: { id: string } };

export async function onRequestPut(ctx: Ctx): Promise<Response> {
  const body = await lireJson(ctx.request, 24 * 1024);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => enregistrerService(String(ctx.data.fournisseurId), String(ctx.params.id), body, d), "cercles/espace/services/:id"));
}

export const onRequestDelete = async (ctx: Ctx): Promise<Response> =>
  repondre(await avecDepot(ctx.env, (d) => supprimerService(String(ctx.data.fournisseurId), String(ctx.params.id), d), "cercles/espace/services/:id"));
