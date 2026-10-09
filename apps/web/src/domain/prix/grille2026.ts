/**
 * Grille de prix unique CITURBAREA 2026 — source de vérité du coût de
 * construction côté front. Toute page qui affiche un coût au m² passe par ici
 * (fin des grilles contradictoires relevées dans docs/prix/recherche/).
 *
 * Base : Rabat-Salé-Kénitra (coef 1,00), prix entreprise HT au m² de plancher.
 * Fourchettes par type × standing : COST_RANGES_MA (costRangesMA.ts), recoupées
 * en 2026-10 avec le marché privé (docs/prix/recherche/marche-prive-main-oeuvre.md :
 * éco ≈ 3 500, moyen ≈ 5 350, haut ≈ 9 100, luxe ≈ 13 000 DH/m²).
 */
import { COST_RANGES_MA, type Standing, type TypeProjet } from "../../command-center/modules/dossiers/costRangesMA";

export const GRILLE_VERSION = "2026-10";
export const GRILLE_SOURCES =
  "docs/prix/recherche/ (marché privé : EnginLoc avr. 2026, Fadil, bati.ma, Francobat, OLAM, 7rafti ; marchés publics : Cour des comptes, observatoire Habitat Tétouan 2020 ; matériaux : LeChantier, Tachrone, Bricoma 2026)";

/** Médiane d'une fourchette DH/m² (type × standing) de la grille, ou null si absente. */
export function coutM2Median(type: TypeProjet, standing: Standing): number | null {
  const r = COST_RANGES_MA[type].ranges[standing];
  return r ? Math.round((r[0] + r[1]) / 2) : null;
}

/**
 * Coefficients régionaux du coût global (base Rabat-Salé-Kénitra = 1,00).
 * Moyenne de deux séries 2026 (coût global EnginLoc, grille main-d'œuvre 7rafti
 * ramenée à la base RSK) — docs/prix/recherche/marche-prive-main-oeuvre.md.
 */
export const COEF_REGIONAL: Record<string, number> = {
  casablanca: 1.06,
  bouskoura: 1.06,
  mohammedia: 1.03,
  rabat: 1.07,
  sale: 1.0,
  temara: 1.0,
  kenitra: 0.93,
  tanger: 1.02,
  marrakech: 1.01,
  agadir: 0.97,
  fes: 0.92,
  meknes: 0.89,
  oujda: 0.88,
  tetouan: 0.93,
  "el jadida": 0.93,
};
/** Ville inconnue : ni prime ni décote. Rural : 0,65 à 0,80 selon l'accessibilité (non appliqué automatiquement). */
export const COEF_REGIONAL_DEFAUT = 1.0;

const cle = (ville: string) => ville.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function coefRegional(ville: string | null | undefined): number {
  if (!ville) return COEF_REGIONAL_DEFAUT;
  return COEF_REGIONAL[cle(ville)] ?? COEF_REGIONAL_DEFAUT;
}

/**
 * Coût/m² de référence des niveaux P1 (assiette des honoraires des packs).
 * Valeurs de l'API (p1-packs-quote.service.ts, grille élargie 2026-06, choisie
 * par le cabinet) : le moteur hors ligne quote.engine.ts doit les reprendre à
 * l'identique (test de parité : grille2026.test.ts).
 * Correspondance avec la grille villa : ≈ très éco / moyen / standing / haut / luxe.
 */
export const P1_COUT_M2 = {
  ECONOMIQUE: 2500,
  STANDING: 4000,
  HAUT_STANDING: 6000,
  PREMIUM: 9000,
  BLACK: 13000,
  /** Plancher du coût implicite BLACK quand le client saisit son budget. */
  BLACK_MIN: 9000,
} as const;
