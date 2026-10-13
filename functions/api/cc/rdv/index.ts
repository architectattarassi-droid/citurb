/**
 * Cloudflare Pages Function — GET /api/cc/rdv (back-office, protégé par _middleware.ts)
 * Rendez-vous à venir et des 30 derniers jours, coordonnées et dossier compris.
 * Le jeton d'accès client n'est jamais renvoyé (seule son empreinte est stockée).
 */
import { neon } from "@neondatabase/serverless";
import { isoOuNull, repondre, tablesRdvPresentes, type Sql } from "../../../_lib/rdv";
import { visioConfiguree, type VisioEnv } from "../../../_lib/visio";

interface Env extends VisioEnv { DATABASE_URL?: string }

/** Ligne du back-office : tout sauf l'empreinte du jeton. */
export function vueAdmin(r: Record<string, unknown>) {
  const { jetonHash: _h, ...reste } = r;
  void _h;
  return { ...reste, debut: isoOuNull(r.debut), createdAt: isoOuNull(r.createdAt), updatedAt: isoOuNull(r.updatedAt) };
}

export async function listerRdv(sql: Sql) {
  if (!(await tablesRdvPresentes(sql))) return { table: false, rdv: [] as unknown[] };
  const rows = await sql`SELECT * FROM "RendezVous" WHERE "debut" >= now() - interval '30 days' ORDER BY "debut" ASC LIMIT 500`;
  return { table: true, rdv: rows.map(vueAdmin) };
}

export async function onRequestGet(ctx: { env: Env }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre({ status: 503, json: { ok: false, error: "storage_unavailable" } });
  try { return repondre({ status: 200, json: { ok: true, visioIntegree: visioConfiguree(ctx.env), ...(await listerRdv(neon(ctx.env.DATABASE_URL) as unknown as Sql)) } }); } catch { return repondre({ status: 503, json: { ok: false, error: "storage_unavailable" } }); }
}
