/**
 * Cloudflare Pages Function — /api/depot/* (dépôt de documents commun)
 *   GET  /api/depot/f/<id>?e=&s=[&taille=vignette]   lecture d'un fichier par lien signé (15 min)
 *   …    /api/depot/…                                titulaire d'un lien personnel (en-tête x-acces :
 *        messages:<jeton> | appel:<jeton> | rdv:<jeton>) — mêmes routes que les autres portes
 * Contrat : docs/architecture/contrat-depot-fichiers.md ; tables : docs/sql/documents-neon.sql.
 */
import { neon } from "@neondatabase/serverless";
import type { Sql } from "../../_lib/depotStockage";
import { acteurParLien, contexteDepotNeon, type EnvDepotComplet } from "../../_lib/depotNeon";
import { indisponible, repondre, routeurDepot, segments, servirFichier } from "../../_lib/depotService";

export async function onRequest(ctx: { request: Request; env: EnvDepotComplet; params: { chemin?: string | string[] }; waitUntil?: (p: Promise<unknown>) => void }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    const c = contexteDepotNeon(ctx.env, sql, ctx.waitUntil?.bind(ctx));
    const chemin = segments(ctx.params.chemin);
    if (chemin[0] === "f" && chemin.length === 2 && (ctx.request.method === "GET" || ctx.request.method === "HEAD")) return await servirFichier(c, ctx.request, chemin[1]);
    const a = await acteurParLien(sql, ctx.request.headers.get("x-acces"));
    if (!a) return repondre({ status: 401, json: { ok: false, error: "lien_invalide" } });
    return repondre(await routeurDepot(c, ctx.request, a, chemin));
  } catch (e) {
    console.error(`[depot] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return repondre(indisponible());
  }
}
