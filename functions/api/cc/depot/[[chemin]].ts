/**
 * Cloudflare Pages Function — /api/cc/depot/* (cabinet, protégé par ../_middleware.ts)
 *   tous les contextes ; GET /api/cc/depot/a-moderer ; POST /api/cc/depot/<id>/moderer { decision, motif }.
 * Un document déposé par le cabinet est visible d'emblée.
 */
import { neon } from "@neondatabase/serverless";
import type { Sql } from "../../../_lib/depotStockage";
import { ADMIN_DEPOT, contexteDepotNeon, type EnvDepotComplet } from "../../../_lib/depotNeon";
import { indisponible, repondre, routeurDepot, segments } from "../../../_lib/depotService";

export async function onRequest(ctx: { request: Request; env: EnvDepotComplet; params: { chemin?: string | string[] }; waitUntil?: (p: Promise<unknown>) => void }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    return repondre(await routeurDepot(contexteDepotNeon(ctx.env, sql, ctx.waitUntil?.bind(ctx)), ctx.request, ADMIN_DEPOT, segments(ctx.params.chemin)));
  } catch (e) {
    console.error(`[cc/depot] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return repondre(indisponible());
  }
}
