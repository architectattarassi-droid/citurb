/**
 * Cloudflare Pages Function — /api/cc/rdv/<id> (back-office, protégé par _middleware.ts)
 *   GET   : un rendez-vous (rafraîchi toutes les 10 s pendant l'appel : dossier en direct) ;
 *   PATCH : { statut?: CONFIRME | ANNULE | TERMINE | ABSENT, noteArchitecte? }.
 */
import { neon } from "@neondatabase/serverless";
import { ID_RDV_RE, repondre, STATUTS_RDV, tablesRdvPresentes, type Reponse, type Sql } from "../../../_lib/rdv";
import { vueAdmin } from "./index";

interface Env { DATABASE_URL?: string }
const KO = (): Reponse => ({ status: 503, json: { ok: false, error: "storage_unavailable" } });

export async function lireRdvAdmin(sql: Sql, id: string): Promise<Reponse> {
  if (!ID_RDV_RE.test(id)) return { status: 400, json: { ok: false, error: "id_invalid" } };
  if (!(await tablesRdvPresentes(sql))) return KO();
  const r = await sql`SELECT * FROM "RendezVous" WHERE "id" = ${id} LIMIT 1`;
  return r.length ? { status: 200, json: { ok: true, rdv: vueAdmin(r[0]) } } : { status: 404, json: { ok: false, error: "not_found" } };
}

export async function modifierRdv(sql: Sql, id: string, body: Record<string, unknown>): Promise<Reponse> {
  if (!ID_RDV_RE.test(id)) return { status: 400, json: { ok: false, error: "id_invalid" } };
  const invalide: Reponse = { status: 400, json: { ok: false, error: "payload_invalid" } };
  let statut: string | null = null;
  if (body.statut !== undefined) {
    if (!(STATUTS_RDV as readonly string[]).includes(String(body.statut))) return invalide;
    statut = String(body.statut);
  }
  let note: string | null = null;
  if (body.noteArchitecte !== undefined) {
    if (typeof body.noteArchitecte !== "string") return invalide;
    note = body.noteArchitecte.slice(0, 4000);
  }
  if (statut === null && note === null) return invalide;
  try {
    const r = await sql`UPDATE "RendezVous" SET "statut" = COALESCE(${statut}::text, "statut"), "noteArchitecte" = COALESCE(${note}::text, "noteArchitecte"), "updatedAt" = now()
      WHERE "id" = ${id} RETURNING "id"`;
    return r.length ? { status: 200, json: { ok: true } } : { status: 404, json: { ok: false, error: "not_found" } };
  } catch (e) {
    // Remettre CONFIRME un rendez-vous dont le créneau a été repris entre-temps.
    if ((e as { code?: string })?.code === "23505") return { status: 409, json: { ok: false, error: "creneau_pris" } };
    throw e;
  }
}

export async function onRequestGet(ctx: { env: Env; params: { id?: string } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(KO());
  try { return repondre(await lireRdvAdmin(neon(ctx.env.DATABASE_URL) as unknown as Sql, String(ctx.params.id || ""))); } catch { return repondre(KO()); }
}

export async function onRequestPatch(ctx: { request: Request; env: Env; params: { id?: string } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(KO());
  let body: unknown;
  try { body = await ctx.request.json(); } catch { return repondre({ status: 400, json: { ok: false, error: "payload_invalid" } }); }
  try { return repondre(await modifierRdv(neon(ctx.env.DATABASE_URL) as unknown as Sql, String(ctx.params.id || ""), (body ?? {}) as Record<string, unknown>)); } catch { return repondre(KO()); }
}
