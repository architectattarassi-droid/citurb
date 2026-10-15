/** POST /api/cercles/espace/acces/demande {outil, message?} — le pro demande un outil réservé ; l'admin tranche dans /cc/fournisseurs. */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../../_lib/cercles";
import { demanderAcces } from "../../../../_lib/accesPro";
import { avecDepot } from "../../../../_lib/fournisseursDepot";

export async function onRequestPost(ctx: { request: Request; env: EnvCercles; data: Record<string, unknown>; waitUntil?: (p: Promise<unknown>) => void }): Promise<Response> {
  const body = await lireJson(ctx.request, 2048);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => demanderAcces(String(ctx.data.fournisseurId), body, d, ctx.env, ctx.waitUntil), "cercles/espace/acces/demande"));
}
