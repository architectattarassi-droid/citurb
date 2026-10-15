/** PATCH /api/cc/fournisseurs/:id/acces {outil, actif, expireLe?, motif?} — accorder / retirer un outil pro (daté, tracé dans events). */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../../_lib/cercles";
import { modifierAcces } from "../../../../_lib/accesPro";
import { avecDepot } from "../../../../_lib/fournisseursDepot";

export async function onRequestPatch(ctx: { request: Request; env: EnvCercles; data: Record<string, unknown>; params: { id: string } }): Promise<Response> {
  const body = await lireJson(ctx.request, 2048);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => modifierAcces(String(ctx.params.id), body, String(ctx.data.adminEmail || "admin"), d), "cc/fournisseurs/:id/acces"));
}
