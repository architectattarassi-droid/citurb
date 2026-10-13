/**
 * Cloudflare Pages Function — POST /api/rdv/<jeton>/visio
 * Configuration JaaS du CLIENT (jamais modérateur) pour la salle de son
 * rendez-vous, de 15 min avant à 2 h après le début.
 * JaaS non configuré → 503 visio_non_configuree (le front affiche le lien de secours).
 */
import { neon } from "@neondatabase/serverless";
import { FERMETURE_VISIO_MS, indisponible, instant, OUVERTURE_VISIO_MS, rdvParJeton, repondre, tablesRdvPresentes, type Reponse, type Sql } from "../../../_lib/rdv";
import { acces, visioConfiguree, type VisioEnv } from "../../../_lib/visio";

interface Env extends VisioEnv { DATABASE_URL?: string }

export async function visioClient(sql: Sql, env: VisioEnv, jeton: string, maintenant = Date.now()): Promise<Reponse> {
  if (!visioConfiguree(env)) return { status: 503, json: { ok: false, error: "visio_non_configuree" } };
  if (!(await tablesRdvPresentes(sql))) return indisponible();
  const r = await rdvParJeton(sql, jeton);
  if (!r) return { status: 404, json: { ok: false, error: "not_found" } };
  if (r.statut !== "CONFIRME") return { status: 409, json: { ok: false, error: "rdv_non_actif" } };
  const debut = instant(r.debut);
  if (maintenant < debut - OUVERTURE_VISIO_MS) return { status: 403, json: { ok: false, error: "trop_tot", ouverture: new Date(debut - OUVERTURE_VISIO_MS).toISOString() } };
  if (maintenant > debut + FERMETURE_VISIO_MS) return { status: 403, json: { ok: false, error: "termine" } };
  const a = await acces(env, "rdv", String(r.salle || ""), { id: `client-${String(r.id)}`, nom: String(r.nom), email: (r.email as string) || null }, false, maintenant);
  return a.ok ? { status: 200, json: { ok: true, config: a.config } } : { status: 503, json: { ok: false, error: a.error } };
}

export async function onRequestPost(ctx: { env: Env; params: { jeton?: string } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  try { return repondre(await visioClient(neon(ctx.env.DATABASE_URL) as unknown as Sql, ctx.env, String(ctx.params.jeton || ""))); } catch { return repondre(indisponible()); }
}
