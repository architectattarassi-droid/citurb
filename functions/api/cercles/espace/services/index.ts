/** POST /api/cercles/espace/services — crée une fiche service (pose, étude, essai…) ; en vérification jusqu'à la modération. */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../../_lib/cercles";
import { enregistrerService } from "../../../../_lib/catalogue";
import { avecDepot } from "../../../../_lib/fournisseursDepot";

export async function onRequestPost(ctx: { request: Request; env: EnvCercles; data: Record<string, unknown> }): Promise<Response> {
  const body = await lireJson(ctx.request, 24 * 1024);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => enregistrerService(String(ctx.data.fournisseurId), null, body, d), "cercles/espace/services"));
}
