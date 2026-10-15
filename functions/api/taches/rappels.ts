/**
 * POST /api/taches/rappels — tâche planifiée quotidienne (lot GP4) : rappels d'échéances à l'administration.
 * Appelée par un déclencheur planifié (Cloudflare Worker « cron » ou service de cron) avec l'en-tête
 * x-tache-secret = TACHES_SECRET (≥ 32 caractères). Sans secret configuré : 503 (fermé par défaut).
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../_lib/adminSession";
import type { Sql } from "../../_lib/dossierAdmin";
import { envoyerRappels } from "../../_lib/echeances";
import type { EnvMail } from "../../_lib/rdv";

function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function onRequestPost(ctx: { request: Request; env: EnvMail & { DATABASE_URL?: string; PUBLIC_WEB_URL?: string; TACHES_SECRET?: string } }): Promise<Response> {
  const secret = (ctx.env.TACHES_SECRET || "").trim();
  if (secret.length < 32 || !ctx.env.DATABASE_URL) return json(503, { ok: false, error: "tache_non_configuree" });
  if (!egal(ctx.request.headers.get("x-tache-secret") || "", secret)) return json(403, { ok: false, error: "forbidden" });
  try {
    const r = await envoyerRappels(neon(ctx.env.DATABASE_URL) as unknown as Sql, ctx.env, new Date().toISOString().slice(0, 10), "tache:rappels");
    return json(200, { ok: true, ...r });
  } catch (e) {
    console.error(`[taches/rappels] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
