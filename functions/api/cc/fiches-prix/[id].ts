/** PATCH /api/cc/fiches-prix/:id {statut: APPROVED|REJECTED} — modération d'une fiche de prix (historisée). */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../_lib/cercles";
import { modererFiche } from "../../../_lib/fournisseurs";
import { avecDepot } from "../../../_lib/fournisseursDepot";

export async function onRequestPatch(ctx: { request: Request; env: EnvCercles; data: Record<string, unknown>; params: { id: string } }): Promise<Response> {
  const body = await lireJson(ctx.request, 2048);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => modererFiche(String(ctx.params.id), body, String(ctx.data.adminEmail || "admin"), d), "cc/fiches-prix/:id"));
}
