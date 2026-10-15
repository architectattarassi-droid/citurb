/**
 * /api/cc/cabinets — cabinets émetteurs des devis et factures (multi-cabinets).
 *   GET  : liste + référentiel du formulaire de création de dossier
 *          (phases de packages/contracts, prestations de la grille ARC-BATI).
 *   POST : ajoute un cabinet (nom, architecte, n° d'Ordre, mentions légales, logo).
 * SQL : docs/sql/devis-facturation-neon.sql ; absent → ARC-BATI en lecture seule.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../_lib/adminSession";
import { lireJson } from "../../../_lib/cercles";
import { listerCabinets, validerCabinet, versCabinet } from "../../../_lib/cabinets";
import { PHASES, schemaPret, type Sql } from "../../../_lib/dossierAdmin";
import { GRILLE_ARC_BATI_2026_10 } from "../../../../apps/web/src/domain/honoraires/grilleArcBati";

interface Env { DATABASE_URL?: string }
const PRESTATIONS = GRILLE_ARC_BATI_2026_10.prestations.map((p) => ({ code: p.code, libelle: p.libelle, famille: p.famille }));

export async function onRequestGet(ctx: { env: Env }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    const [l, s] = await Promise.all([listerCabinets(sql), schemaPret(sql)]);
    return json(200, { ok: true, ...l, sqlAColler: l.sqlAColler || !s.devisFacturation, phases: PHASES, prestations: PRESTATIONS });
  } catch (e) {
    console.error(`[cc/cabinets] lecture impossible (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}

export async function onRequestPost(ctx: { request: Request; env: Env; data: Record<string, unknown> }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  const b = await lireJson(ctx.request, 16 * 1024);
  if (!b || typeof b !== "object" || Array.isArray(b)) return json(400, { ok: false, error: "corps_invalide" });
  const v = validerCabinet(b as Record<string, unknown>);
  if (!v.ok) return json(400, { ok: false, error: "validation", erreurs: v.erreurs });
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    if (!(await schemaPret(sql)).devisFacturation) return json(503, { ok: false, error: "sql_a_coller", fichier: "docs/sql/devis-facturation-neon.sql" });
    const c = v.c, id = `cab_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const r = await sql`INSERT INTO "Cabinet" ("id", "nom", "architecte", "titre", "numeroOrdre", "adresse", "ville", "telephone", "email", "ice", "identifiantFiscal", "rc", "patente", "logoUrl")
      VALUES (${id}, ${c.nom}, ${c.architecte}, ${c.titre}, ${c.numeroOrdre}, ${c.adresse}, ${c.ville}, ${c.telephone}, ${c.email}, ${c.ice}, ${c.identifiantFiscal}, ${c.rc}, ${c.patente}, ${c.logoUrl})
      RETURNING *`;
    console.log(`[cc/cabinets] cabinet ${id} créé par ${String(ctx.data.adminEmail || "admin")}`);
    return json(201, { ok: true, cabinet: versCabinet(r[0]) });
  } catch (e) {
    console.error(`[cc/cabinets] création impossible (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
