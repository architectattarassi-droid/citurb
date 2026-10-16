/**
 * Un seul accès pour le client (parcours client du 16/10/2026) : depuis /mon-espace (session
 * cli_session), il ouvre l'espace projet de son dossier sans second lien.
 *   GET  /api/client/projets              espaces projet de ses dossiers
 *   POST /api/client/projets/<id>/ouvrir  pose la session de l'espace projet (cookie projet_session)
 *        pour son membre « client » de ce projet — réutilisé s'il existe, créé sinon (sans lien
 *        envoyé : l'accès passe par la session client). Les liens /projet/<jeton> déjà envoyés
 *        restent valables (même membre, même jeton).
 * Aucune coordonnée n'est copiée dans le membre créé (nom du compte seulement).
 */
import { DUREE_SESSION_S, ID_PROJET_RE, cookieSession, creerSession, nouvelId, secretSession, type EnvSession } from "./projets";
import { depotNeon, type Sql } from "./projetsNeon";
import { hacherJeton, nouveauJeton } from "./rdv";
import type { SessionClient } from "./clientSession";

export async function projetsDuClient(sql: Sql, s: SessionClient): Promise<Array<{ id: string; titre: string; dossierId: string }>> {
  if (!s.dossierIds.length) return [];
  const t = (await sql`SELECT to_regclass('public."Projet"') IS NOT NULL AS ok`)[0]?.ok;
  if (!t) return [];
  const r = await sql`SELECT "id", "titre", "dossierId" FROM "Projet" WHERE "dossierId" = ANY(${s.dossierIds}::text[]) ORDER BY "createdAt" ASC`;
  return r.map((x) => ({ id: String(x.id), titre: String(x.titre ?? ""), dossierId: String(x.dossierId) }));
}

export type Ouverture = { status: number; corps: Record<string, unknown>; cookie?: string };

export async function ouvrirProjetClient(sql: Sql, env: EnvSession, s: SessionClient, projetId: string, maintenant = new Date().toISOString()): Promise<Ouverture> {
  if (!ID_PROJET_RE.test(projetId)) return { status: 400, corps: { ok: false, error: "id_invalid" } };
  const secret = secretSession(env);
  if (!secret) return { status: 503, corps: { ok: false, error: "session_non_configuree" } };
  const projet = (await projetsDuClient(sql, s)).find((p) => p.id === projetId);
  if (!projet) return { status: 404, corps: { ok: false, error: "not_found" } };
  const depot = depotNeon(sql);
  const membres = await depot.membres(projetId);
  let m = membres.find((x) => x.role === "CLIENT" && x.actif);
  if (!m) {
    const u = (await sql`SELECT "username" FROM "User" WHERE "id" = ${s.clientId} LIMIT 1`)[0];
    m = {
      id: nouvelId("pm_"), projetId, role: "CLIENT", nom: String(u?.username || "Client").slice(0, 120), telephone: null, email: null, entreprise: null,
      jetonHash: await hacherJeton(nouveauJeton()), actif: true, invitePar: `client:${s.clientId}`, createdAt: maintenant, dernierAcces: null,
    };
    await depot.creerMembre(m);
    await depot.journaliser({ id: nouvelId("pev_"), projetId, auteur: `client:${s.clientId}`, action: "membre_client_cree_depuis_espace", cible: m.id, details: null, createdAt: maintenant });
  }
  await depot.toucherMembre(m.id, maintenant);
  const cookie = cookieSession(await creerSession(m.id, m.jetonHash, secret, Date.parse(maintenant)), DUREE_SESSION_S);
  return { status: 200, corps: { ok: true, projetId }, cookie };
}
