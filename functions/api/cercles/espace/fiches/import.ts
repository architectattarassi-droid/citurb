/** POST /api/cercles/espace/fiches/import {lignes:[…]} — import en masse (CSV / copier-coller Excel analysé dans le navigateur), ≤ 300 lignes. */
import { erreur, lireJson, repondre, type EnvCercles } from "../../../../_lib/cercles";
import { importerFiches } from "../../../../_lib/fournisseurs";
import { avecDepot } from "../../../../_lib/fournisseursDepot";

export async function onRequestPost(ctx: { request: Request; env: EnvCercles; data: Record<string, unknown> }): Promise<Response> {
  const body = await lireJson(ctx.request, 512 * 1024);
  if (body === null) return repondre(erreur(400, "payload_invalid"));
  return repondre(await avecDepot(ctx.env, (d) => importerFiches(String(ctx.data.fournisseurId), body, d), "cercles/espace/fiches/import"));
}
