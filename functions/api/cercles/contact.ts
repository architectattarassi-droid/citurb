/**
 * POST /api/cercles/contact {slug, nom, telephone, email?, ville?, message, objet?, lang?} — mise en relation avec un pro
 * via la plateforme (lead P6_CONTACT_PRO dans /cc/leads). Coordonnées du pro jamais renvoyées. Pot de miel `website`.
 */
import { erreur, lireJson, repondre, type EnvCercles } from "../../_lib/cercles";
import { contacter } from "../../_lib/catalogue";
import { avecDepot } from "../../_lib/fournisseursDepot";

export async function onRequestPost(ctx: { request: Request; env: EnvCercles; waitUntil?: (p: Promise<unknown>) => void }): Promise<Response> {
  const body = await lireJson(ctx.request, 8 * 1024);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => contacter(body, ctx.request.headers, d, ctx.env, ctx.waitUntil), "cercles/contact"));
}
