/**
 * GET /api/mon-dossier/<jeton> — le client ouvre son dossier par le lien signé
 * reçu à l'invitation. Lecture seule. Ce lien sert aussi à ouvrir la session
 * client (POST /api/client/acces/lien, lot 3a) : l'espace /mon-espace prend le relais.
 * Aucune coordonnée (ni du client, ni du cabinet, ni d'un tiers) n'est renvoyée :
 * le contact passe par la messagerie et les appels vidéo de CITURBAREA.
 * Vue partagée : functions/_lib/vueDossierClient.ts.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../_lib/adminSession";
import { lireJetonDossier, secretLien, type LienEnv, type Sql } from "../../_lib/dossierAdmin";
import { lireVueDossierClient } from "../../_lib/vueDossierClient";

const ENTETES = { "x-robots-tag": "noindex", "referrer-policy": "no-referrer" };

export async function onRequestGet(ctx: { params: { jeton?: string }; env: LienEnv & { DATABASE_URL?: string } }): Promise<Response> {
  const secret = secretLien(ctx.env);
  if (!ctx.env.DATABASE_URL || !secret) return json(503, { ok: false, error: "storage_unavailable" }, ENTETES);
  const dossierId = await lireJetonDossier(secret, String(ctx.params.jeton || ""));
  if (!dossierId) return json(404, { ok: false, error: "lien_invalide" }, ENTETES);
  try {
    const dossier = await lireVueDossierClient(neon(ctx.env.DATABASE_URL) as unknown as Sql, dossierId);
    if (!dossier) return json(404, { ok: false, error: "lien_invalide" }, ENTETES);
    return json(200, { ok: true, dossier }, ENTETES);
  } catch (e) {
    console.error(`[mon-dossier] lecture impossible (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" }, ENTETES);
  }
}
