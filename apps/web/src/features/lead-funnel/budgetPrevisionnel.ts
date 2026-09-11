/**
 * budgetPrevisionnel.ts — référentiel unique des tranches de budget de
 * construction, en MAD par m² de plancher. Partagé par P1 (P1Landing) et par
 * le champ budget des wizards P2–P5 : un seul barème, jamais deux.
 *
 * Plage 1 500 → 25 000 DH/m² (logement basique → ultra-luxe) : granularité
 * fine en bas, paliers larges en haut où la sensibilité au prix est moindre.
 */

export const BANDES_BUDGET: ReadonlyArray<{ min: number; max: number }> = [
  { min: 1500,  max: 2000  },  // Très économique (basique)
  { min: 2000,  max: 2500  },  // Très économique +
  { min: 2500,  max: 3000  },  // Économique (logement social)
  { min: 3000,  max: 3500  },
  { min: 3500,  max: 4000  },  // Standing entrée
  { min: 4000,  max: 4500  },
  { min: 4500,  max: 5000  },  // Standing
  { min: 5000,  max: 5500  },
  { min: 5500,  max: 6500  },  // Haut standing
  { min: 6500,  max: 8000  },  // Premium
  { min: 8000,  max: 10000 },  // Premium +
  { min: 10000, max: 13000 },  // Luxe
  { min: 13000, max: 18000 },  // Ultra-luxe
  { min: 18000, max: 25000 },  // Top of market
];

/** Arrondi d'affichage à 10 000 MAD. */
export function arrondiMAD(n: number): number {
  const step = 10000;
  return Math.max(step, Math.round(n / step) * step);
}

/** Tranches globales (MAD) pour une surface de plancher donnée. */
export function tranchesBudget(surfaceM2: number): Array<{ id: string; minMAD: number; maxMAD: number }> {
  return BANDES_BUDGET.map(({ min, max }) => ({
    id: `${min}-${max}`,
    minMAD: arrondiMAD(surfaceM2 * min),
    maxMAD: arrondiMAD(surfaceM2 * max),
  }));
}
