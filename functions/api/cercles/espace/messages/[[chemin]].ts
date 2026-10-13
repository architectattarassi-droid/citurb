/**
 * Cloudflare Pages Function — /api/cercles/espace/messages/* (pro connecté : cookie frn_session,
 * vérifié par ../_middleware.ts, Origin contrôlée pour les POST)
 *   GET  …/messages                 ma boîte (non lus)
 *   POST …/messages                 écrire au cabinet ou à un autre pro (par son slug public)
 *   GET  …/messages/<id>            un fil — marque comme lu
 *   POST …/messages/<id>/messages|appel|signaler|bloquer
 */
import { neon } from "@neondatabase/serverless";
import type { Sql } from "../../../../_lib/appelsDepot";
import type { EnvAppels } from "../../../../_lib/appelsService";
import { contexteNeon } from "../../../../_lib/contexteNeon";
import { indisponible, repondre, routeurMessages, segments } from "../../../../_lib/messagerieService";

export async function onRequest(ctx: { request: Request; env: EnvAppels; params: { chemin?: string | string[] }; data?: Record<string, unknown> }): Promise<Response> {
  const fournisseurId = String(ctx.data?.fournisseurId || "");
  if (!fournisseurId) return repondre({ status: 401, json: { ok: false, error: "unauthenticated" } });
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  try {
    const c = contexteNeon(ctx.env, neon(ctx.env.DATABASE_URL) as unknown as Sql);
    return repondre(await routeurMessages(c, ctx.request, { genre: "pro", fournisseurId }, segments(ctx.params.chemin)));
  } catch (e) {
    console.error(`[cercles/messages] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return repondre(indisponible());
  }
}
