/** PATCH /api/cc/fournisseurs/:id {statut, motif?, commissionPct?} — modération d'un inscrit. */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../_lib/cercles";
import { modererFournisseur } from "../../../_lib/fournisseurs";
import { avecDepot } from "../../../_lib/fournisseursDepot";

export async function onRequestPatch(ctx: { request: Request; env: EnvCercles; data: Record<string, unknown>; params: { id: string } }): Promise<Response> {
  const body = await lireJson(ctx.request, 8 * 1024);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => modererFournisseur(String(ctx.params.id), body, String(ctx.data.adminEmail || "admin"), d), "cc/fournisseurs/:id"));
}
