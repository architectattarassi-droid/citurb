/**
 * Cloudflare Pages Function — /api/cercles/espace/appels/* (pro connecté : cookie frn_session,
 * vérifié par ../_middleware.ts qui pose ctx.data.fournisseurId et contrôle l'Origin des POST)
 *   GET  …/appels                 mes demandes (reçues et envoyées)
 *   POST …/appels                 demander un appel au cabinet ou à un autre pro (par son slug public)
 *   GET  …/appels/<id>            détail
 *   POST …/appels/<id>/repondre   accepter / proposer un autre créneau / refuser / annuler
 *   POST …/appels/<id>/visio      jeton de salle (confirmée, dans la fenêtre)
 *   POST …/appels/<id>/bloquer    ne plus recevoir de demandes de ce demandeur
 */
import { neon } from "@neondatabase/serverless";
import { depotAppelsNeon, type Sql } from "../../../../_lib/appelsDepot";
import { resolveurNeon } from "../../../../_lib/appelsResolveur";
import { envoyeurResend, indisponible, rappels, repondre, routeur, segments, type EnvAppels } from "../../../../_lib/appelsService";

export async function onRequest(ctx: { request: Request; env: EnvAppels; params: { chemin?: string | string[] }; data?: Record<string, unknown>; waitUntil?: (p: Promise<unknown>) => void }): Promise<Response> {
  const fournisseurId = String(ctx.data?.fournisseurId || "");
  if (!fournisseurId) return repondre({ status: 401, json: { ok: false, error: "unauthenticated" } });
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    const c = { depot: depotAppelsNeon(sql), resolveur: resolveurNeon(sql), env: ctx.env, maintenant: Date.now(), envoyer: envoyeurResend(ctx.env) };
    const chemin = segments(ctx.params.chemin);
    if (chemin[0] === "rappels") return repondre({ status: 404, json: { ok: false, error: "route_inconnue" } });
    if (!chemin.length && ctx.request.method === "GET") ctx.waitUntil?.(rappels(c).catch(() => null));
    return repondre(await routeur(c, ctx.request, { genre: "pro", fournisseurId }, chemin));
  } catch (e) {
    console.error(`[cercles/appels] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return repondre(indisponible());
  }
}
