/**
 * /api/cc/gestion/parametres — questions encore ouvertes, laissées paramétrables (fondateur, 15/10/2026) :
 * raccordements avant le permis d'habiter, levée de toutes les réserves avant le permis d'habiter,
 * délai de l'article 770 du DOC, budget visible du client avant signature.
 *   GET  valeurs (défauts prudents si rien n'est enregistré)
 *   PUT  { raccordementsAvantPermisHabiter, leveeReservesAvantPermisHabiter, article770DelaiJours, budgetVisibleClientAvantSignature }
 * Stockage : table "Parametre" (docs/sql/rendezvous-neon.sql), clé « gestion-projet ».
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../_lib/adminSession";
import type { Sql } from "../../../_lib/dossierAdmin";
import { ecrireParametresGestion, lireParametresGestion } from "../../../_lib/echeances";
import { LIBELLES_PARAMETRES } from "../../../../packages/contracts/src/gestion/parametres";

type Ctx = { request: Request; env: { DATABASE_URL?: string } };

export async function onRequestGet(ctx: Ctx): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    return json(200, { ok: true, ...(await lireParametresGestion(neon(ctx.env.DATABASE_URL) as unknown as Sql)), libelles: LIBELLES_PARAMETRES });
  } catch { return json(503, { ok: false, error: "storage_unavailable" }); }
}

export async function onRequestPut(ctx: Ctx): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  let corps: unknown = null;
  try { const t = await ctx.request.text(); corps = t.length <= 4096 ? JSON.parse(t) : null; } catch { /* illisible */ }
  if (!corps) return json(400, { ok: false, error: "payload_invalid" });
  try {
    const p = await ecrireParametresGestion(neon(ctx.env.DATABASE_URL) as unknown as Sql, corps);
    return p ? json(200, { ok: true, parametres: p }) : json(503, { ok: false, error: "sql_a_coller", fichier: "docs/sql/rendezvous-neon.sql" });
  } catch { return json(503, { ok: false, error: "storage_unavailable" }); }
}
