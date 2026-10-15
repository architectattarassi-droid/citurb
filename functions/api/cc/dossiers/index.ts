/**
 * Cloudflare Pages Function — GET /api/cc/dossiers (liste) et POST (création admin, en bas)
 *
 * Liste des dossiers pour le back-office (DossiersModule), en remplacement de
 * GET /p2/dossier/ops/all de l'API NestJS éteinte. Même forme que
 * DossierService.findAllForOps : dossier + owner + _count.documents + firm.
 * Tables absentes (schéma non poussé) → liste vide, sans erreur.
 *
 * Protégée par functions/api/cc/_middleware.ts (Cloudflare Access ou cookie).
 */

import { neon } from "@neondatabase/serverless";
import { lireJson } from "../../../_lib/cercles";
import { RefusCreation, creerDossierAdmin, jetonDossier, journaliser, schemaPret, secretLien, validerCreation, type LienEnv } from "../../../_lib/dossierAdmin";

interface Env { DATABASE_URL?: string }
type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? null : String(v));

export async function listerDossiers(sql: Sql) {
  const t = await sql`SELECT to_regclass('public."Dossier"') IS NOT NULL AS d, to_regclass('public."DossierDocument"') IS NOT NULL AS docs`;
  if (!t[0]?.d) return [];
  const rows = t[0]?.docs
    ? await sql`SELECT d.*, u."email" AS "o_email", u."username" AS "o_username", u."phone" AS "o_phone", u."emailVerifiedAt" AS "o_ev", u."phoneVerifiedAt" AS "o_pv",
        (SELECT count(*)::int FROM "DossierDocument" x WHERE x."dossierId" = d."id") AS "n_docs"
        FROM "Dossier" d LEFT JOIN "User" u ON u."id" = d."ownerId" ORDER BY d."createdAt" DESC LIMIT 500`
    : await sql`SELECT d.*, u."email" AS "o_email", u."username" AS "o_username", u."phone" AS "o_phone", u."emailVerifiedAt" AS "o_ev", u."phoneVerifiedAt" AS "o_pv", 0 AS "n_docs"
        FROM "Dossier" d LEFT JOIN "User" u ON u."id" = d."ownerId" ORDER BY d."createdAt" DESC LIMIT 500`;
  return rows.map((r) => ({
    id: r.id, title: r.title, commune: r.commune ?? null, status: r.status, submittedAt: iso(r.submittedAt), createdAt: iso(r.createdAt),
    porteType: r.porteType, phase: r.phase, clientNom: r.clientNom, clientTel: r.clientTel, clientEmail: r.clientEmail,
    packSelected: r.packSelected ?? null, packPriceMAD: r.packPriceMAD ?? null, projectId: r.projectId ?? null, opsNote: r.opsNote ?? null, firmId: r.firmId ?? null,
    budgetEstime: r.budgetEstime ?? null, surfacePlancher: r.surfacePlancher ?? null, payload: r.payload,
    owner: { email: String(r.o_email ?? ""), username: r.o_username ?? null, phone: r.o_phone ?? null, emailVerifiedAt: iso(r.o_ev), phoneVerifiedAt: iso(r.o_pv) },
    _count: { documents: Number(r.n_docs) || 0 },
    firm: null,
  }));
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export async function onRequestGet(ctx: { env: Env }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    return json(200, await listerDossiers(neon(ctx.env.DATABASE_URL) as unknown as Sql));
  } catch (e) {
    console.error(`[cc/dossiers] lecture impossible (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}

/**
 * POST /api/cc/dossiers — création d'un dossier par l'admin (client existant,
 * dossier neuf ou déjà avancé). Logique : functions/_lib/dossierAdmin.ts.
 * SQL devis-facturation non collé → 503 sql_a_coller (l'écran l'explique).
 */
export async function onRequestPost(ctx: { request: Request; env: Env & LienEnv; data: Record<string, unknown> }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  const brut = await lireJson(ctx.request, 64 * 1024);
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) return json(400, { ok: false, error: "corps_invalide" });
  const v = validerCreation(brut as Record<string, unknown>);
  if (!v.ok) return json(400, { ok: false, error: "validation", erreurs: v.erreurs });
  const admin = String(ctx.data.adminEmail || "admin");
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    const schema = await schemaPret(sql);
    if (!schema.dossier || !schema.devisFacturation) return json(503, { ok: false, error: "sql_a_coller", fichier: "docs/sql/devis-facturation-neon.sql" });
    const maintenant = new Date().toISOString();
    const r = await creerDossierAdmin(sql, v.d, admin, maintenant);
    let lienInvitation: string | null = null;
    const avertissements = [...v.avertissements];
    if (v.d.inviter) {
      const secret = secretLien(ctx.env);
      if (!secret) avertissements.push("Lien d'invitation non généré : secret DOSSIER_LIEN_SECRET (ou ADMIN_SESSION_SECRET) absent");
      else {
        lienInvitation = `${new URL(ctx.request.url).origin}/mon-dossier/${await jetonDossier(secret, r.dossierId)}`;
        await journaliser(sql, r.dossierId, admin, "INVITATION_GENEREE", { dureeJours: 90 }, maintenant);
      }
    }
    return json(201, { ok: true, ...r, lienInvitation, avertissements });
  } catch (e) {
    if (e instanceof RefusCreation) return json(e.status, { ok: false, error: e.code, message: e.message });
    console.error(`[cc/dossiers] création impossible (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
