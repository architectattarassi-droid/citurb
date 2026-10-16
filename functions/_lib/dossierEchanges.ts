/**
 * Un seul endroit pour le dossier et ses échanges (demande du fondateur du 16/10/2026) :
 * rendez-vous visio, demandes d'appel vidéo et fils de messages du même client sont rattachés
 * au MÊME dossier et visibles dans la fiche (onglet Échanges) et sur la page de l'étape.
 *
 * Liens suivis : RendezVous.dossierId (posé à la création du RDV, ou ici pour les RDV anciens
 * du même compte / même téléphone) ; DemandeAppel et Conversation au contexte « dossier »
 * (objetId = dossier, ou « dossier:étape ») ou « rdv » (objetId = un RDV du dossier), ou dont
 * le client du dossier est participant (clé usr:<id>).
 * Dédoublonnage : un RDV orphelin n'est rattaché que si le client n'a qu'UN dossier ouvert.
 * Aucune coordonnée renvoyée : identifiants, dates, statuts, sujets.
 */
import type { Sql } from "./dossierAdmin";

const s = (v: unknown) => (v == null || v === "" ? null : String(v));
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : s(v));
const neuf = (t: unknown) => String(t ?? "").replace(/\D/g, "").slice(-9);

async function tables(sql: Sql) {
  const r = (await sql`SELECT to_regclass('public."RendezVous"') IS NOT NULL AS r, to_regclass('public."DemandeAppel"') IS NOT NULL AS a,
    to_regclass('public."Conversation"') IS NOT NULL AS c`)[0] || {};
  return { rdv: !!r.r, appels: !!r.a, messages: !!r.c };
}

export interface Echanges {
  rendezVous: Array<{ id: string; debut: string | null; statut: string | null; objet: string | null; rattacheIci: boolean }>;
  appels: Array<{ id: string; contexte: string; objetId: string; statut: string; creneau: string | null; sujet: string | null; createdAt: string | null; etape: string | null }>;
  conversations: Array<{ id: string; contexte: string; objetId: string; statut: string; sujet: string | null; dernierMessageLe: string | null; etape: string | null }>;
}

/** Étape visée par un objetId « dossier:étape » (ou null). */
export const etapeDeLObjet = (objetId: string, dossierId: string) => (objetId.startsWith(`${dossierId}:`) ? objetId.slice(dossierId.length + 1) : null);

/** Échanges du dossier ; rattache au passage les RDV orphelins du même client (dossier ouvert unique). */
export async function echangesDuDossier(sql: Sql, dossierId: string): Promise<Echanges> {
  const d = (await sql`SELECT "ownerId", "clientTel" FROM "Dossier" WHERE "id" = ${dossierId} LIMIT 1`)[0];
  const vide: Echanges = { rendezVous: [], appels: [], conversations: [] };
  if (!d) return vide;
  const t = await tables(sql);
  const owner = s(d.ownerId), tel = neuf(d.clientTel);
  let rdvs: Record<string, unknown>[] = [];
  if (t.rdv) {
    // Dossiers ouverts du client : s'il n'y en a qu'un, ses RDV orphelins y sont rattachés.
    const ouverts = owner ? await sql`SELECT count(*)::int AS n FROM "Dossier" WHERE "ownerId" = ${owner} AND "archivedAt" IS NULL`.catch(() => [{ n: 2 }]) : [{ n: 2 }];
    if (owner && Number(ouverts[0]?.n) === 1) {
      await sql`UPDATE "RendezVous" SET "dossierId" = ${dossierId}, "userId" = COALESCE("userId", ${owner}), "updatedAt" = now()
        WHERE "dossierId" IS NULL AND ("userId" = ${owner} OR (${tel}::text <> '' AND right(regexp_replace("telephone", '[^0-9]', '', 'g'), 9) = ${tel}::text))`.catch(() => []);
    }
    rdvs = await sql`SELECT "id", "debut", "statut", "objet", "dossierId" FROM "RendezVous"
      WHERE "dossierId" = ${dossierId} OR (${owner}::text IS NOT NULL AND "userId" = ${owner}::text) ORDER BY "debut" ASC LIMIT 50`;
  }
  const rdvIds = rdvs.map((r) => String(r.id));
  const cleClient = owner ? `usr:${owner}` : "";
  const appels = t.appels ? await sql`SELECT "id", "contexte", "objetId", "statut", "creneauRetenu", "createdAt", "donnees"->>'sujet' AS "sujet" FROM "DemandeAppel"
      WHERE ("contexte" = 'dossier' AND ("objetId" = ${dossierId} OR "objetId" LIKE ${`${dossierId}:%`}))
         OR ("contexte" = 'rdv' AND "objetId" = ANY(${rdvIds}::text[]))
         OR (${cleClient} <> '' AND ${cleClient} = ANY("cles") AND "contexte" IN ('dossier', 'rdv'))
      ORDER BY "createdAt" DESC LIMIT 100` : [];
  const fils = t.messages ? await sql`SELECT "id", "contexte", "objetId", "statut", "dernierMessageLe", "donnees"->>'sujet' AS "sujet" FROM "Conversation"
      WHERE ("contexte" = 'dossier' AND ("objetId" = ${dossierId} OR "objetId" LIKE ${`${dossierId}:%`}))
         OR ("contexte" = 'rdv' AND "objetId" = ANY(${rdvIds}::text[]))
      ORDER BY "dernierMessageLe" DESC LIMIT 100` : [];
  return {
    rendezVous: rdvs.map((r) => ({ id: String(r.id), debut: iso(r.debut), statut: s(r.statut), objet: s(r.objet), rattacheIci: s(r.dossierId) === dossierId })),
    appels: appels.map((a) => ({ id: String(a.id), contexte: String(a.contexte), objetId: String(a.objetId), statut: String(a.statut), creneau: iso(a.creneauRetenu), sujet: s(a.sujet), createdAt: iso(a.createdAt), etape: etapeDeLObjet(String(a.objetId), dossierId) })),
    conversations: fils.map((c) => ({ id: String(c.id), contexte: String(c.contexte), objetId: String(c.objetId), statut: String(c.statut), sujet: s(c.sujet), dernierMessageLe: iso(c.dernierMessageLe), etape: etapeDeLObjet(String(c.objetId), dossierId) })),
  };
}
