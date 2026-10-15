/**
 * /api/cc/dossiers/<id>/facturation — facturation d'un dossier (admin).
 *   GET  : état des paiements par phase, devis acceptés, échéancier, factures et encaissements.
 *   POST : { action: "echeancier", devisId, echeances[] } | { action: "facturer", echeanceId, dateEcheance?, tauxTVA?, retenue? }
 *          | { action: "encaisser", factureId, montant, date, mode, reference?, justificatif?: { nom, contenu (base64) } }
 *          | { action: "avoir", factureId, montantHT?, motif } | { action: "debloquer", phase, motif }.
 * Logique : functions/_lib/facturationDepot.ts. SQL absent → 503 sql_a_coller.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../../_lib/adminSession";
import { lireJson } from "../../../../_lib/cercles";
import type { Sql } from "../../../../_lib/dossierAdmin";
import {
  MODES_ENCAISSEMENT, RefusFacturation, debloquerPhase, deposerJustificatif, emettreAvoir, emettreFacture, enregistrerEncaissement, lireFacturation,
  remplacerEcheancier, tablesFacturation, type EcheanceSaisie,
} from "../../../../_lib/facturationDepot";

type Ctx = { request: Request; env: { DATABASE_URL?: string }; params: { id?: string }; data: Record<string, unknown> };
const txt = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : typeof v === "number" ? String(v) : "");
const dateOk = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

async function avecBase(ctx: Ctx, f: (sql: Sql, dossierId: string, admin: string, maintenant: string) => Promise<Response>): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    if (!(await tablesFacturation(sql))) return json(503, { ok: false, error: "sql_a_coller", fichier: "docs/sql/devis-facturation-neon.sql" });
    return await f(sql, String(ctx.params.id || ""), String(ctx.data.adminEmail || "admin"), new Date().toISOString());
  } catch (e) {
    if (e instanceof RefusFacturation) return json(e.status, { ok: false, error: e.code, message: e.message, erreurs: e.details });
    if ((e as Error)?.message?.startsWith("Décimal invalide")) return json(400, { ok: false, error: "montant_illisible", message: "Montant illisible." });
    console.error(`[cc/facturation] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}

export const onRequestGet = (ctx: Ctx) => avecBase(ctx, async (sql, dossierId, _a, maintenant) =>
  json(200, { ok: true, ...(await lireFacturation(sql, dossierId, maintenant.slice(0, 10))) }));

export const onRequestPost = (ctx: Ctx) => avecBase(ctx, async (sql, dossierId, admin, maintenant) => {
  const b = (await lireJson(ctx.request, 7 * 1024 * 1024)) as Record<string, unknown> | null;
  if (!b) return json(400, { ok: false, error: "corps_invalide" });
  // Toute action porte sur un objet de CE dossier.
  const appartient = async (table: "EcheancePaiement" | "Facture" | "Devis", objetId: string) => {
    const r = table === "EcheancePaiement" ? await sql`SELECT 1 FROM "EcheancePaiement" WHERE "id" = ${objetId} AND "dossierId" = ${dossierId}`
      : table === "Facture" ? await sql`SELECT 1 FROM "Facture" WHERE "id" = ${objetId} AND "dossierId" = ${dossierId}`
      : await sql`SELECT 1 FROM "Devis" WHERE "id" = ${objetId} AND "dossierId" = ${dossierId}`;
    if (!r.length) throw new RefusFacturation(404, "not_found", "Introuvable dans ce dossier.");
  };
  switch (b.action) {
    case "echeancier": {
      const devisId = txt(b.devisId, 60);
      await appartient("Devis", devisId);
      const echeances: EcheanceSaisie[] = (Array.isArray(b.echeances) ? b.echeances.slice(0, 40) : []).map((x) => {
        const e = (x || {}) as Record<string, unknown>;
        return { id: txt(e.id, 60) || undefined, phaseCode: txt(e.phaseCode, 60), libelle: txt(e.libelle, 200), montantHT: txt(e.montantHT, 30) || "0", declencheur: e.declencheur === "SIGNATURE" ? "SIGNATURE" : "DEBUT_PHASE" };
      });
      await remplacerEcheancier(sql, devisId, echeances, admin, maintenant);
      return json(200, { ok: true });
    }
    case "facturer": {
      const echeanceId = txt(b.echeanceId, 60);
      await appartient("EcheancePaiement", echeanceId);
      return json(201, { ok: true, ...(await emettreFacture(sql, echeanceId, { dateEcheance: dateOk(b.dateEcheance) ?? undefined, tauxTVA: txt(b.tauxTVA, 8) || undefined, retenue: txt(b.retenue, 20) || undefined }, admin, maintenant)) });
    }
    case "encaisser": {
      const factureId = txt(b.factureId, 60);
      await appartient("Facture", factureId);
      const mode = MODES_ENCAISSEMENT.find((m) => m === b.mode);
      const date = dateOk(b.date);
      if (!mode || !date || date > maintenant.slice(0, 10)) return json(400, { ok: false, error: "validation", message: "Mode et date (passée ou du jour) requis." });
      const j = b.justificatif && typeof b.justificatif === "object" ? (b.justificatif as Record<string, unknown>) : null;
      const justificatifId = j ? await deposerJustificatif(sql, dossierId, j, `admin:${admin}`, maintenant) : null;
      return json(200, { ok: true, ...(await enregistrerEncaissement(sql, factureId, { montant: txt(b.montant, 30), date, mode, reference: txt(b.reference, 120) || null, justificatifId }, admin, maintenant)) });
    }
    case "avoir": {
      const factureId = txt(b.factureId, 60);
      await appartient("Facture", factureId);
      return json(201, { ok: true, ...(await emettreAvoir(sql, factureId, { montantHT: txt(b.montantHT, 30) || undefined, motif: txt(b.motif, 500) }, admin, maintenant)) });
    }
    case "debloquer":
      await debloquerPhase(sql, dossierId, txt(b.phase, 60), txt(b.motif, 500), admin, maintenant);
      return json(200, { ok: true });
    default:
      return json(400, { ok: false, error: "action_inconnue" });
  }
});
