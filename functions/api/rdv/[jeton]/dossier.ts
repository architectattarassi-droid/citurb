/**
 * Cloudflare Pages Function — POST /api/rdv/<jeton>/dossier  { reponses }
 * Enregistre les réponses du dossier rempli pendant l'appel (liste blanche
 * CHAMPS_DOSSIER, ≤ 16 Ko, jamais de pièce contractuelle) dans
 * RendezVous.dossierRdv et Dossier.payload.dossierRdv.
 */
import { neon } from "@neondatabase/serverless";
import { DOSSIER_MAX_OCTETS, filtrerDossier, indisponible, rdvParJeton, repondre, tablesRdvPresentes, type Reponse, type Sql } from "../../../_lib/rdv";

interface Env { DATABASE_URL?: string }

export async function enregistrerDossier(sql: Sql, jeton: string, body: unknown, maintenant = Date.now()): Promise<Reponse> {
  if (new TextEncoder().encode(JSON.stringify(body ?? null)).length > DOSSIER_MAX_OCTETS) return { status: 400, json: { ok: false, error: "payload_too_large" } };
  const reponses = filtrerDossier((body as Record<string, unknown> | null)?.reponses);
  if (!reponses) return { status: 400, json: { ok: false, error: "payload_invalid" } };
  if (!(await tablesRdvPresentes(sql))) return indisponible();
  const r = await rdvParJeton(sql, jeton);
  if (!r) return { status: 404, json: { ok: false, error: "not_found" } };
  if (r.statut === "ANNULE") return { status: 409, json: { ok: false, error: "rdv_annule" } };
  const dossierRdv = { ...reponses, majLe: new Date(maintenant).toISOString() };
  const json = JSON.stringify(dossierRdv);
  await sql`UPDATE "RendezVous" SET "dossierRdv" = ${json}::jsonb, "updatedAt" = now() WHERE "id" = ${String(r.id)}`;
  if (r.dossierId) {
    await sql`UPDATE "Dossier" SET "payload" = jsonb_set(COALESCE("payload", '{}'::jsonb), '{dossierRdv}', ${json}::jsonb, true), "updatedAt" = now() WHERE "id" = ${String(r.dossierId)}`.catch(() => []);
  }
  return { status: 200, json: { ok: true, majLe: dossierRdv.majLe } };
}

export async function onRequestPost(ctx: { request: Request; env: Env; params: { jeton?: string } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  let body: unknown;
  try { body = await ctx.request.json(); } catch { return repondre({ status: 400, json: { ok: false, error: "payload_invalid" } }); }
  try { return repondre(await enregistrerDossier(neon(ctx.env.DATABASE_URL) as unknown as Sql, String(ctx.params.jeton || ""), body)); } catch { return repondre(indisponible()); }
}
