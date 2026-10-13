/**
 * Cloudflare Pages Function — GET /api/prix/materiaux?region=<code|ville>&codes=CIT-GO-008,…
 * Public, sans authentification, cache 1 h. Contrat :
 * docs/prix/contrat-fournisseurs-chiffrage.md §2. Ne crée jamais de table.
 */
import { lireFichesMarche, lirePrixManuels, reponsePrix, type DonneesPrix } from "../../_lib/prixMateriaux";
import type { Sql } from "../../_lib/cercles";

interface Env { DATABASE_URL?: string }

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  const url = new URL(ctx.request.url);
  const region = (url.searchParams.get("region") || "").slice(0, 60) || null;
  const codes = (url.searchParams.get("codes") || "").split(",").map((c) => c.trim().toUpperCase()).filter((c) => /^CIT-[A-Z]{2,3}-\d{3}$/.test(c)).slice(0, 300);
  const d: DonneesPrix = { fiches: null, fournisseurs: null, manuels: {} };
  if (ctx.env.DATABASE_URL) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    // Chaque lecture est indépendante : une table absente (SQL pas encore collé) n'empêche pas les autres.
    try { Object.assign(d, await lireFichesMarche(sql)); } catch (e) { console.error(`[prix/materiaux] marché indisponible (${(e as { code?: string })?.code || "sans code"})`); }
    try { d.manuels = await lirePrixManuels(sql); } catch { /* table "PrixReferenceManuel" absente : prix du référentiel */ }
  }
  return new Response(JSON.stringify(reponsePrix(d, region, codes.length ? codes : null)), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
