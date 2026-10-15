/** GET /api/cc/dossiers/<id>/pieces/<docId> — fichier d'une pièce du dossier (admin). */
import { neon } from "@neondatabase/serverless";
import { depotDocumentsNeon, reponseDocument, type Sql } from "../../../../../_lib/documents";
import { documentDuDossier } from "../../../../../_lib/dossierPieces";

export async function onRequestGet(ctx: { env: { DATABASE_URL?: string }; params: { id?: string; docId?: string } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return reponseDocument(null);
  const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
  const id = String(ctx.params.id || ""), doc = String(ctx.params.docId || "");
  try {
    if (!(await documentDuDossier(sql, id, doc))) return reponseDocument(null);
    return reponseDocument(await depotDocumentsNeon(sql).octets(doc));
  } catch {
    return reponseDocument(null);
  }
}
