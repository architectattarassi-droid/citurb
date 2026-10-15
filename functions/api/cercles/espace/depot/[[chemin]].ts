/**
 * Cloudflare Pages Function — /api/cercles/espace/depot/* (pro : cookie frn_session vérifié par
 * ../_middleware.ts, Origin contrôlée) — fils et appels auxquels le pro participe.
 */
import { neon } from "@neondatabase/serverless";
import type { Sql } from "../../../../_lib/depotStockage";
import { contexteDepotNeon, type EnvDepotComplet } from "../../../../_lib/depotNeon";
import { indisponible, repondre, routeurDepot, segments } from "../../../../_lib/depotService";

export async function onRequest(ctx: { request: Request; env: EnvDepotComplet; params: { chemin?: string | string[] }; data?: Record<string, unknown>; waitUntil?: (p: Promise<unknown>) => void }): Promise<Response> {
  const fournisseurId = String(ctx.data?.fournisseurId || "");
  if (!fournisseurId) return repondre({ status: 401, json: { ok: false, error: "unauthenticated" } });
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    const f = (await sql`SELECT "raisonSociale" FROM "Fournisseur" WHERE "id" = ${fournisseurId} LIMIT 1`)[0];
    const a = { genre: "pro" as const, cle: `frn:${fournisseurId}`, nom: String(f?.raisonSociale || "Professionnel") };
    return repondre(await routeurDepot(contexteDepotNeon(ctx.env, sql, ctx.waitUntil?.bind(ctx)), ctx.request, a, segments(ctx.params.chemin)));
  } catch (e) {
    console.error(`[cercles/depot] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return repondre(indisponible());
  }
}
