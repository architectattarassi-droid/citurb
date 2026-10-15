/**
 * Émetteur de TOUS les devis et factures : CITURBAREA, porté par HSE DECO
 * (décision du fondateur, 15/10/2026 — « la facturation, tout passera par
 * CITURBAREA, même pour les frais de cabinet »). Écart avec la spec v1 §5.1,
 * qui plaçait le cabinet en en-tête : voir docs/architecture/contrat-devis-facturation.md.
 *
 * Le cabinet (ARC-BATI ou autre) figure seulement comme architecte du projet
 * (nom, architecte, n° d'Ordre), sans téléphone, e-mail ni adresse ; il sert
 * aussi à la répartition interne des honoraires.
 *
 * Identifiants légaux de HSE DECO : à fournir par le fondateur. Vides → la
 * facture affiche « à compléter » ; aucun identifiant n'est inventé.
 * Coordonnées : uniquement celles de config/contact.ts.
 */
import { CONTACT } from "../../config/contact";

export interface Emetteur {
  marque: string;
  raisonSociale: string;
  formeJuridique: string | null;
  siege: string | null;
  ice: string | null;
  identifiantFiscal: string | null;
  rc: string | null;
  patente: string | null;
  cnss: string | null;
  /** Coordonnées bancaires de HSE DECO pour les virements (à fournir par le fondateur). */
  rib: string | null;
  telephone: string;
  whatsapp: string;
  site: string;
}

export const EMETTEUR: Emetteur = {
  marque: "CITURBAREA",
  raisonSociale: "HSE DECO",
  formeJuridique: null,
  siege: null,
  ice: null,
  identifiantFiscal: null,
  rc: null,
  patente: null,
  cnss: null,
  rib: null,
  telephone: CONTACT.telAffiche,
  whatsapp: CONTACT.whatsapp,
  site: "www.citurbarea.com",
};

/** Mentions légales obligatoires sur facture encore vides (spec §5.2). */
export function mentionsEmetteurManquantes(e: Emetteur = EMETTEUR): string[] {
  return ([["ICE", e.ice], ["IF", e.identifiantFiscal], ["RC", e.rc], ["Patente", e.patente], ["Siège social", e.siege]] as const)
    .filter(([, v]) => !v).map(([k]) => k);
}

/** Bandeau de pied de devis (spec §5.4, émetteur CITURBAREA). */
export const BANDEAU_SUIVI = [
  "SUIVEZ VOTRE PROJET EN LIGNE",
  "CITURBAREA met à votre disposition un espace client sur www.citurbarea.com : avancement du dossier administratif, plans, pièces justificatives et échanges avec l'architecte, consultables à tout moment.",
  "Créez votre compte client sur www.citurbarea.com, ou demandez-nous une invitation par WhatsApp.",
];
