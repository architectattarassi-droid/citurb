/**
 * GET /api/cc/factures/<id> — document figé d'une facture ou d'un avoir (modèle rendu en PDF / DOCX
 * dans le navigateur) et son empreinte. Admin.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../_lib/adminSession";
import type { Sql } from "../../../_lib/dossierAdmin";
import { lireDocumentFacture, tablesFacturation } from "../../../_lib/facturationDepot";

export async function onRequestGet(ctx: { env: { DATABASE_URL?: string }; params: { id?: string } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    if (!(await tablesFacturation(sql))) return json(503, { ok: false, error: "sql_a_coller" });
    const d = await lireDocumentFacture(sql, String(ctx.params.id || ""));
    return d ? json(200, { ok: true, ...d }) : json(404, { ok: false, error: "not_found" });
  } catch (e) {
    console.error(`[cc/factures] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
