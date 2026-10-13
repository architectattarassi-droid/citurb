/**
 * Cloudflare Pages Function — POST /api/cc/rdv/<id>/visio (back-office, protégé par _middleware.ts)
 * Configuration JaaS de l'architecte, MODÉRATEUR de la salle du rendez-vous.
 */
import { neon } from "@neondatabase/serverless";
import { ID_RDV_RE, repondre, tablesRdvPresentes, type Reponse, type Sql } from "../../../../_lib/rdv";
import { acces, visioConfiguree, type VisioEnv } from "../../../../_lib/visio";

interface Env extends VisioEnv { DATABASE_URL?: string }

export async function visioArchitecte(sql: Sql, env: VisioEnv, id: string, email: string, maintenant = Date.now()): Promise<Reponse> {
  if (!visioConfiguree(env)) return { status: 503, json: { ok: false, error: "visio_non_configuree" } };
  if (!ID_RDV_RE.test(id)) return { status: 400, json: { ok: false, error: "id_invalid" } };
  if (!(await tablesRdvPresentes(sql))) return { status: 503, json: { ok: false, error: "storage_unavailable" } };
  const r = await sql`SELECT "id", "salle" FROM "RendezVous" WHERE "id" = ${id} LIMIT 1`;
  if (!r.length) return { status: 404, json: { ok: false, error: "not_found" } };
  const a = await acces(env, "rdv", String(r[0].salle || ""), { id: `architecte-${email || "cabinet"}`, nom: "Architecte CITURBAREA", email: email || null }, true, maintenant);
  return a.ok ? { status: 200, json: { ok: true, config: a.config } } : { status: 503, json: { ok: false, error: a.error } };
}

export async function onRequestPost(ctx: { env: Env; params: { id?: string }; data?: Record<string, unknown> }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre({ status: 503, json: { ok: false, error: "storage_unavailable" } });
  try {
    return repondre(await visioArchitecte(neon(ctx.env.DATABASE_URL) as unknown as Sql, ctx.env, String(ctx.params.id || ""), String(ctx.data?.adminEmail || "")));
  } catch { return repondre({ status: 503, json: { ok: false, error: "storage_unavailable" } }); }
}
