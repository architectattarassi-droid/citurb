/**
 * GET /api/cc/dossiers/<id>/paiements — état des paiements par phase P00…P14 (lecture seule),
 * pour la timeline de la gestion de projet : dû / payé / restant, statut, `bloquante`, déblocage.
 * Côté serveur, les autres modules appellent directement etatPaiementPhasesDossier()
 * (functions/_lib/facturationDepot.ts). SQL absent → { phases: null } : rien n'est bloqué.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../../_lib/adminSession";
import type { Sql } from "../../../../_lib/dossierAdmin";
import { etatPaiementPhasesDossier } from "../../../../_lib/facturationDepot";

export async function onRequestGet(ctx: { env: { DATABASE_URL?: string }; params: { id?: string } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    const phases = await etatPaiementPhasesDossier(neon(ctx.env.DATABASE_URL) as unknown as Sql, String(ctx.params.id || ""), new Date().toISOString().slice(0, 10));
    return json(200, { ok: true, phases });
  } catch (e) {
    console.error(`[cc/paiements] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
