/**
 * Cloudflare Pages Function — /api/appels/* (appels vidéo sur demande, porte publique)
 *   POST /api/appels                         demande d'un visiteur (fiche pro, annuaire, cabinet) : nom + e-mail ou téléphone
 *   GET  /api/appels/lien/<jeton>            la demande vue par le titulaire du lien personnel
 *   POST /api/appels/lien/<jeton>/repondre   { action: accepter|contre|refuser|annuler, creneaux? }
 *   POST /api/appels/lien/<jeton>/visio      jeton de salle (confirmée, dans la fenêtre, participant seulement)
 *   POST /api/appels/lien/<jeton>/bloquer    ne plus recevoir de demandes de ce demandeur
 *   POST /api/appels/rappels                 rappels (en-tête x-cle-cron = APPELS_CRON_CLE)
 * Logique : functions/_lib/appelsService.ts ; tables : docs/sql/appels-video-neon.sql.
 */
import { neon } from "@neondatabase/serverless";
import type { Sql } from "../../_lib/appelsDepot";
import { contexteNeon } from "../../_lib/contexteNeon";
import { indisponible, repondre, routeur, segments, type EnvAppels } from "../../_lib/appelsService";

/** Filet par adresse IP (en mémoire, par isolat) : la vraie limite est en base. */
const passages = new Map<string, number[]>();
function accepter(cle: string, max: number, fenetreMs: number, maintenant = Date.now()): boolean {
  const l = (passages.get(cle) || []).filter((t) => maintenant - t < fenetreMs);
  if (l.length >= max) return false;
  l.push(maintenant);
  passages.set(cle, l);
  if (passages.size > 5000) passages.clear();
  return true;
}

export async function onRequest(ctx: { request: Request; env: EnvAppels; params: { chemin?: string | string[] } }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return repondre(indisponible());
  const ip = ctx.request.headers.get("cf-connecting-ip") || "local";
  const chemin = segments(ctx.params.chemin);
  const creation = !chemin.length && ctx.request.method === "POST";
  if (!accepter(`${creation ? "c" : "l"}:${ip}`, creation ? 6 : 120, creation ? 3600_000 : 600_000)) return repondre({ status: 429, json: { ok: false, error: "trop_de_requetes" } });
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    const c = contexteNeon(ctx.env, sql);
    return repondre(await routeur(c, ctx.request, null, chemin));
  } catch (e) {
    console.error(`[appels] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return repondre(indisponible());
  }
}
