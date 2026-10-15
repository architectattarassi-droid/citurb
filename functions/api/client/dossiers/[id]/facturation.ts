/**
 * /api/client/dossiers/<id>/facturation — espace client (/mon-espace), sous la garde
 * functions/api/client/_middleware.ts (session client, dossier du client seulement).
 *   GET  : ses devis émis (document, statut), ses factures (document, statut, payé / restant), état par phase.
 *   POST : { action: "accepter", devisId, pack?, commandees[] } — acceptation EN LIGNE horodatée,
 *          valant ordre de service (spec §8.2) ; génère l'échéancier du contrat.
 * Aucune coordonnée de tiers n'est renvoyée (documents émis par CITURBAREA / HSE DECO).
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../../_lib/adminSession";
import type { SessionClient } from "../../../../_lib/clientSession";
import { lireJson } from "../../../../_lib/cercles";
import { tablesDevis } from "../../../../_lib/devisDepot";
import type { Sql } from "../../../../_lib/dossierAdmin";
import { RefusFacturation, accepterDevis, lireAcceptation, tablesFacturation, vueFacturationClient } from "../../../../_lib/facturationDepot";

type Ctx = { request: Request; env: { DATABASE_URL?: string }; params: { id?: string }; data: { client?: SessionClient } };

async function garde(ctx: Ctx, f: (sql: Sql, dossierId: string, c: SessionClient, maintenant: string) => Promise<Response>): Promise<Response> {
  const c = ctx.data.client, dossierId = String(ctx.params.id || "");
  if (!c) return json(401, { ok: false, error: "unauthenticated" });
  if (!c.dossierIds.includes(dossierId)) return json(404, { ok: false, error: "not_found" });
  try {
    const sql = neon(ctx.env.DATABASE_URL!) as unknown as Sql;
    if (!(await tablesDevis(sql))) return json(200, { ok: true, devis: [], factures: [], phases: [] });
    return await f(sql, dossierId, c, new Date().toISOString());
  } catch (e) {
    if (e instanceof RefusFacturation) return json(e.status, { ok: false, error: e.code, message: e.message });
    console.error(`[client/facturation] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}

export const onRequestGet = (ctx: Ctx) => garde(ctx, async (sql, dossierId, _c, maintenant) =>
  json(200, { ok: true, ...(await vueFacturationClient(sql, dossierId, maintenant.slice(0, 10))) }));

export const onRequestPost = (ctx: Ctx) => garde(ctx, async (sql, dossierId, c, maintenant) => {
  const b = (await lireJson(ctx.request, 8 * 1024)) as Record<string, unknown> | null;
  if (!b || b.action !== "accepter") return json(400, { ok: false, error: "action_inconnue" });
  if (!(await tablesFacturation(sql))) return json(503, { ok: false, error: "storage_unavailable" });
  const devisId = typeof b.devisId === "string" ? b.devisId.slice(0, 60) : "";
  const d = (await sql`SELECT "hashContenu" FROM "Devis" WHERE "id" = ${devisId} AND "dossierId" = ${dossierId}`)[0];
  if (!d) return json(404, { ok: false, error: "not_found" });
  const a = lireAcceptation({ ...b, dateAcceptation: undefined }, maintenant.slice(0, 10));
  if ("erreur" in a) return json(400, { ok: false, error: "validation", message: a.erreur });
  const r = await accepterDevis(sql, devisId, {
    ...a, inclureHorsHonoraires: false,
    preuve: { type: "EN_LIGNE", horodatage: maintenant, clientId: c.clientId, empreinteDevis: d.hashContenu == null ? null : String(d.hashContenu) },
  }, `client:${c.clientId}`, maintenant);
  return json(200, { ok: true, ...r });
});
