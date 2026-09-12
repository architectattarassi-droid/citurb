/**
 * Pricing Service P2 — façade Nest au-dessus de @citurbarea/pricing-cnoa.
 *
 * Le barème CNOA 2021, la grille des coûts réels, le catalogue et le calcul
 * vivent désormais dans packages/pricing-cnoa : une seule définition pour
 * l'API et pour le front, qui doivent rendre le même devis (le front calcule
 * localement quand l'API ne répond pas).
 *
 * Ce fichier ne contient plus aucune valeur de coût ni de taux. Il réexporte
 * le barème et les types parce que tome-3/p3/pricing.service.ts les importe
 * d'ici depuis l'origine ; le point d'entrée canonique reste le paquet.
 *
 * Doctrine : le barème est un PLANCHER déontologique, le prix proposé est le
 * coût réel d'exécution (bas de la fourchette du niveau choisi), et le
 * plancher est vérifié à chaque calcul.
 */

import { Injectable } from "@nestjs/common";
import {
  BAREME_CNOA_2021,
  GRILLE_REELLE,
  categoriesDeSection,
  computeQuote,
  niveauxDe,
  type CategoryCode,
  type DevisInput,
  type DevisResult,
  type P2Section,
} from "@citurbarea/pricing-cnoa";

export {
  BAREME_CNOA_2021,
  GRILLE_REELLE,
  ErreurDevis,
  HONORAIRES_RATE,
  TVA_RATE,
  PHASE_A_RATE,
  PHASE_B_RATE,
  PHASE_C_ON_SITE_RATE,
  PHASE_C_PHOTOS_RATE,
} from "@citurbarea/pricing-cnoa";
export type { CategoryCode, CategoryDef, FollowMode, P2Section } from "@citurbarea/pricing-cnoa";

/** Entrée de POST /p2/quote. `niveau` est une clé de GRILLE_REELLE[cat].niveaux. */
export type P2QuoteInput = DevisInput;
export type P2QuoteResult = DevisResult;

/** Une catégorie telle que la voit le formulaire : plancher + niveaux tarifés. */
export type CategoryListItem = {
  code: CategoryCode;
  label: string;
  /** Plancher CNOA au m² (ancien costPerM2 — le nom est conservé pour le front). */
  costPerM2: number;
  plancherM2: number;
  photoOptionAvailable: boolean;
  notes?: string;
  niveaux: { cle: string; bas: number; haut: number | null }[];
};

@Injectable()
export class P2PricingService {
  computeQuote(input: P2QuoteInput): P2QuoteResult {
    return computeQuote(input);
  }

  /**
   * Catégories d'une section, avec leurs niveaux et fourchettes : le front
   * n'invente aucun libellé de prix, il lit la grille.
   */
  listCategories(section: P2Section): CategoryListItem[] {
    return categoriesDeSection(section).map((code) => {
      const cat = BAREME_CNOA_2021[code];
      return {
        code,
        label: cat.label,
        costPerM2: cat.costPerM2,
        plancherM2: cat.costPerM2,
        photoOptionAvailable: cat.photoOptionAvailable,
        notes: cat.notes,
        niveaux: niveauxDe(code).map((cle) => {
          const [bas, haut] = GRILLE_REELLE[code].niveaux[cle];
          return { cle, bas, haut };
        }),
      };
    });
  }
}
