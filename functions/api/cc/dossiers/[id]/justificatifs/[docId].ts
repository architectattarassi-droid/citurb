/**
 * GET /api/cc/dossiers/<id>/justificatifs/<docId> — justificatif de facturation (devis signé scanné,
 * preuve d'encaissement) déposé dans le dépôt commun, vérifié comme appartenant à CE dossier. Admin.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../../../_lib/adminSession";
import { depotDocumentsNeon, reponseDocument, type Sql } from "../../../../../_lib/documents";
import { CONTEXTE_JUSTIFICATIFS } from "../../../../../_lib/facturationDepot";

export async function onRequestGet(ctx: { env: { DATABASE_URL?: string }; params: { id?: string; docId?: string } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    const depot = depotDocumentsNeon(neon(ctx.env.DATABASE_URL) as unknown as Sql);
    const [m] = await depot.metas([String(ctx.params.docId || "")]);
    if (!m || m.contexte !== CONTEXTE_JUSTIFICATIFS || m.objetId !== String(ctx.params.id || "")) return reponseDocument(null);
    return reponseDocument(await depot.octets(m.id));
  } catch (e) {
    console.error(`[cc/justificatifs] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
