/**
 * Cloudflare Pages Function — /api/projets/* (espace projet des membres invités).
 *   POST /api/projets/acces            { jeton } → cookie de session signé (HttpOnly, SameSite=Lax)
 *   POST /api/projets/sortie           efface le cookie
 *   GET  /api/projets/moi              membre connecté + son projet
 *   …    /api/projets/<id>/…           tableau de bord, jalons, messages, fichiers, documents, visio
 * Logique : functions/_lib/projetsApi.ts. Un membre n'accède qu'à son projet.
 *
 * Variables : DATABASE_URL, PROJET_SESSION_SECRET (≥ 32 caractères ; à défaut ADMIN_SESSION_SECRET),
 * binding R2 FICHIERS (fichiers), JAAS_* (visio), FICHIERS_MAX_*_MO (facultatif).
 */
import { neon } from "@neondatabase/serverless";
import { indisponible, routeurMembre, segments, type EnvProjets } from "../../_lib/projetsApi";
import { depotNeon, type Sql } from "../../_lib/projetsNeon";

export async function onRequest(ctx: { request: Request; env: EnvProjets; params: { chemin?: string | string[] } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return indisponible();
  try {
    const depot = depotNeon(neon(ctx.env.DATABASE_URL) as unknown as Sql);
    return await routeurMembre({ req: ctx.request, env: ctx.env, depot, maintenant: () => new Date().toISOString() }, segments(ctx.params.chemin));
  } catch (e) {
    console.error(`[projets] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return indisponible();
  }
}
