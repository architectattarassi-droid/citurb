/**
 * Cloudflare Pages Function — GET /api/rdv/<jeton>
 * Espace client du rendez-vous : le jeton (secret, 256 bits) est la seule clé ;
 * il est haché pour la recherche. Ne renvoie que CE rendez-vous.
 */
import { neon } from "@neondatabase/serverless";
import { indisponible, lireParametres, rdvParJeton, repondre, tablesRdvPresentes, vueClient, type Reponse, type Sql } from "../../_lib/rdv";
import { visioConfiguree, type VisioEnv } from "../../_lib/visio";

interface Env extends VisioEnv { DATABASE_URL?: string }

export async function lireRdv(sql: Sql, jeton: string, visioIntegree: boolean, maintenant = Date.now()): Promise<Reponse> {
  if (!(await tablesRdvPresentes(sql))) return indisponible();
  const r = await rdvParJeton(sql, jeton);
  if (!r) return { status: 404, json: { ok: false, error: "not_found" } };
  return { status: 200, json: { ok: true, rdv: vueClient(r, await lireParametres(sql), visioIntegree, maintenant) } };
}

export async function onRequestGet(ctx: { env: Env; params: { jeton?: string } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  try { return repondre(await lireRdv(neon(ctx.env.DATABASE_URL) as unknown as Sql, String(ctx.params.jeton || ""), visioConfiguree(ctx.env))); } catch { return repondre(indisponible()); }
}
