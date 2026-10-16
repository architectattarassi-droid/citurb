/**
 * /api/cc/dossiers/<id>/etapes/<code> — page d'une étape (lot GP6) : functions/_lib/etapeDossier.ts.
 *   GET   en-tête (statut, dates prévues et réelles, paiement, responsable), pièces et normes de la phase,
 *         vidéos de la phase graphique, intervenants, relance préremplie, journal, échanges du dossier
 *   PATCH { action: "planning" | "intervenant_ajouter" | "intervenant_retirer", … }
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../../../_lib/adminSession";
import type { Sql } from "../../../../../_lib/dossierAdmin";
import { appliquerActionEtape, lireActionEtape, lireEtapeAdmin } from "../../../../../_lib/etapeDossier";
import { echangesDuDossier } from "../../../../../_lib/dossierEchanges";

type Ctx = { request: Request; env: { DATABASE_URL?: string }; params: { id?: string; code?: string }; data: Record<string, unknown> };
const erreur = (e: unknown) => { console.error(`[cc/etapes] erreur (${(e as { code?: string })?.code || "sans code"})`); return json(503, { ok: false, error: "storage_unavailable" }); };

export async function onRequestGet(ctx: Ctx): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    const id = String(ctx.params.id || ""), code = String(ctx.params.code || "");
    const e = await lireEtapeAdmin(sql, id, code);
    if (!e) return json(404, { ok: false, error: "not_found" });
    const echanges = await echangesDuDossier(sql, id).catch(() => null);
    return json(200, { ok: true, ...e, echanges });
  } catch (e) { return erreur(e); }
}

export async function onRequestPatch(ctx: Ctx): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  let corps: unknown = null;
  try { const t = await ctx.request.text(); corps = t.length <= 8192 ? JSON.parse(t) : null; } catch { /* illisible */ }
  const a = lireActionEtape(corps);
  if ("erreur" in a) return json(400, { ok: false, error: a.erreur });
  try {
    const r = await appliquerActionEtape(neon(ctx.env.DATABASE_URL) as unknown as Sql, String(ctx.params.id || ""), String(ctx.params.code || ""), a, String(ctx.data.adminEmail || "admin"));
    return json(r.status, r.json);
  } catch (e) { return erreur(e); }
}
