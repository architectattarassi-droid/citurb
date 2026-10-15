/**
 * /api/cc/dossiers/<id>/pieces — documents attendus du dossier, phase par phase (lot GP2).
 *   GET   phases, pièces (« Document manquant »…), compteurs, normes par lot, checklists de chantier
 *   POST  { action: "rattacher" | "valider" | "refuser" | "sans_objet" | "reinitialiser", cle, … }
 *         (rattacher : documentId d'un fichier envoyé au dépôt commun /api/cc/depot, contexte « dossier »)
 * Logique : functions/_lib/dossierPieces.ts. Garde : functions/api/cc/_middleware.ts.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../../_lib/adminSession";
import type { Sql } from "../../../../_lib/documents";
import { appliquerActionPiece, lireActionPiece, lirePieces } from "../../../../_lib/dossierPieces";

type Ctx = { request: Request; env: { DATABASE_URL?: string }; params: { id?: string }; data: Record<string, unknown> };
const MAX = 6_500_000;

export async function onRequestGet(ctx: Ctx): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    const r = await lirePieces(neon(ctx.env.DATABASE_URL) as unknown as Sql, String(ctx.params.id || ""));
    return r ? json(200, { ok: true, ...r }) : json(404, { ok: false, error: "not_found" });
  } catch (e) {
    console.error(`[cc/pieces] lecture (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}

export async function onRequestPost(ctx: Ctx): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  let corps: unknown = null;
  try { const t = await ctx.request.text(); corps = t.length <= MAX ? JSON.parse(t) : null; } catch { /* illisible */ }
  if (!corps) return json(413, { ok: false, error: "fichier_trop_lourd" });
  const a = lireActionPiece(corps);
  if ("erreur" in a) return json(400, { ok: false, error: a.erreur });
  try {
    const r = await appliquerActionPiece(neon(ctx.env.DATABASE_URL) as unknown as Sql, String(ctx.params.id || ""), a, { kind: "admin", email: String(ctx.data.adminEmail || "") });
    return json(r.status, r.json);
  } catch (e) {
    console.error(`[cc/pieces] action (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
