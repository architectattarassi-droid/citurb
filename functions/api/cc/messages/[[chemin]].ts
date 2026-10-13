/**
 * Cloudflare Pages Function — /api/cc/messages/* (back-office, protégé par ../_middleware.ts)
 *   GET  /api/cc/messages[?statut=SIGNALEE]   tous les fils (modération) ; nonLus = côté cabinet
 *   POST /api/cc/messages                     le cabinet écrit à un client de dossier, un pro, le client d'un RDV
 *   GET  /api/cc/messages/<id>                un fil (coordonnées visibles du seul back-office)
 *   POST /api/cc/messages/<id>/messages|appel au nom du cabinet, s'il participe
 *   POST /api/cc/messages/<id>/moderer        { messageId, modere } | { statut: OUVERTE|FERMEE }
 */
import { neon } from "@neondatabase/serverless";
import type { Sql } from "../../../_lib/appelsDepot";
import type { EnvAppels } from "../../../_lib/appelsService";
import { contexteNeon } from "../../../_lib/contexteNeon";
import { indisponible, repondre, routeurMessages, segments } from "../../../_lib/messagerieService";

export async function onRequest(ctx: { request: Request; env: EnvAppels; params: { chemin?: string | string[] }; data?: Record<string, unknown> }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  try {
    const c = contexteNeon(ctx.env, neon(ctx.env.DATABASE_URL) as unknown as Sql);
    return repondre(await routeurMessages(c, ctx.request, { genre: "admin", email: String(ctx.data?.adminEmail || "") }, segments(ctx.params.chemin)));
  } catch (e) {
    console.error(`[cc/messages] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return repondre(indisponible());
  }
}
