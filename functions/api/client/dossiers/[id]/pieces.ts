/**
 * /api/client/dossiers/<id>/pieces — documents du dossier vus par le client (lot GP2).
 *   GET   phases et pièces (sans les pièces réservées au back-office ni les normes)
 *   POST  { action: "rattacher", cle, documentId } — le fichier est envoyé d'abord au dépôt commun
 *         (/api/client/depot, contexte « dossier ») ; seulement les pièces dont le client est le producteur
 * Un dossier d'un autre compte répond 404. Logique : functions/_lib/dossierPieces.ts.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../../_lib/adminSession";
import type { SessionClient } from "../../../../_lib/clientSession";
import type { Sql } from "../../../../_lib/documents";
import { appliquerActionPiece, lireActionPiece, lirePieces } from "../../../../_lib/dossierPieces";

type Ctx = { request: Request; env: { DATABASE_URL?: string }; params: { id?: string }; data: { client?: SessionClient } };

function dossier(ctx: Ctx): string | null {
  const id = String(ctx.params.id || "");
  return ctx.data.client && ctx.data.client.dossierIds.includes(id) ? id : null;
}

export async function onRequestGet(ctx: Ctx): Promise<Response> {
  const id = dossier(ctx);
  if (!id) return json(404, { ok: false, error: "not_found" });
  try {
    const r = await lirePieces(neon(ctx.env.DATABASE_URL!) as unknown as Sql, id, { client: true });
    return r ? json(200, { ok: true, ...r }) : json(404, { ok: false, error: "not_found" });
  } catch (e) {
    console.error(`[client/pieces] lecture (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}

export async function onRequestPost(ctx: Ctx): Promise<Response> {
  const id = dossier(ctx);
  if (!id) return json(404, { ok: false, error: "not_found" });
  let corps: unknown = null;
  try { const t = await ctx.request.text(); corps = t.length <= 6_500_000 ? JSON.parse(t) : null; } catch { /* illisible */ }
  if (!corps) return json(413, { ok: false, error: "fichier_trop_lourd" });
  const a = lireActionPiece(corps);
  if ("erreur" in a) return json(400, { ok: false, error: a.erreur });
  if (a.action !== "rattacher") return json(403, { ok: false, error: "interdit" });
  try {
    const r = await appliquerActionPiece(neon(ctx.env.DATABASE_URL!) as unknown as Sql, id, a, { kind: "client", userId: ctx.data.client!.clientId });
    return json(r.status, r.json);
  } catch (e) {
    console.error(`[client/pieces] dépôt (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
