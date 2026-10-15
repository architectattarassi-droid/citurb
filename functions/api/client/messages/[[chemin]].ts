/**
 * Cloudflare Pages Function — /api/client/messages/* (client connecté : cookie cli_session,
 * vérifié par ../_middleware.ts, Origin contrôlée pour les POST). Contrat :
 * docs/architecture/contrat-messagerie.md.
 *   GET  …/messages                 ma boîte
 *   POST …/messages                 écrire au cabinet au sujet d'un de MES dossiers (contexte « dossier »)
 *   GET  …/messages/<id>            un fil — marque comme lu
 *   POST …/messages/<id>/messages|appel|signaler|bloquer
 */
import { neon } from "@neondatabase/serverless";
import type { Sql } from "../../../_lib/appelsDepot";
import type { EnvAppels } from "../../../_lib/appelsService";
import type { SessionClient } from "../../../_lib/clientSession";
import { contexteNeon } from "../../../_lib/contexteNeon";
import { indisponible, repondre, routeurMessages, segments } from "../../../_lib/messagerieService";

export async function onRequest(ctx: { request: Request; env: EnvAppels; params: { chemin?: string | string[] }; data?: { client?: SessionClient } }): Promise<Response> {
  const s = ctx.data?.client;
  if (!s) return repondre({ status: 401, json: { ok: false, error: "unauthenticated" } });
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  try {
    const c = contexteNeon(ctx.env, neon(ctx.env.DATABASE_URL) as unknown as Sql);
    return repondre(await routeurMessages(c, ctx.request, { genre: "client", clientId: s.clientId, dossierIds: s.dossierIds }, segments(ctx.params.chemin)));
  } catch (e) {
    console.error(`[client/messages] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return repondre(indisponible());
  }
}
