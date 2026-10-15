/**
 * Démarrage des phases (décisions du fondateur du 15/10/2026) :
 *   - une phase démarre après le paiement de son échéance du contrat : l'état vient de la
 *     session Devis & facturation (etatPaiementPhasesDossier, contrat-devis-facturation.md,
 *     « Interface pour la gestion de projet ») ; phase « bloquante » = « En attente de paiement »,
 *     déblocage motivé par l'admin via POST /api/cc/dossiers/<id>/facturation { action: "debloquer" } ;
 *     tables de facturation absentes → rien n'est bloqué ;
 *   - mise à jour du DEXE suite au permis : ouverte automatiquement à chaque révision des pièces
 *     d'autorisation (ou saisie par l'admin), journalisée, pièces DEXE déjà déposées « à reprendre ».
 */
import { journaliser, type Sql } from "./dossierAdmin";
import { etatPaiementPhasesDossier } from "./facturationDepot";
import type { PhasePaiement } from "../../apps/web/src/domain/honoraires/facturation";
import { lireMajDexe, ouvrirMajDexe, type Ecart } from "../../packages/contracts/src/gestion/majDexe";

export type { PhasePaiement };

/** État des paiements par phase P.., ou null (SQL de facturation absent ou illisible : rien ne bloque). */
export async function paiementsDossier(sql: Sql, dossierId: string, aujourdhui: string): Promise<PhasePaiement[] | null> {
  try { return await etatPaiementPhasesDossier(sql, dossierId, aujourdhui); } catch { return null; }
}
export const phaseBloquee = (p: PhasePaiement[] | null, phaseRef: string | null | undefined): boolean => !!phaseRef && !!p?.find((x) => x.phase === phaseRef)?.bloquante;
/** Date de démarrage réelle : paiement complet de l'échéance, sinon déblocage motivé. */
export const dateDemarrage = (x: PhasePaiement | undefined): string | null => x?.datePaiementComplet ?? (x?.deblocage?.le ? String(x.deblocage.le).slice(0, 10) : null);

const objet = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** Ouvre ou complète la mise à jour du DEXE suite au permis ; journal du dossier. */
export async function ouvrirMajDexeDossier(sql: Sql, dossierId: string, e: Ecart): Promise<void> {
  const d = (await sql`SELECT "payload" FROM "Dossier" WHERE "id" = ${dossierId} LIMIT 1`)[0];
  if (!d) return;
  const t = (await sql`SELECT to_regclass('public."DossierPiece"') IS NOT NULL AS p, to_regclass('public."DossierEvenement"') IS NOT NULL AS j`)[0] || {};
  const piecesDexe = t.p
    ? (await sql`SELECT "cle" FROM "DossierPiece" WHERE "dossierId" = ${dossierId} AND "cle" LIKE 'P05\\_%' AND "statut" IN ('DEPOSE', 'VALIDE')`).map((r) => String(r.cle))
    : [];
  const payload = objet(d.payload);
  const avant = lireMajDexe(payload);
  const majDexe = ouvrirMajDexe(avant, e, piecesDexe);
  await sql`UPDATE "Dossier" SET "payload" = ${JSON.stringify({ ...payload, gestion: { ...objet(payload.gestion), majDexe } })}::jsonb WHERE "id" = ${dossierId}`;
  if (t.j) await journaliser(sql, dossierId, e.par, avant?.ouverte ? "MAJ_DEXE_ECART" : "MAJ_DEXE_OUVERTE", { texte: e.texte, source: e.source, piecesAReprendre: majDexe.piecesAReprendre }, e.le);
}
