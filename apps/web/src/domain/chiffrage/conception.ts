/**
 * Formules de conception (honoraires d'architecte et de BET) proposées au client :
 *   - PLAN_TYPE : plan type au forfait (Pack Plan Type, domain/p1/pack-recommendation.service.ts :
 *     19 999 DH ; × 1,1 au-delà de 200 m², × 1,2 au-delà de 300 m² ; × 1,3 en immeuble) ;
 *   - ESSENTIEL / AVANCE / COMPLET : plan personnalisé, packs P1 (domain/p1/quote.engine.ts) :
 *     architecte 5 % des travaux × 0,20 / 0,40 / 1,00 ; BET 2 % × 0,20 / 0,55 / 1,00.
 *     Seul COMPLET comprend le suivi de chantier.
 * BET du plan type : ratio de l'Essentiel (hypothèse : adaptation structure du plan type).
 */
export type FormuleConception = "PLAN_TYPE" | "ESSENTIEL" | "AVANCE" | "COMPLET";

export const FORMULES_CONCEPTION: Record<FormuleConception, { libelle: string; description: string; suivi: boolean }> = {
  PLAN_TYPE: { libelle: "Plan type", description: "Plan d'architecte existant adapté à votre terrain, dossier de permis, au forfait", suivi: false },
  ESSENTIEL: { libelle: "Plan personnalisé — Essentiel", description: "Conception sur mesure jusqu'au permis de construire", suivi: false },
  AVANCE: { libelle: "Plan personnalisé — Avancé", description: "Sur mesure + plans d'exécution pour consulter les entreprises", suivi: false },
  COMPLET: { libelle: "Plan personnalisé — Complet", description: "Sur mesure, exécution et suivi de chantier jusqu'à la réception", suivi: true },
};

const ARCHI = 0.05;
const BET = 0.02;
const RATIO_ARCHI: Record<Exclude<FormuleConception, "PLAN_TYPE">, number> = { ESSENTIEL: 0.2, AVANCE: 0.4, COMPLET: 1 };
const RATIO_BET: Record<FormuleConception, number> = { PLAN_TYPE: 0.2, ESSENTIEL: 0.2, AVANCE: 0.55, COMPLET: 1 };
const FORFAIT_PLAN_TYPE = 19999;

/** Honoraires HT d'architecte et de BET pour une formule. */
export function honorairesConception(f: FormuleConception, travauxHT: number, surface: number, collectif: boolean): { architecte: number; bet: number } {
  const architecte = f === "PLAN_TYPE"
    ? FORFAIT_PLAN_TYPE * (surface > 300 ? 1.2 : surface > 200 ? 1.1 : 1) * (collectif ? 1.3 : 1)
    : travauxHT * ARCHI * RATIO_ARCHI[f];
  return { architecte, bet: travauxHT * BET * RATIO_BET[f] };
}
