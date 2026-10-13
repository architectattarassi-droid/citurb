/**
 * Cloudflare Pages Function — GET /api/rdv/creneaux
 * Créneaux libres des jours à venir (heure du Maroc) : plages horaires des
 * paramètres, hors fermetures, réservations confirmées et délai minimum.
 */
import { neon } from "@neondatabase/serverless";
import { creneauxOccupes, FUSEAU, genererCreneaux, indisponible, lireParametres, repondre, tablesRdvPresentes, type Reponse, type Sql } from "../../_lib/rdv";

interface Env { DATABASE_URL?: string }

export async function listerCreneaux(sql: Sql, maintenant = Date.now()): Promise<Reponse> {
  if (!(await tablesRdvPresentes(sql))) return indisponible();
  const p = await lireParametres(sql);
  const occupes = await creneauxOccupes(sql, maintenant, maintenant + (p.horizonJours + 1) * 86_400_000);
  return { status: 200, json: { ok: true, fuseau: FUSEAU, dureeMin: p.dureeMin, jours: genererCreneaux(p, maintenant, occupes) } };
}

export async function onRequestGet(ctx: { env: Env }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  try { return repondre(await listerCreneaux(neon(ctx.env.DATABASE_URL) as unknown as Sql)); } catch { return repondre(indisponible()); }
}
