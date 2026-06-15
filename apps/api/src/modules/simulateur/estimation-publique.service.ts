import { BadRequestException, Injectable } from "@nestjs/common";
import {
  CATEGORY_MAP,
  FINITIONS,
  FOURCHETTE_SPREAD,
  HONORAIRES_RATE,
  VENTILATION,
  VILLES,
  VILLE_COEFFICIENT,
  coutM2FromBareme,
  isFinition,
  isTypeProjet,
  isVille,
  type Finition,
  type TypeProjet,
  type VilleSlug,
} from "./barometre.config";

/**
 * EstimationPubliqueService — estimation PUBLIQUE / ANONYME du coût de
 * construction, sans aucun accès aux données réelles des dossiers.
 *
 * Fonction PURE (aucune lecture DB) : on réutilise le barème CNOA 2021
 * (coût travaux au m² par catégorie) déjà exposé, on applique un coefficient
 * régional et une ventilation produit. Deux niveaux de sortie :
 *   - SOMMAIRE  : fourchette globale min–max (gratuit, anonyme, SEO).
 *   - DÉTAILLÉE : ventilation gros œuvre / second œuvre / finitions / honoraires
 *                 (livrée seulement après capture du contact côté contrôleur).
 */

export interface EstimationInput {
  typeProjet: TypeProjet;
  finition: Finition;
  ville: VilleSlug;
  // PARTICULIER : emprise au sol (m² par niveau) + nombre de niveaux + sous-sols.
  surface?: number;
  niveaux?: number;
  sousSols?: number;
  // PROMOTEUR : surface plancher totale (m²) + nombre de logements (indicatif).
  surfacePlancher?: number;
  nbLogements?: number;
}

export interface VentilationPoste {
  poste: string;
  montant: number; // MAD, valeur centrale arrondie
  ratio: number; // part du coût travaux (0..1) ; null-équivalent pour honoraires
}

export interface EstimationSommaire {
  ok: true;
  currency: "MAD";
  typeProjet: TypeProjet;
  finition: Finition;
  ville: VilleSlug;
  villeName: string;
  surfacePlancherTotaleM2: number;
  coutM2: number; // coût travaux au m² effectif (barème × coef régional)
  estimationCentrale: number; // budget central (travaux + honoraires)
  fourchetteMin: number;
  fourchetteMax: number;
  hypotheses: string[];
  disclaimer: string;
}

export interface EstimationDetaillee extends EstimationSommaire {
  ventilation: VentilationPoste[];
  totalTravaux: number;
  honoraires: number;
  totalAvecHonoraires: number;
}

const DISCLAIMER =
  "Estimation indicative générée à partir du barème CNOA 2021 et d'observations " +
  "marché CITURBAREA. Elle ne constitue ni un devis ni un engagement contractuel. " +
  "Le coût réel dépend du terrain, du programme détaillé, des choix techniques et " +
  "des conditions du marché au moment des travaux.";

@Injectable()
export class EstimationPubliqueService {
  /** Liste des options de qualification (alimente le formulaire frontend). */
  options() {
    return {
      ok: true as const,
      types: [
        { value: "PARTICULIER", name: "Particulier (villa / maison)", porte: "P1" },
        { value: "PROMOTEUR", name: "Promoteur (immeuble collectif)", porte: "P2" },
      ],
      finitions: FINITIONS,
      villes: VILLES,
      // Champs requis selon le type (le frontend adapte le formulaire).
      champs: {
        PARTICULIER: ["surface", "niveaux", "sousSols"],
        PROMOTEUR: ["surfacePlancher", "nbLogements"],
      },
    };
  }

