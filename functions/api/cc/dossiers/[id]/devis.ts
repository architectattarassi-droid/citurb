/**
 * /api/cc/dossiers/<id>/devis — devis d'un dossier (admin).
 *   GET  : contexte du dossier pour l'éditeur (sans coordonnées) + liste des devis.
 *   POST : { entree } → nouveau brouillon (sans numéro).
 * Logique : functions/_lib/devisDepot.ts ; SQL absent → 503 sql_a_coller.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../../../_lib/adminSession";
import { lireJson } from "../../../../_lib/cercles";
import { GRILLE_COURANTE, RefusDevis, contexteDevis, creerBrouillon, listerDevis, tablesDevis } from "../../../../_lib/devisDepot";
import type { Sql } from "../../../../_lib/dossierAdmin";
import { validerEntreeDevis } from "../../../../../apps/web/src/domain/honoraires/validationEntree";

type Ctx = { request: Request; env: { DATABASE_URL?: string }; params: { id?: string }; data: Record<string, unknown> };
const SQL_A_COLLER = { ok: false, error: "sql_a_coller", fichier: "docs/sql/devis-facturation-neon.sql" };

export async function onRequestGet(ctx: Ctx): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    if (!(await tablesDevis(sql))) return json(503, SQL_A_COLLER);
    const id = String(ctx.params.id || "");
    const contexte = await contexteDevis(sql, id);
    if (!contexte) return json(404, { ok: false, error: "not_found" });
    return json(200, { ok: true, contexte, grilleVersionId: GRILLE_COURANTE.id, devis: await listerDevis(sql, id, new Date().toISOString().slice(0, 10)) });
  } catch (e) {
    console.error(`[cc/dossiers/devis] lecture impossible (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}

export async function onRequestPost(ctx: Ctx): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  const b = await lireJson(ctx.request, 64 * 1024) as { entree?: unknown } | null;
  const v = validerEntreeDevis(b?.entree, GRILLE_COURANTE);
  if (!v.ok) return json(400, { ok: false, error: "validation", erreurs: v.erreurs });
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    if (!(await tablesDevis(sql))) return json(503, SQL_A_COLLER);
    const id = String(ctx.params.id || "");
    if (!(await contexteDevis(sql, id))) return json(404, { ok: false, error: "not_found" });
    const devisId = await creerBrouillon(sql, id, v.entree, String(ctx.data.adminEmail || "admin"), new Date().toISOString());
    return json(201, { ok: true, devisId });
  } catch (e) {
    if (e instanceof RefusDevis) return json(e.status, { ok: false, error: e.code, message: e.message });
    console.error(`[cc/dossiers/devis] création impossible (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
