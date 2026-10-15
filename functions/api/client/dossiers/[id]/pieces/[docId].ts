/** GET /api/client/dossiers/<id>/pieces/<docId> — fichier d'une pièce de SON dossier (jamais une pièce back-office). */
import { neon } from "@neondatabase/serverless";
import type { SessionClient } from "../../../../../_lib/clientSession";
import { depotDocumentsNeon, reponseDocument, type Sql } from "../../../../../_lib/documents";
import { documentDuDossier } from "../../../../../_lib/dossierPieces";

export async function onRequestGet(ctx: { env: { DATABASE_URL?: string }; params: { id?: string; docId?: string }; data: { client?: SessionClient } }): Promise<Response> {
  const id = String(ctx.params.id || ""), doc = String(ctx.params.docId || "");
  if (!ctx.data.client?.dossierIds.includes(id) || !ctx.env.DATABASE_URL) return reponseDocument(null);
  const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
  try {
    if (!(await documentDuDossier(sql, id, doc, { client: true }))) return reponseDocument(null);
    return reponseDocument(await depotDocumentsNeon(sql).octets(doc));
  } catch {
    return reponseDocument(null);
  }
}
