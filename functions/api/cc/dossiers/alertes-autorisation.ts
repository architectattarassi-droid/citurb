/**
 * GET /api/cc/dossiers/alertes-autorisation — autorisations de construire qui
 * expirent dans 90 jours ou moins, ou ont expiré (spec Devis & Facturation §8.4),
 * pour tous les dossiers, y compris ceux créés déjà avancés par l'admin.
 * Le devis de renouvellement prérempli (DEPOT_RENOUV) viendra avec l'étape Devis.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../_lib/adminSession";
import { alertesAutorisation, schemaPret, type Sql } from "../../../_lib/dossierAdmin";

export async function onRequestGet(ctx: { env: { DATABASE_URL?: string } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    const s = await schemaPret(sql);
    if (!s.dossier || !s.devisFacturation) return json(200, { ok: true, alertes: [], sqlAColler: true });
    return json(200, { ok: true, alertes: await alertesAutorisation(sql, new Date().toISOString().slice(0, 10)) });
  } catch (e) {
    console.error(`[cc/dossiers/alertes] lecture impossible (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
