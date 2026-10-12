/**
 * Porte 4 — Analyse foncière : packs et devis calculés dans le navigateur.
 *
 * Reprend exactement apps/api/src/tomes/tome-4/p4/pricing.service.ts (GET
 * /p4/packs, POST /p4/quote), l'API étant éteinte en production :
 *   BASIQUE 0,3 % · MOYEN 0,6 % · RENTABILITÉ 1 % du prix de vente du foncier,
 *   plancher 3 000 DH HT, TVA 20 %.
 */

export type P4Pack = "BASIQUE" | "MOYEN" | "RENTABILITE";

export const P4_PACK_CODES: P4Pack[] = ["BASIQUE", "MOYEN", "RENTABILITE"];

export const P4_PACK_RATES: Record<P4Pack, number> = {
  BASIQUE: 0.003,
  MOYEN: 0.006,
  RENTABILITE: 0.01,
};

export const P4_FLOOR_HT = 3000;
export const P4_TVA_RATE = 0.2;

type PackDef = { label: string; shortDesc: string; deliveryDays: number; deliverables: string[] };

const PACK_DEFINITIONS: Record<P4Pack, PackDef> = {
  BASIQUE: {
    label: "Analyse foncière BASIQUE",
    shortDesc: "Vérification urbanistique : zonage, COS, CES, hauteurs, servitudes",
    deliveryDays: 7,
    deliverables: [
      "Note de renseignement urbanistique (zonage, plan d'aménagement applicable)",
      "Coefficients d'occupation (COS) et d'emprise au sol (CES) admissibles",
      "Hauteurs maximales autorisées et nombre de niveaux",
      "Servitudes urbanistiques (recul, prospect…)",
      "Restrictions environnementales ou patrimoniales applicables",
      "Rapport PDF (10-15 pages)",
    ],
  },
  MOYEN: {
    label: "Analyse foncière MOYEN",
    shortDesc: "BASIQUE + analyse juridique du titre foncier (charges, hypothèques, mitoyennetés)",
    deliveryDays: 12,
    deliverables: [
      "Tout le contenu du pack BASIQUE",
      "Vérification juridique du titre foncier",
      "État des charges réelles (hypothèques, privilèges)",
      "Mitoyennetés et servitudes inscrites",
      "Audit des actes antérieurs (vente, donation, succession)",
      "Avis sur le risque juridique",
      "Rapport PDF (20-30 pages)",
    ],
  },
  RENTABILITE: {
    label: "Analyse foncière RENTABILITÉ",
    shortDesc: "MOYEN + scénario de rentabilité avec prix de vente prévisionnels des unités",
    deliveryDays: 18,
    deliverables: [
      "Tout le contenu du pack MOYEN",
      "Étude de marché immobilier comparée (prix au m² de la zone)",
      "Scénarios de programmation (typologies, densités)",
      "Prix de vente prévisionnels par unité (3 hypothèses)",
      "Marge promoteur (coût total / chiffre d'affaires prévisionnel)",
      "Sensibilité prix / délais / coûts",
      "Recommandation Go / No-Go",
      "Rapport PDF (40-60 pages) et tableaux Excel",
    ],
  },
};

export type P4PackInfo = PackDef & { code: P4Pack; rate: number; ratePct: string };

const pct = (rate: number) => `${(rate * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;

/** Les 3 packs (remplace GET /p4/packs). */
export function listP4Packs(): P4PackInfo[] {
  return P4_PACK_CODES.map(code => ({ code, rate: P4_PACK_RATES[code], ratePct: pct(P4_PACK_RATES[code]), ...PACK_DEFINITIONS[code] }));
}

export type P4Quote = {
  ok: true;
  currency: "MAD";
  source: "local";
  meta: { pack: P4Pack; packLabel: string; rate: number; ratePct: string; deliveryDays: number };
  base: { prixVenteFoncierDH: number; rate: number; floorHT: number; flooredApplied: boolean };
  deliverables: string[];
  amounts: { computedHT: number; totalHT: number; tvaRate: number; tva: number; totalTTC: number };
  payment: { modalities: string; download: string };
  notes: string[];
};

export class ErreurDevisP4 extends Error {}

export function computeP4Quote(input: { pack: P4Pack; prixVenteFoncierDH: number }): P4Quote {
  const def = PACK_DEFINITIONS[input.pack];
  if (!def) throw new ErreurDevisP4(`Pack inconnu : ${input.pack}`);
  const prix = Number(input.prixVenteFoncierDH);
  if (!Number.isFinite(prix) || prix <= 0) throw new ErreurDevisP4("Prix de vente du foncier invalide.");
  const rate = P4_PACK_RATES[input.pack];
  const computedHT = Math.round(prix * rate);
  const totalHT = Math.max(computedHT, P4_FLOOR_HT);
  const tva = Math.round(totalHT * P4_TVA_RATE);
  const flooredApplied = computedHT < P4_FLOOR_HT;
  return {
    ok: true,
    currency: "MAD",
    source: "local",
    meta: { pack: input.pack, packLabel: def.label, rate, ratePct: pct(rate), deliveryDays: def.deliveryDays },
    base: { prixVenteFoncierDH: prix, rate, floorHT: P4_FLOOR_HT, flooredApplied },
    deliverables: def.deliverables,
    amounts: { computedHT, totalHT, tvaRate: P4_TVA_RATE, tva, totalTTC: totalHT + tva },
    payment: {
      modalities: "Après validation de votre demande, nous vous envoyons la proposition et le lien de paiement. L'analyse démarre à réception du paiement.",
      download: "Le rapport est livré en PDF, marqué « Rapport exclusif CITURBAREA ».",
    },
    notes: [
      flooredApplied
        ? `Minimum de ${P4_FLOOR_HT.toLocaleString("fr-FR")} DH HT appliqué (calcul brut : ${computedHT.toLocaleString("fr-FR")} DH).`
        : "Honoraires calculés en pourcentage du prix de vente du foncier déclaré.",
    ],
  };
}

/** Montant HT de chaque pack pour un prix donné (comparatif des 3 packs). */
export function honorairesHTParPack(prixVenteFoncierDH: number): Record<P4Pack, number> | null {
  const prix = Number(prixVenteFoncierDH);
  if (!Number.isFinite(prix) || prix <= 0) return null;
  const out = {} as Record<P4Pack, number>;
  for (const code of P4_PACK_CODES) out[code] = Math.max(Math.round(prix * P4_PACK_RATES[code]), P4_FLOOR_HT);
  return out;
}
