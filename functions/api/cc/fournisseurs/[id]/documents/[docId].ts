/** PATCH /api/cc/fournisseurs/:id/documents/:docId {statut: VERIFIE|REFUSE, motif?} — vérification d'un document. */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../../../_lib/cercles";
import { verifierDocument } from "../../../../../_lib/fournisseurs";
import { avecDepot } from "../../../../../_lib/fournisseursDepot";

export async function onRequestPatch(ctx: { request: Request; env: EnvCercles; data: Record<string, unknown>; params: { id: string; docId: string } }): Promise<Response> {
  const body = await lireJson(ctx.request, 2048);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => verifierDocument(String(ctx.params.id), String(ctx.params.docId), body, String(ctx.data.adminEmail || "admin"), d), "cc/fournisseurs/:id/documents/:docId"));
}
