/**
 * POST /api/cercles/inscription — inscription d'un pro / fournisseur (sans mot de passe).
 * Pot de miel `website`, limite de débit par IP, idempotencyKey, statut PENDING
 * jusqu'à validation dans /cc/fournisseurs. Logique : functions/_lib/fournisseurs.ts.
 */
import { erreur, lireJson, repondre, type EnvCercles } from "../../_lib/cercles";
import { inscrire } from "../../_lib/fournisseurs";
import { avecDepot } from "../../_lib/fournisseursDepot";

export async function onRequestPost(ctx: { request: Request; env: EnvCercles; waitUntil?: (p: Promise<unknown>) => void }): Promise<Response> {
  const body = await lireJson(ctx.request, 16 * 1024);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => inscrire(body, ctx.request.headers, d, ctx.env, ctx.waitUntil), "cercles/inscription"));
}