  /** Valide + normalise les entrées publiques, puis calcule la surface plancher. */
  private normalize(input: EstimationInput): {
    type: TypeProjet;
    finition: Finition;
    ville: VilleSlug;
    surfacePlancherTotale: number;
    hypotheses: string[];
  } {
    if (!isTypeProjet(input.typeProjet)) {
      throw new BadRequestException("typeProjet invalide (PARTICULIER|PROMOTEUR)");
    }
    if (!isFinition(input.finition)) {
      throw new BadRequestException("finition invalide (ECO|STANDARD|HAUT_DE_GAMME)");
    }
    if (!isVille(input.ville)) {
      throw new BadRequestException("ville invalide");
    }

    const hypotheses: string[] = [];
    let surfacePlancherTotale: number;

    if (input.typeProjet === "PARTICULIER") {
      const surface = num(input.surface);
      const niveaux = Math.max(1, Math.floor(num(input.niveaux) || 1));
      const sousSols = Math.max(0, Math.floor(num(input.sousSols) || 0));
      if (!surface || surface <= 0) {
        throw new BadRequestException("surface (emprise au sol m²) requise et > 0");
      }
      // Doctrine moteur : nbPlanchers = nbNiveaux + nbSousSols.
      const nbPlanchers = niveaux + sousSols;
      surfacePlancherTotale = surface * nbPlanchers;
      hypotheses.push(
        `Surface plancher = ${surface} m² × ${nbPlanchers} plancher(s) (${niveaux} niveau(x)${sousSols ? ` + ${sousSols} sous-sol(s)` : ""}) = ${Math.round(surfacePlancherTotale)} m².`,
      );
    } else {
      const sp = num(input.surfacePlancher);
      if (!sp || sp <= 0) {
        throw new BadRequestException("surfacePlancher (m²) requise et > 0");
      }
      surfacePlancherTotale = sp;
      const nbLog = Math.max(0, Math.floor(num(input.nbLogements) || 0));
      hypotheses.push(`Surface plancher totale déclarée = ${Math.round(sp)} m².`);
      if (nbLog > 0) hypotheses.push(`${nbLog} logement(s) (indicatif).`);
    }

    return {
      type: input.typeProjet,
      finition: input.finition,
      ville: input.ville,
      surfacePlancherTotale,
      hypotheses,
    };
  }

  /** Estimation SOMMAIRE — fourchette globale (gratuit / anonyme / SEO). */
  estimateSommaire(input: EstimationInput): EstimationSommaire {
    const n = this.normalize(input);
    const coutM2Bareme = coutM2FromBareme(n.type, n.finition);
    const coef = VILLE_COEFFICIENT[n.ville];
    const coutM2 = Math.round(coutM2Bareme * coef);

    const totalTravaux = coutM2 * n.surfacePlancherTotale;
    const honoraires = totalTravaux * HONORAIRES_RATE;
    const central = Math.round(totalTravaux + honoraires);

    const fourchetteMin = Math.round(central * (1 - FOURCHETTE_SPREAD));
    const fourchetteMax = Math.round(central * (1 + FOURCHETTE_SPREAD));

    const villeName = VILLES.find((v) => v.slug === n.ville)!.name;
    const catCode = CATEGORY_MAP[n.type][n.finition];

    const hypotheses = [
      ...n.hypotheses,
      `Coût travaux : ${coutM2Bareme} MAD/m² (barème CNOA cat. ${catCode}) × coef. régional ${coef} = ${coutM2} MAD/m².`,
      `Honoraires d'architecte estimés à ${Math.round(HONORAIRES_RATE * 100)} % du coût travaux.`,
    ];

    return {
      ok: true,
      currency: "MAD",
      typeProjet: n.type,
      finition: n.finition,
      ville: n.ville,
      villeName,
      surfacePlancherTotaleM2: Math.round(n.surfacePlancherTotale),
      coutM2,
      estimationCentrale: central,
      fourchetteMin,
      fourchetteMax,
      hypotheses,
      disclaimer: DISCLAIMER,
    };
  }

  /** Estimation DÉTAILLÉE — ventilation par poste (après capture contact). */
  estimateDetaillee(input: EstimationInput): EstimationDetaillee {
    const s = this.estimateSommaire(input);
    const totalTravaux = s.coutM2 * s.surfacePlancherTotaleM2;
    const honoraires = Math.round(totalTravaux * HONORAIRES_RATE);

    const ventilation: VentilationPoste[] = [
      { poste: "Gros œuvre", montant: Math.round(totalTravaux * VENTILATION.grosOeuvre), ratio: VENTILATION.grosOeuvre },
      { poste: "Second œuvre", montant: Math.round(totalTravaux * VENTILATION.secondOeuvre), ratio: VENTILATION.secondOeuvre },
      { poste: "Finitions", montant: Math.round(totalTravaux * VENTILATION.finitions), ratio: VENTILATION.finitions },
      { poste: "Honoraires d'architecte", montant: honoraires, ratio: HONORAIRES_RATE },
    ];

    return {
      ...s,
      ventilation,
      totalTravaux: Math.round(totalTravaux),
      honoraires,
      totalAvecHonoraires: Math.round(totalTravaux + honoraires),
    };
  }
}

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}
