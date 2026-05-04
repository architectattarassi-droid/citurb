import { Injectable } from "@nestjs/common";

/**
 * P5 Pricing Service — Rapports d'expertise et études (livrable one-shot)
 *
 * Doctrine P5: le porteur achète un rapport final standalone, sans engagement
 * de mission continue (différent de P1/P2/P3 qui pilotent un projet sur la durée).
 *
 * Tarifs forfaitaires par type de rapport, modulables par:
 *  - délai (express +50%, standard, économique -10%)
 *  - surface du bien (slot 0-200m² / 200-500m² / 500m²+ → coefficient)
 *
 * NB: tarifs par défaut documentés ici, à valider et ajuster par admin
 *     dans une v2 (config via env ou DB).
 */

export type P5ReportType =
  | "ESTIMATION_VENALE"
  | "CONFORMITE_URBANISTIQUE"
  | "RISQUE_TECHNIQUE"
  | "EXPERTISE_BATI";

export type P5DelayMode = "EXPRESS" | "STANDARD" | "ECONOMIQUE";
export type P5SurfaceSlot = "S_0_200" | "S_200_500" | "S_500_PLUS";

export type P5QuoteInput = {
  reportType: P5ReportType;
  delayMode?: P5DelayMode;
  surfaceSlot?: P5SurfaceSlot;
  surfaceM2?: number; // optionnel, dérive surfaceSlot si fourni
};

type ReportDef = {
  label: string;
  shortDesc: string;
  baseHT: number;
  deliveryDays: number; // standard
  deliverables: string[];
};

const REPORT_DEFINITIONS: Record<P5ReportType, ReportDef> = {
  ESTIMATION_VENALE: {
    label: "Estimation de valeur vénale",
    shortDesc: "Avis de valeur immobilière justifié et opposable (banque, succession, vente)",
    baseHT: 4500,
    deliveryDays: 10,
    deliverables: [
      "Visite et relevé du bien",
      "Étude de marché comparée (3 références minimum)",
      "Note d'expertise méthodologique",
      "Estimation de valeur fondée (fourchette + valeur centrale)",
      "Rapport PDF signé (15-25 pages)",
    ],
  },
  CONFORMITE_URBANISTIQUE: {
    label: "Conformité urbanistique",
    shortDesc: "Vérification de la conformité du bâti aux règles d'urbanisme et au permis",
    baseHT: 3500,
    deliveryDays: 12,
    deliverables: [
      "Analyse du titre foncier et note de renseignement urbanistique",
      "Vérification COS/CES/hauteur/recul/façades",
      "Comparaison plans autorisés vs réalisé",
      "Identification des écarts et infractions",
      "Rapport PDF avec recommandations de régularisation",
    ],
  },
  RISQUE_TECHNIQUE: {
    label: "Audit de risque (sismique, inondation, sols)",
    shortDesc: "Évaluation des risques naturels et géotechniques affectant le bien",
    baseHT: 5500,
    deliveryDays: 15,
    deliverables: [
      "Étude des aléas (sismique, inondation, glissement)",
      "Consultation des cartes officielles et zonage",
      "Visite et observations terrain",
      "Note de vulnérabilité du bâti",
      "Rapport PDF avec mesures de mitigation",
    ],
  },
  EXPERTISE_BATI: {
    label: "Expertise technique du bâti",
    shortDesc: "État technique complet (vices apparents/cachés, devis travaux à prévoir)",
    baseHT: 4000,
    deliveryDays: 12,
    deliverables: [
      "Diagnostic gros œuvre + second œuvre + équipements techniques",
      "Identification des pathologies (fissures, étanchéité, structure)",
      "Estimation chiffrée des travaux à prévoir",
      "Photos référencées + plans annotés",
      "Rapport PDF expert (20-40 pages)",
    ],
  },
};

const DELAY_COEFFICIENT: Record<P5DelayMode, number> = {
  EXPRESS: 1.5,    // +50% pour délai 5 jours
  STANDARD: 1.0,
  ECONOMIQUE: 0.9, // -10% pour délai 30 jours
};
const DELAY_DAYS: Record<P5DelayMode, number> = {
  EXPRESS: 5,
  STANDARD: 0,    // = baseDeliveryDays
  ECONOMIQUE: 30,
};

const SURFACE_COEFFICIENT: Record<P5SurfaceSlot, number> = {
  S_0_200: 1.0,
  S_200_500: 1.3,
  S_500_PLUS: 1.6,
};

function deriveSurfaceSlot(surfaceM2?: number): P5SurfaceSlot {
  if (surfaceM2 == null || !Number.isFinite(surfaceM2)) return "S_0_200";
  if (surfaceM2 <= 200) return "S_0_200";
  if (surfaceM2 <= 500) return "S_200_500";
  return "S_500_PLUS";
}

@Injectable()
export class P5PricingService {
  listReports() {
    return Object.entries(REPORT_DEFINITIONS).map(([code, def]) => ({
      code: code as P5ReportType,
      ...def,
    }));
  }

  computeQuote(input: P5QuoteInput) {
    const def = REPORT_DEFINITIONS[input.reportType];
    if (!def) throw new Error(`Type de rapport inconnu: ${input.reportType}`);
    const delayMode: P5DelayMode = input.delayMode ?? "STANDARD";
    const surfaceSlot: P5SurfaceSlot = input.surfaceSlot ?? deriveSurfaceSlot(input.surfaceM2);

    const surfaceCoef = SURFACE_COEFFICIENT[surfaceSlot];
    const delayCoef = DELAY_COEFFICIENT[delayMode];
    const totalHT = Math.round(def.baseHT * surfaceCoef * delayCoef);
    const tva = Math.round(totalHT * 0.2);
    const totalTTC = totalHT + tva;
    const deliveryDays = delayMode === "STANDARD"
      ? def.deliveryDays
      : DELAY_DAYS[delayMode];

    const surfaceLabels: Record<P5SurfaceSlot, string> = {
      S_0_200: "≤ 200 m²",
      S_200_500: "200 – 500 m²",
      S_500_PLUS: "≥ 500 m²",
    };
    const delayLabels: Record<P5DelayMode, string> = {
      EXPRESS: `Express — ${DELAY_DAYS.EXPRESS} jours ouvrables`,
      STANDARD: `Standard — ${def.deliveryDays} jours ouvrables`,
      ECONOMIQUE: `Économique — ${DELAY_DAYS.ECONOMIQUE} jours ouvrables`,
    };

    return {
      ok: true as const,
      currency: "MAD" as const,
      meta: {
        reportType: input.reportType,
        reportLabel: def.label,
        delayMode,
        delayLabel: delayLabels[delayMode],
        deliveryDays,
        surfaceSlot,
        surfaceLabel: surfaceLabels[surfaceSlot],
      },
      base: {
        baseHT: def.baseHT,
        surfaceCoefficient: surfaceCoef,
        delayCoefficient: delayCoef,
      },
      deliverables: def.deliverables,
      amounts: {
        totalHT,
        tvaRate: 0.2,
        tva,
        totalTTC,
      },
      payment: {
        modalities: "Paiement intégral à la commande, avant lancement de la mission. Rapport remis à réception du paiement.",
      },
      notes: [
        "Tarifs forfaitaires hors déplacements exceptionnels (>50 km du cabinet, facturés en sus).",
        "Le rapport est livré sous format PDF signé numériquement par l'expert.",
        "Délais en jours ouvrables, à compter de la réception du paiement et des documents demandés au client.",
        "Aucune mission de suivi inclus — pour un accompagnement projet voir P1/P2/P3.",
      ],
    };
  }
}
