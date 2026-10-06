/**
 * Cloudflare Pages Function — GET /api/cc/funnel?jours=30
 *
 * Synthèse de la table "FunnelEvent" pour le back-office :
 *  - par page : sessions qui l'ont vue, qui ont commencé un formulaire, qui
 *    l'ont envoyé ;
 *  - les sessions qui ont touché un formulaire sans l'envoyer (abandons),
 *    avec les champs touchés (noms seulement), le pays et la provenance.
 *
 * Protégée par _middleware.ts (Cloudflare Access).
 */

import { neon } from "@neondatabase/serverless";

interface Env { DATABASE_URL?: string }
export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

export async function synthese(sql: Sql, jours: number) {
  const depuis = new Date(Date.now() - jours * 86_400_000).toISOString();
  const [totaux, pages, abandons] = await Promise.all([
    sql`SELECT count(DISTINCT "sessionId")::int AS sessions,
          count(DISTINCT "sessionId") FILTER (WHERE "type" IN ('wizard_start','wizard_step'))::int AS demarres,
          count(DISTINCT "sessionId") FILTER (WHERE "type" = 'intake_submit')::int AS envoyes,
          count(*) FILTER (WHERE "type" = 'view')::int AS vues
        FROM "FunnelEvent" WHERE "createdAt" >= ${depuis}::timestamp`,
    sql`SELECT "path",
          count(DISTINCT "sessionId") FILTER (WHERE "type" = 'view')::int AS sessions,
          count(DISTINCT "sessionId") FILTER (WHERE "type" IN ('wizard_start','wizard_step'))::int AS demarres,
          count(DISTINCT "sessionId") FILTER (WHERE "type" = 'intake_submit')::int AS envoyes
        FROM "FunnelEvent" WHERE "createdAt" >= ${depuis}::timestamp
        GROUP BY "path" ORDER BY sessions DESC LIMIT 40`,
    sql`SELECT e."sessionId",
          min(e."createdAt") AS debut, max(e."createdAt") AS fin,
          array_agg(DISTINCT e."path") AS pages,
          array_remove(array_agg(DISTINCT e."meta"->>'champ'), NULL) AS champs,
          max(e."pays") AS pays,
          (SELECT v."meta"->>'referrer' FROM "FunnelEvent" v
             WHERE v."sessionId" = e."sessionId" AND v."meta" ? 'referrer'
             ORDER BY v."createdAt" LIMIT 1) AS provenance
        FROM "FunnelEvent" e
        WHERE e."createdAt" >= ${depuis}::timestamp
          AND e."type" IN ('wizard_start','wizard_step')
          AND NOT EXISTS (SELECT 1 FROM "FunnelEvent" s
                          WHERE s."sessionId" = e."sessionId" AND s."type" = 'intake_submit')
        GROUP BY e."sessionId" ORDER BY fin DESC LIMIT 100`,
  ]);
  return { jours, totaux: totaux[0], pages, abandons };
}

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
  if (!ctx.env.DATABASE_URL) return json(503, { ok: false, error: "storage_unavailable" });
  const j = Number(new URL(ctx.request.url).searchParams.get("jours") || 30);
  const jours = Number.isFinite(j) ? Math.min(Math.max(Math.round(j), 1), 365) : 30;
  try {
    return json(200, { ok: true, ...(await synthese(neon(ctx.env.DATABASE_URL) as unknown as Sql, jours)) });
  } catch (e) {
    console.error(`[cc/funnel] lecture impossible (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" });
  }
}
