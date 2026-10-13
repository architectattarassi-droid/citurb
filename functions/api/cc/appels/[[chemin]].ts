/**
 * Cloudflare Pages Function — /api/cc/appels/* (back-office, protégé par ../_middleware.ts)
 *   GET  /api/cc/appels[?statut=]            toutes les demandes (supervision)
 *   POST /api/cc/appels                      le cabinet demande un appel (client d'un dossier, pro, membre de projet, client d'un RDV)
 *   GET  /api/cc/appels/<id>                 détail (coordonnées visibles du seul back-office)
 *   POST /api/cc/appels/<id>/repondre|visio  au nom du cabinet, s'il est participant
 *   POST /api/cc/appels/<id>/whatsapp        { participantId } → lien wa.me prérempli avec le lien personnel
 *   POST /api/cc/appels/rappels              envoie les rappels dus
 * Le cabinet ne reçoit un jeton de salle que s'il PARTICIPE à l'appel.
 */
import { neon } from "@neondatabase/serverless";
import type { Sql } from "../../../_lib/appelsDepot";
import { contexteNeon } from "../../../_lib/contexteNeon";
import { indisponible, rappels, repondre, routeur, segments, type EnvAppels } from "../../../_lib/appelsService";

export async function onRequest(ctx: { request: Request; env: EnvAppels; params: { chemin?: string | string[] }; data?: Record<string, unknown>; waitUntil?: (p: Promise<unknown>) => void }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    const c = contexteNeon(ctx.env, sql);
    const chemin = segments(ctx.params.chemin);
    // Pas de cron sur Pages : l'ouverture de la liste déclenche aussi les rappels dus.
    if (!chemin.length && ctx.request.method === "GET") ctx.waitUntil?.(rappels(c).catch(() => null));
    return repondre(await routeur(c, ctx.request, { genre: "admin", email: String(ctx.data?.adminEmail || "") }, chemin));
  } catch (e) {
    console.error(`[cc/appels] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return repondre(indisponible());
  }
}
