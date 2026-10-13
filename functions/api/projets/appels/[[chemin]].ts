/**
 * Cloudflare Pages Function — /api/projets/appels/* (membre d'un projet : cookie projet_session,
 * Path=/api/projets ; route plus précise que ../[[chemin]].ts, qui n'est pas modifié)
 *   GET  …/appels                 mes demandes
 *   POST …/appels                 demander un appel (contexte chantier, objetId « <projetId>[:<jalon>] ») au cabinet ou à d'autres membres
 *   GET  …/appels/<id>, POST …/appels/<id>/repondre|visio|bloquer
 */
import { neon } from "@neondatabase/serverless";
import { depotAppelsNeon, type Sql as SqlAppels } from "../../../_lib/appelsDepot";
import { resolveurNeon } from "../../../_lib/appelsResolveur";
import { envoyeurResend, indisponible, repondre, routeur, segments, type EnvAppels } from "../../../_lib/appelsService";
import { membreConnecte, type EnvProjets } from "../../../_lib/projetsApi";
import { depotNeon, type Sql } from "../../../_lib/projetsNeon";

const LECTURE = new Set(["GET", "HEAD", "OPTIONS"]);

export async function onRequest(ctx: { request: Request; env: EnvAppels & EnvProjets; params: { chemin?: string | string[] } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  if (!LECTURE.has(ctx.request.method) && ctx.request.headers.get("origin") !== new URL(ctx.request.url).origin) {
    return repondre({ status: 403, json: { ok: false, error: "forbidden_origin" } });
  }
  try {
    const brut = neon(ctx.env.DATABASE_URL);
    const m = await membreConnecte({ req: ctx.request, env: ctx.env, depot: depotNeon(brut as unknown as Sql), maintenant: () => new Date().toISOString() });
    if (!m) return repondre({ status: 401, json: { ok: false, error: "non_connecte" } });
    const sql = brut as unknown as SqlAppels;
    const c = { depot: depotAppelsNeon(sql), resolveur: resolveurNeon(sql), env: ctx.env, maintenant: Date.now(), envoyer: envoyeurResend(ctx.env) };
    const chemin = segments(ctx.params.chemin);
    if (chemin[0] === "rappels") return repondre({ status: 404, json: { ok: false, error: "route_inconnue" } });
    return repondre(await routeur(c, ctx.request, { genre: "membre", membreId: m.id, projetId: m.projetId }, chemin));
  } catch (e) {
    console.error(`[projets/appels] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return repondre(indisponible());
  }
}
