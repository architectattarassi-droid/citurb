/**
 * Cloudflare Pages Function — /api/cc/rdv/parametres (back-office, protégé par _middleware.ts)
 *   GET : paramètres de prise de rendez-vous (valeurs par défaut si rien d'enregistré) ;
 *   PUT : enregistre { lienVisio, dureeMin, delaiMinHeures, horizonJours, plages, fermetures } (validation stricte).
 */
import { neon } from "@neondatabase/serverless";
import { lireParametres, PARAMETRES_DEFAUT, repondre, tablesRdvPresentes, validerParametres, type Reponse, type Sql } from "../../../_lib/rdv";

interface Env { DATABASE_URL?: string }
const KO = (): Reponse => ({ status: 503, json: { ok: false, error: "storage_unavailable" } });

export async function lireParametresAdmin(sql: Sql): Promise<Reponse> {
  if (!(await tablesRdvPresentes(sql))) return { status: 200, json: { ok: true, table: false, parametres: PARAMETRES_DEFAUT } };
  return { status: 200, json: { ok: true, table: true, parametres: await lireParametres(sql) } };
}

export async function enregistrerParametres(sql: Sql, body: unknown): Promise<Reponse> {
  const v = validerParametres(body);
  if (!v.ok) return { status: 400, json: { ok: false, error: v.erreur } };
  if (!(await tablesRdvPresentes(sql))) return KO();
  await sql`INSERT INTO "Parametre" ("cle", "valeur", "updatedAt") VALUES ('rdv', ${JSON.stringify(v.parametres)}::jsonb, now())
    ON CONFLICT ("cle") DO UPDATE SET "valeur" = EXCLUDED."valeur", "updatedAt" = now()`;
  return { status: 200, json: { ok: true, parametres: v.parametres } };
}

export async function onRequestGet(ctx: { env: Env }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(KO());
  try { return repondre(await lireParametresAdmin(neon(ctx.env.DATABASE_URL) as unknown as Sql)); } catch { return repondre(KO()); }
}

export async function onRequestPut(ctx: { request: Request; env: Env }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(KO());
  let body: unknown;
  try { body = await ctx.request.json(); } catch { return repondre({ status: 400, json: { ok: false, error: "payload_invalid" } }); }
  try { return repondre(await enregistrerParametres(neon(ctx.env.DATABASE_URL) as unknown as Sql, body)); } catch { return repondre(KO()); }
}
