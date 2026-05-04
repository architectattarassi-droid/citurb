import { Injectable } from "@nestjs/common";

/**
 * P4 Pricing Service — Analyse foncière (3 packs)
 *
 * Doctrine P4: rapport d'analyse foncière complète pour investisseur ou propriétaire.
 *  - Téléchargement permis APRÈS paiement
 *  - PDF watermarké "Rapport exclusif CITURBAREA — utilisable sur autorisation écrite"
 *
 * Pricing: 1% du prix de vente du foncier (target / acquisition cost), réparti
 * en 3 packs selon le niveau d'analyse:
 *   - BASIQUE        = 0.30% (analyse urbanistique seule)
 *   - MOYEN          = 0.60% (urbanistique + juridique)
 *   - RENTABILITE    = 1.00% (urbanistique + juridique + scénario rentabilité avec
 *                              prix vente unités)
 *
 * Plancher: 3 000 DH HT par pack (cas terrains de très faible valeur).
 */

export type P4Pack = "BASIQUE" | "MOYEN" | "RENTABILITE";

export type P4QuoteInput = {
  pack: P4Pack;
  // Prix d'acquisition ou prix de vente du foncier en DH (peu importe lequel,
  // c'est l'assiette de calcul des honoraires)
  prixVenteFoncierDH: number;
};

const PACK_RATES: Record<P4Pack, number> = {
  BASIQUE: 0.003,    // 0.3%
  MOYEN: 0.006,      // 0.6%
  RENTABILITE: 0.01, // 1.0%
};

const PACK_DEFINITIONS: Record<P4Pack, {
  label: string;
  shortDesc: string;
  deliveryDays: number;
  deliverables: string[];
}> = {
  BASIQUE: {
    label: "Analyse foncière BASIQUE",
    shortDesc: "Vérification urbanistique seule (zonage, COS, CES, hauteurs, servitudes urbanistiques)",
    deliveryDays: 7,
    deliverables: [
      "Note de renseignement urbanistique (zonage, plan d'aménagement applicable)",
      "Coefficients d'occupation (COS) et d'emprise au sol (CES) admissibles",
      "Hauteurs maximales autorisées + nombre de niveaux",
      "Servitudes urbanistiques (recul, prospect, etc.)",
      "Restrictions environnementales / patrimoniales applicables",
      "Rapport PDF watermarké (10-15 pages)",
    ],
  },
  MOYEN: {
    label: "Analyse foncière MOYEN",
    shortDesc: "BASIQUE + analyse juridique du titre foncier (charges, hypothèques, mitoyennetés)",
    deliveryDays: 12,
    deliverables: [
      "✓ Tout le contenu du pack BASIQUE",
      "Vérification juridique du titre foncier",
      "État des charges réelles (hypothèques, privilèges)",
      "Mitoyennetés et servitudes inscrites",
      "Audit des actes antérieurs (vente, donation, succession)",
      "Avis sur risque juridique (litiges, conflits potentiels)",
      "Rapport PDF watermarké (20-30 pages)",
    ],
  },
  RENTABILITE: {
    label: "Analyse foncière RENTABILITÉ",
    shortDesc: "MOYEN + scénario de rentabilité avec prix de vente prévisionnels des unités",
    deliveryDays: 18,
    deliverables: [
      "✓ Tout le contenu du pack MOYEN",
      "Étude de marché immobilier comparé (prix m² zone)",
      "Scénarios de programmation optimaux (typologies, densités)",
      "Estimation prix de vente prévisionnels par unité (3 hypothèses)",
      "Calcul de marge promoteur (coût total vs CA prévisionnel)",
      "Sensibilité prix / délais / coûts (analyse risque)",
      "Recommandation Go/No-Go avec ROI attendu",
      "Rapport PDF watermarké (40-60 pages) + tableaux Excel",
    ],
  },
};

const FLOOR_HT = 3000; // plancher 3 000 DH HT

@Injectable()
export class P4PricingService {
  listPacks() {
    return (Object.keys(PACK_DEFINITIONS) as P4Pack[]).map(code => ({
      code,
      rate: PACK_RATES[code],
      ratePct: (PACK_RATES[code] * 100).toFixed(2) + "%",
      ...PACK_DEFINITIONS[code],
    }));
  }

  computeQuote(input: P4QuoteInput) {
    const def = PACK_DEFINITIONS[input.pack];
    if (!def) throw new Error(`Pack inconnu: ${input.pack}`);
    const prix = Number(input.prixVenteFoncierDH);
    if (!Number.isFinite(prix) || prix <= 0) {
      throw new Error("Prix de vente du foncier invalide.");
    }
    const rate = PACK_RATES[input.pack];
    const computedHT = Math.round(prix * rate);
    const totalHT = Math.max(computedHT, FLOOR_HT);
    const tva = Math.round(totalHT * 0.2);
    const totalTTC = totalHT + tva;
    const flooredApplied = computedHT < FLOOR_HT;

    return {
      ok: true as const,
      currency: "MAD" as const,
      meta: {
        pack: input.pack,
        packLabel: def.label,
        rate,
        ratePct: (rate * 100).toFixed(2) + "%",
        deliveryDays: def.deliveryDays,
      },
      base: {
        prixVenteFoncierDH: prix,
        rate,
        floorHT: FLOOR_HT,
        flooredApplied,
      },
      deliverables: def.deliverables,
      amounts: {
        computedHT,
        totalHT,
        tvaRate: 0.2,
        tva,
        totalTTC,
      },
      payment: {
        modalities: "Paiement intégral à la commande, avant lancement de l'analyse. Le rapport est livré en PDF watermarké après confirmation du paiement.",
        download: "Téléchargement permis exclusivement après paiement. Le rapport est marqué « Rapport exclusif CITURBAREA — utilisable sur autorisation écrite ».",
      },
      notes: [
        flooredApplied
          ? `Plancher tarifaire de ${FLOOR_HT} DH HT appliqué (calcul brut : ${computedHT} DH).`
          : "Honoraires calculés en pourcentage du prix de vente du foncier déclaré.",
        "Le prix de vente du foncier est l'assiette de calcul (prix d'acquisition prévu ou cible commerciale).",
        "Aucune mission de gestion projet incluse — pour piloter une opération immobilière voir P2 / P3.",
      ],
    };
  }
}
