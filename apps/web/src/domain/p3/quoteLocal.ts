/**
 * Porte 3 — Maîtrise d'ouvrage déléguée : devis calculé dans le navigateur.
 *
 * Reprend exactement apps/api/src/tomes/tome-3/p3/pricing.service.ts (l'API est
 * éteinte en production) :
 *   coût de réalisation = surface plancher × coût/m² du barème CNOA 2021 × nb bâtiments
 *   honoraires HT       = 10 % du coût de réalisation ; TVA 20 %.
 *
 * Le barème vient de @citurbarea/pricing-cnoa (source unique, partagée avec
 * l'API et la Porte 2) : aucun coût n'est recopié ici.
 *
 * Écart volontaire avec l'API : une section « VILLA » (villa / maison
 * individuelle) regroupe les catégories 1.1 et 4.x du barème. Elle est
 * transmise à l'API sous la section « IMM », où ces catégories sont valides.
 */

import {
  BAREME_CNOA_2021,
  categoriesDeSection,
  estCategorieConnue,
  type CategoryCode,
  type P2Section,
} from "@citurbarea/pricing-cnoa";

export type P3Section = "VILLA" | "IMM" | "GR" | "EPIG" | "AMG";

export const P3_SECTIONS: P3Section[] = ["VILLA", "IMM", "GR", "EPIG", "AMG"];

export const P3_HONO_RATE = 0.10;
export const P3_TVA_RATE = 0.20;

/** Catégories villa / maison individuelle (barème : 1.1 + villas 4.1 à 4.6). */
const CATEGORIES_VILLA: CategoryCode[] = ["1.1", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6"];

/** Section du barème (API) correspondant à une section P3. */
export function sectionBareme(section: P3Section): P2Section {
  return section === "VILLA" ? "IMM" : section;
}

export type P3Category = {
  code: CategoryCode;
  label: string;
  costPerM2: number;
  photoOptionAvailable: boolean;
  notes?: string;
};

/** Catégories proposées pour une section P3 (remplace GET /p2/categories). */
export function categoriesP3(section: P3Section): P3Category[] {
  const codes = section === "VILLA"
    ? CATEGORIES_VILLA
    : section === "IMM"
      // Les villas ont leur propre section : IMM garde le collectif et l'habitat social.
      ? categoriesDeSection("IMM").filter(c => !CATEGORIES_VILLA.includes(c))
      : categoriesDeSection(section);
  return codes.map(code => {
    const d = BAREME_CNOA_2021[code];
    return { code, label: d.label, costPerM2: d.costPerM2, photoOptionAvailable: d.photoOptionAvailable, notes: d.notes };
  });
}

export type P3QuoteInput = {
  section: P3Section;
  categoryCode: string;
  surfacePlancherM2: number;
  nbBatiments?: number;
};

export type P3Quote = {
  ok: true;
  currency: "MAD";
  source: "local";
  meta: { porte: "P3"; category: string; categoryLabel: string; section: string };
  base: { surfacePlancherM2: number; nbBatiments: number; coutConstructionM2: number; coutRealisation: number };
  honoraires: { rate: number; ratePct: string; totalHT: number; tvaRate: number; tva: number; totalTTC: number };
  escrow: { platformOnly: boolean; notice: string };
  services: string[];
  notes: string[];
};

export class ErreurDevisP3 extends Error {}

export function computeP3Quote(input: P3QuoteInput): P3Quote {
  if (!estCategorieConnue(input.categoryCode)) throw new ErreurDevisP3(`Catégorie inconnue : ${input.categoryCode}`);
  const code = input.categoryCode as CategoryCode;
  if (!categoriesP3(input.section).some(c => c.code === code)) {
    throw new ErreurDevisP3(`Catégorie ${code} non valide pour la section ${input.section}`);
  }
  const cat = BAREME_CNOA_2021[code];
  const surface = Number(input.surfacePlancherM2);
  if (!Number.isFinite(surface) || surface <= 0) throw new ErreurDevisP3("Surface plancher requise et > 0");
  const nbBatiments = Math.max(1, Math.floor(Number(input.nbBatiments ?? 1) || 1));

  const coutRealisation = Math.round(surface * cat.costPerM2 * nbBatiments);
  const totalHT = Math.round(coutRealisation * P3_HONO_RATE);
  const tva = Math.round(totalHT * P3_TVA_RATE);

  return {
    ok: true,
    currency: "MAD",
    source: "local",
    meta: { porte: "P3", category: code, categoryLabel: cat.label, section: sectionBareme(input.section) },
    base: { surfacePlancherM2: surface, nbBatiments, coutConstructionM2: cat.costPerM2, coutRealisation },
    honoraires: { rate: P3_HONO_RATE, ratePct: "10%", totalHT, tvaRate: P3_TVA_RATE, tva, totalTTC: totalHT + tva },
    escrow: {
      platformOnly: true,
      notice: "Les paiements aux entreprises transitent par CITURBAREA et sont libérés par tranches, après validation des procès-verbaux de réception.",
    },
    services: [
      "Convocation et coordination de tous les intervenants (BET, bureau de contrôle, entreprises)",
      "Pilotage par corps de métier (gros œuvre, second œuvre, finitions, équipements, VRD)",
      "Réunions de chantier hebdomadaires avec PV signés",
      "Ordres de service, levée des réserves, attestations de conformité",
      "Gestion des appels de paiement",
      "Démarches administratives (Rokhas, Protection civile, ONEE…)",
      "Réception provisoire, réception définitive et remise des clés",
    ],
    notes: [
      "Coût de réalisation estimé avec le barème CNOA 2021 (surface × coût au m² de la catégorie) ; il sera affiné sur votre projet réel.",
    ],
  };
}
