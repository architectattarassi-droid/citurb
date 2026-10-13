/** PATCH /api/cc/produits/:id {action: APPROUVER (materiauCode | nouveauCode{…}, facteur?) | REJETER (motif) | ARCHIVER} — modération historisée. */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../_lib/cercles";
import { modererProduit } from "../../../_lib/catalogue";
import { avecDepot } from "../../../_lib/fournisseursDepot";

export async function onRequestPatch(ctx: { request: Request; env: EnvCercles; data: Record<string, unknown>; params: { id: string } }): Promise<Response> {
  const body = await lireJson(ctx.request, 8 * 1024);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => modererProduit(String(ctx.params.id), body, String(ctx.data.adminEmail || "admin"), d), "cc/produits/:id"));
}
