/**
 * GET /api/cc/echeances — échéances de tous les dossiers (lot GP4) : péremption du permis,
 * expiration d'autorisation, assurances, cautions, parfait achèvement, décennale.
 * Logique : functions/_lib/echeances.ts. Garde : functions/api/cc/_middleware.ts.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../_lib/adminSession";
import type { Sql } from "../../../_lib/dossierAdmin";
import { lireEcheances } from "../../../_lib/echeances";

export async function onRequestGet(ctx: { env: { DATABASE_URL?: string; RESEND_API_KEY?: string; LEAD_NOTIFY_TO?: string } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const dossiers = await lireEcheances(neon(ctx.env.DATABASE_URL) as unknown as Sql, aujourdhui);
    return json(200, {
      ok: true, aujourdhui,
      dossiers: dossiers.map(({ payload: _p, ...d }) => d),
      emailConfigure: !!ctx.env.RESEND_API_KEY && !!(ctx.env.LEAD_NOTIFY_TO || "").trim(),
    });
  } catch (e) {
    console.error(`[cc/echeances] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
