/**
 * Cloudflare Pages Function — /api/cc/terrains (back-office, protégé par _middleware.ts)
 *   GET   : toutes les annonces, coordonnées du déposant comprises (modération) ;
 *   PATCH : { id, statut: PUBLIE | REFUSE | VENDU | EN_ATTENTE, noteAdmin? }.
 */
import { neon } from "@neondatabase/serverless";
import { STATUTS, tableExiste, type Sql } from "../../../_lib/terrains";

interface Env { DATABASE_URL?: string }
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? null : String(v));

export async function listerTout(sql: Sql) {
  if (!(await tableExiste(sql))) return { table: false, annonces: [] as unknown[] };
  const rows = await sql`SELECT * FROM "TerrainAnnonce" ORDER BY ("statut" = 'EN_ATTENTE') DESC, "createdAt" DESC LIMIT 500`;
  return { table: true, annonces: rows.map((r) => ({ ...r, createdAt: iso(r.createdAt), updatedAt: iso(r.updatedAt), publieAt: iso(r.publieAt) })) };
}

export async function changerStatut(sql: Sql, body: Record<string, unknown>) {
  const id = typeof body.id === "string" && /^ter_[a-z0-9]{6,40}$/.test(body.id) ? body.id : "";
  const statut = typeof body.statut === "string" && (STATUTS as readonly string[]).includes(body.statut) ? body.statut : "";
  if (!id || !statut) return { status: 400, json: { ok: false, error: "payload_invalid" } };
  const note = typeof body.noteAdmin === "string" ? body.noteAdmin.slice(0, 1000) : null;
  const r = await sql`UPDATE "TerrainAnnonce" SET "statut" = ${statut}, "noteAdmin" = COALESCE(${note}, "noteAdmin"),
      "publieAt" = CASE WHEN ${statut} = 'PUBLIE' AND "publieAt" IS NULL THEN now() ELSE "publieAt" END, "updatedAt" = now()
    WHERE "id" = ${id} RETURNING "id"`;
  return r.length ? { status: 200, json: { ok: true } } : { status: 404, json: { ok: false, error: "not_found" } };
}

export async function onRequestGet(ctx: { env: Env }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try { return json(200, await listerTout(neon(ctx.env.DATABASE_URL) as unknown as Sql)); } catch { return json(503, { ok: false, error: "storage_unavailable" }); }
}

export async function onRequestPatch(ctx: { request: Request; env: Env }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  let body: unknown;
  try { body = await ctx.request.json(); } catch { return json(400, { ok: false, error: "payload_invalid" }); }
  try {
    const r = await changerStatut(neon(ctx.env.DATABASE_URL) as unknown as Sql, (body ?? {}) as Record<string, unknown>);
    return json(r.status, r.json);
  } catch { return json(503, { ok: false, error: "storage_unavailable" }); }
}
