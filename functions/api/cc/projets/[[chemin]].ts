/**
 * Cloudflare Pages Function — /api/cc/projets/* (back-office, protégé par ../_middleware.ts)
 *   GET  /api/cc/projets                    liste des projets
 *   POST /api/cc/projets                    création depuis un dossier (jalons générés dans le back-office depuis le référentiel)
 *   …    /api/cc/projets/<id>/…             mêmes routes que l'espace membre, avec tous les droits,
 *                                           + membres (inviter, révoquer, régénérer le lien), journal, masquage de messages.
 * Logique : functions/_lib/projetsApi.ts.
 */
import { neon } from "@neondatabase/serverless";
import { indisponible, routeurAdmin, segments, type EnvProjets } from "../../../_lib/projetsApi";
import { depotNeon, type Sql } from "../../../_lib/projetsNeon";

export async function onRequest(ctx: { request: Request; env: EnvProjets; params: { chemin?: string | string[] }; data?: Record<string, unknown> }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return indisponible();
  try {
    const depot = depotNeon(neon(ctx.env.DATABASE_URL) as unknown as Sql);
    return await routeurAdmin({ req: ctx.request, env: ctx.env, depot, maintenant: () => new Date().toISOString() }, segments(ctx.params.chemin), String(ctx.data?.adminEmail || ""));
  } catch (e) {
    console.error(`[cc/projets] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return indisponible();
  }
}
