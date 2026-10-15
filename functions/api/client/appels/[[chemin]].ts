/**
 * Cloudflare Pages Function — /api/client/appels/* (client connecté : cookie cli_session,
 * vérifié par ../_middleware.ts, Origin contrôlée pour les POST). Contrat :
 * docs/architecture/contrat-appels-video.md.
 *   GET  …/appels                 mes demandes
 *   POST …/appels                 demander un appel au cabinet au sujet d'un de MES dossiers (contexte « dossier »)
 *   GET  …/appels/<id>, POST …/appels/<id>/repondre|visio|bloquer
 */
import { neon } from "@neondatabase/serverless";
import type { Sql } from "../../../_lib/appelsDepot";
import type { SessionClient } from "../../../_lib/clientSession";
import { contexteNeon } from "../../../_lib/contexteNeon";
import { indisponible, repondre, routeur, segments, type EnvAppels } from "../../../_lib/appelsService";

export async function onRequest(ctx: { request: Request; env: EnvAppels; params: { chemin?: string | string[] }; data?: { client?: SessionClient } }): Promise<Response> {
  const s = ctx.data?.client;
  if (!s) return repondre({ status: 401, json: { ok: false, error: "unauthenticated" } });
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  try {
    const c = contexteNeon(ctx.env, neon(ctx.env.DATABASE_URL) as unknown as Sql);
    const chemin = segments(ctx.params.chemin);
    if (chemin[0] === "rappels") return repondre({ status: 404, json: { ok: false, error: "route_inconnue" } });
    return repondre(await routeur(c, ctx.request, { genre: "client", clientId: s.clientId, dossierIds: s.dossierIds }, chemin));
  } catch (e) {
    console.error(`[client/appels] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return repondre(indisponible());
  }
}
