/** PATCH /api/cc/services/:id {action: APPROUVER (ouvrageCode?, prestationCode?) | REJETER (motif) | ARCHIVER} — modération historisée. */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../_lib/cercles";
import { modererService } from "../../../_lib/catalogue";
import { avecDepot } from "../../../_lib/fournisseursDepot";

export async function onRequestPatch(ctx: { request: Request; env: EnvCercles; data: Record<string, unknown>; params: { id: string } }): Promise<Response> {
  const body = await lireJson(ctx.request, 8 * 1024);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => modererService(String(ctx.params.id), body, String(ctx.data.adminEmail || "admin"), d), "cc/services/:id"));
}
