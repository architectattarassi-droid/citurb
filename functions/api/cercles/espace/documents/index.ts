/** POST /api/cercles/espace/documents {type, url?, note?, expireLe?} — dépôt d'un document (vérifié ensuite par l'admin). */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../../_lib/cercles";
import { ajouterDocument } from "../../../../_lib/fournisseurs";
import { avecDepot } from "../../../../_lib/fournisseursDepot";

export async function onRequestPost(ctx: { request: Request; env: EnvCercles; data: Record<string, unknown> }): Promise<Response> {
  const body = await lireJson(ctx.request, 4 * 1024);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => ajouterDocument(String(ctx.data.fournisseurId), body, d), "cercles/espace/documents"));
}
