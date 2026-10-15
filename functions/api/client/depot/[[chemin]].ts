/**
 * Cloudflare Pages Function — /api/client/depot/* (client : cookie cli_session vérifié par
 * ../_middleware.ts, qui pose ctx.data.client = { clientId, dossierIds }) — contexte « dossier »
 * (SES dossiers) et les fils / appels auxquels il participe.
 */
import { neon } from "@neondatabase/serverless";
import type { Sql } from "../../../_lib/depotStockage";
import { contexteDepotNeon, type EnvDepotComplet } from "../../../_lib/depotNeon";
import { indisponible, repondre, routeurDepot, segments } from "../../../_lib/depotService";

export async function onRequest(ctx: { request: Request; env: EnvDepotComplet; params: { chemin?: string | string[] }; data?: Record<string, unknown>; waitUntil?: (p: Promise<unknown>) => void }): Promise<Response> {
  const s = ctx.data?.client as { clientId: string; dossierIds: string[] } | undefined;
  if (!s) return repondre({ status: 401, json: { ok: false, error: "unauthenticated" } });
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    const u = (await sql`SELECT "username" FROM "User" WHERE "id" = ${s.clientId} LIMIT 1`)[0];
    const a = { genre: "client" as const, cle: `usr:${s.clientId}`, nom: String(u?.username || "Client"), dossierIds: s.dossierIds };
    return repondre(await routeurDepot(contexteDepotNeon(ctx.env, sql, ctx.waitUntil?.bind(ctx)), ctx.request, a, segments(ctx.params.chemin)));
  } catch (e) {
    console.error(`[client/depot] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return repondre(indisponible());
  }
}
