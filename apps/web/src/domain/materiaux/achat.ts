/**
 * Achat en ligne (PHASE 2, désactivée) — modèle de données et cycle de vie
 * d'une commande de matériaux. Rien ici n'encaisse : l'activation dépend d'un
 * contrat fournisseur, d'un compte marchand (CMI ou établissement de paiement
 * agréé), de CGV et d'un séquestre (voir docs/achat-en-ligne.md).
 * Tables SQL correspondantes : docs/prix/sql/achat-en-ligne.sql (à ne créer
 * qu'au lancement).
 */

export type StatutCommande =
  | "BROUILLON"        // panier converti, prix non confirmés
  | "DEVIS_CONFIRME"   // le fournisseur a confirmé prix, stock, frais et délai
  | "PAIEMENT_EN_COURS"
  | "PAYEE"            // fonds reçus par l'établissement de paiement agréé (jamais par la société pour compte de tiers)
  | "EN_PREPARATION"
  | "EXPEDIEE"
  | "LIVREE"           // bon de livraison signé par le client
  | "CLOTUREE"         // fonds reversés au fournisseur, commission prélevée
  | "LITIGE"
  | "ANNULEE"
  | "REMBOURSEE";

export const TRANSITIONS: Record<StatutCommande, StatutCommande[]> = {
  BROUILLON: ["DEVIS_CONFIRME", "ANNULEE"],
  DEVIS_CONFIRME: ["PAIEMENT_EN_COURS", "ANNULEE"],
  PAIEMENT_EN_COURS: ["PAYEE", "DEVIS_CONFIRME", "ANNULEE"],
  PAYEE: ["EN_PREPARATION", "REMBOURSEE", "LITIGE"],
  EN_PREPARATION: ["EXPEDIEE", "LITIGE", "REMBOURSEE"],
  EXPEDIEE: ["LIVREE", "LITIGE"],
  LIVREE: ["CLOTUREE", "LITIGE"],
  LITIGE: ["CLOTUREE", "REMBOURSEE"],
  CLOTUREE: [],
  ANNULEE: [],
  REMBOURSEE: [],
};

export const peutPasser = (de: StatutCommande, vers: StatutCommande) => TRANSITIONS[de].includes(vers);

export interface LigneCommande {
  id: string;
  commandeId: string;
  materiauCode: string;
  libelle: string;
  uniteVente: string;
  quantite: number;
  /** Prix unitaire HT confirmé par le fournisseur (unité de vente). */
  prixUnitaireHT: number;
  tvaPct: number;
  totalHT: number;
  totalTTC: number;
}

export interface Commande {
  id: string;
  reference: string;           // CMD-2026-000123, affichée au client
  statut: StatutCommande;
  creeLe: string;
  majLe: string;
  /** Lead d'origine (demande de prix) et demande de prix éventuelle. */
  leadId: string | null;
  demandePrixId: string | null;
  clientNom: string;
  clientTelephone: string;
  clientEmail: string | null;
  fournisseurId: string;
  villeLivraison: string;
  adresseLivraison: string;
  creneauLivraison: string | null;
  lignes: LigneCommande[];
  fraisLivraisonHT: number;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  /** Commission CITURBAREA (payée par le fournisseur, 3-5 %, modèle 3,5 %), en % du total HT marchandises hors livraison. */
  commissionPct: number;
  commissionHT: number;
  paiement: { prestataire: "CMI" | "ETABLISSEMENT_PAIEMENT" | null; transactionId: string | null; payeLe: string | null };
  livraison: { transporteur: string | null; suivi: string | null; livreLe: string | null; preuve: string | null };
  evenements: { at: string; statut: StatutCommande; auteur: string; note?: string }[];
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Totaux d'une commande (TVA ligne à ligne ; livraison à 20 %). */
export function totaux(lignes: Pick<LigneCommande, "quantite" | "prixUnitaireHT" | "tvaPct">[], fraisLivraisonHT: number, commissionPct: number) {
  const marchandisesHT = r2(lignes.reduce((a, l) => a + l.quantite * l.prixUnitaireHT, 0));
  const tva = r2(lignes.reduce((a, l) => a + (l.quantite * l.prixUnitaireHT * l.tvaPct) / 100, 0) + fraisLivraisonHT * 0.2);
  const totalHT = r2(marchandisesHT + fraisLivraisonHT);
  return { marchandisesHT, totalHT, totalTVA: tva, totalTTC: r2(totalHT + tva), commissionHT: r2((marchandisesHT * commissionPct) / 100) };
}
