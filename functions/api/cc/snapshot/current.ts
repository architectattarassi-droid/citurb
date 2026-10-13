/**
 * Cloudflare Pages Function — GET /api/cc/snapshot/current
 *
 * Compteurs du bandeau du back-office (CCKpiBar), lus dans Neon. Remplace le
 * snapshot de l'API NestJS éteinte, qui mélangeait chiffres réels et valeurs
 * de démonstration : ici, uniquement des comptages de tables existantes.
 * Table absente → compteur null (affiché « — »), jamais d'erreur.
 *
 * Protégée par functions/api/cc/_middleware.ts (Cloudflare Access ou cookie).
 */

import { neon } from "@neondatabase/serverless";

interface Env { DATABASE_URL?: string }
type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

export type Snapshot = {
  leads7j: number | null;
  leadsTotal: number | null;
  rdvAVenir: number | null;
  dossiers: number | null;
  fournisseursEnAttente: number | null;
  terrainsEnAttente: number | null;
};

const n = (v: unknown): number | null => (v == null ? null : Number(v));

export async function lireSnapshot(sql: Sql): Promise<Snapshot> {
  const t = (await sql`SELECT to_regclass('public."Lead"') IS NOT NULL AS lead, to_regclass('public."RendezVous"') IS NOT NULL AS rdv,
    to_regclass('public."Dossier"') IS NOT NULL AS dossier, to_regclass('public."Fournisseur"') IS NOT NULL AS fournisseur,
    to_regclass('public."TerrainAnnonce"') IS NOT NULL AS terrain`)[0] ?? {};
  const [leads, rdv, dossiers, fournisseurs, terrains] = await Promise.all([
    t.lead ? sql`SELECT count(*) FILTER (WHERE "createdAt" >= now() - interval '7 days')::int AS a, count(*)::int AS b FROM "Lead"` : null,
    t.rdv ? sql`SELECT count(*)::int AS a FROM "RendezVous" WHERE "debut" >= now() AND "statut" NOT IN ('ANNULE')` : null,
    t.dossier ? sql`SELECT count(*)::int AS a FROM "Dossier"` : null,
    t.fournisseur ? sql`SELECT count(*)::int AS a FROM "Fournisseur" WHERE "statut" = 'PENDING'` : null,
    t.terrain ? sql`SELECT count(*)::int AS a FROM "TerrainAnnonce" WHERE "statut" = 'EN_ATTENTE'` : null,
  ]);
  return {
    leads7j: n(leads?.[0]?.a), leadsTotal: n(leads?.[0]?.b), rdvAVenir: n(rdv?.[0]?.a), dossiers: n(dossiers?.[0]?.a),
    fournisseursEnAttente: n(fournisseurs?.[0]?.a), terrainsEnAttente: n(terrains?.[0]?.a),
  };
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export async function onRequestGet(ctx: { env: Env }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  try {
    return json(200, { ok: true, ...(await lireSnapshot(neon(ctx.env.DATABASE_URL) as unknown as Sql)) });
  } catch (e) {
    console.error(`[cc/snapshot] lecture impossible (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
