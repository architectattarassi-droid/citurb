/** POST /api/cercles/espace/fiches — crée ou met à jour la fiche de prix d'un matériau (une par matériau). */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../../_lib/cercles";
import { enregistrerFiche } from "../../../../_lib/fournisseurs";
import { avecDepot } from "../../../../_lib/fournisseursDepot";

export async function onRequestPost(ctx: { request: Request; env: EnvCercles; data: Record<string, unknown> }): Promise<Response> {
  const body = await lireJson(ctx.request, 16 * 1024);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => enregistrerFiche(String(ctx.data.fournisseurId), body, d), "cercles/espace/fiches"));
}
