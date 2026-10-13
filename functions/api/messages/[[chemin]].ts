/**
 * Cloudflare Pages Function — /api/messages/* (messagerie, porte publique)
 *   POST /api/messages                          premier message d'un visiteur (nom + e-mail ou téléphone, consentement)
 *   GET  /api/messages/boite/<jeton signé>      tous les fils du titulaire (visiteur / client sans compte)
 *   GET  /api/messages/lien/<jeton>             un fil (lien personnel) — marque comme lu
 *   POST /api/messages/lien/<jeton>/messages    { texte } (coordonnées masquées)
 *   POST /api/messages/lien/<jeton>/appel       demander un appel vidéo aux autres participants du fil
 *   POST /api/messages/lien/<jeton>/signaler    { motif } → prévient le cabinet
 *   POST /api/messages/lien/<jeton>/bloquer     ne plus recevoir de messages ni d'appels de ces personnes
 * Logique : functions/_lib/messagerieService.ts ; tables : docs/sql/messagerie-neon.sql.
 */
import { neon } from "@neondatabase/serverless";
import type { Sql } from "../../_lib/appelsDepot";
import type { EnvAppels } from "../../_lib/appelsService";
import { contexteNeon } from "../../_lib/contexteNeon";
import { indisponible, repondre, routeurMessages, segments } from "../../_lib/messagerieService";

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
  const ecriture = ctx.request.method === "POST";
  if (!accepter(`${ecriture ? "e" : "l"}:${ip}`, ecriture ? 40 : 240, 600_000)) return repondre({ status: 429, json: { ok: false, error: "trop_de_requetes" } });
  try {
    const c = contexteNeon(ctx.env, neon(ctx.env.DATABASE_URL) as unknown as Sql);
    return repondre(await routeurMessages(c, ctx.request, null, chemin));
  } catch (e) {
    console.error(`[messages] erreur (${(e as { code?: string })?.code || "sans code"})`);
    return repondre(indisponible());
  }
}
