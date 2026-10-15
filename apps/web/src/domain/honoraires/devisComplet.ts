/**
 * Saisie complète d'un devis (ce que l'éditeur enregistre dans `Devis.entree`)
 * → métré, coût, lignes chiffrées. Fonction pure, exécutée à l'identique par
 * l'éditeur (aperçu) et par le serveur (émission : il ne fait jamais
 * confiance aux montants envoyés par le navigateur).
 */
import { Dec } from "./decimal";
import { calculerDevis, DevisInvalide, type ChoixLigne, type ResultatDevis } from "./devis";
import { calculerCoutTravaux, calculerSurfaces, ecartVisites, type Fondations, type Metre, type NiveauCalcule, type ResultatCout } from "./metre";
import type { GrilleTarifaire, ModalitePaiement, Presentation, TypeDevis, Typologie } from "./types";

export interface EntreeDevisComplet {
  type: TypeDevis;
  presentation: Presentation;
  modalitesPaiement: ModalitePaiement;
  validiteJours: number;
  /** Objet du devis (sous-titre en italique) ; défaut : intitulé du projet. */
  objet?: string;
  /** Métré (missions au pourcentage). Absent : mission forfaitaire. */
  metre?: Metre;
  puElevation?: string;
  fondations?: Fondations;
  tauxHonoraires?: string;
  lignes: ChoixLigne[];
  exclusions: string[];
  /** Hypothèses saisies à la main, en plus de celles du métré. */
  hypothesesLibres?: string[];
  /** Imprimé pour remplissage manuel : les lignes vides d'identification restent visibles. */
  pourRemplissageManuel?: boolean;
}

export interface ContexteProjet {
  typologie: Typologie | null;
  commune: string;
  missionsDejaReglees: string[];
}

export type CalculComplet =
  | {
      ok: true;
      niveaux: NiveauCalcule[];
      surfacePlancher: Dec | null;
      empriseAuSol: Dec | null;
      cout: ResultatCout | null;
      resultat: ResultatDevis;
      /** Écarts signalés à l'éditeur (jamais imposés, jamais imprimés). */
      avertissements: string[];
    }
  | { ok: false; questions: string[] };

export function calculerDevisComplet(e: EntreeDevisComplet, grille: GrilleTarifaire, ctx: ContexteProjet): CalculComplet {
  const avecPourcentage = e.lignes.some((l) => {
    const p = grille.prestations.find((x) => x.code === l.code);
    return p?.modeTarification === "POURCENTAGE_HONORAIRES" || p?.modeTarification === "POURCENTAGE_TRAVAUX";
  }) || e.presentation === "PACKS";

  let niveaux: NiveauCalcule[] = [], surfacePlancher: Dec | null = null, empriseAuSol: Dec | null = null, cout: ResultatCout | null = null;
  const hypotheses: string[] = [], avertissements: string[] = [];

  if (avecPourcentage) {
    const q: string[] = [];
    if (!e.metre) q.push("Métré requis : la mission est au pourcentage du coût des travaux.");
    if (!e.puElevation) q.push("Prix unitaire d'élévation (DH/m²) à saisir.");
    if (!e.fondations) q.push("Fondations : poste chiffré à part, ou comprises dans le prix d'élévation ?");
    if (q.length || !e.metre) return { ok: false, questions: q };
    const s = calculerSurfaces(e.metre);
    if (!s.ok) return { ok: false, questions: s.questions };
    try {
      cout = calculerCoutTravaux({ surfacePlancher: s.surfacePlancher, empriseAuSol: s.empriseAuSol, puElevation: e.puElevation as string, fondations: e.fondations as Fondations });
    } catch (err) { return { ok: false, questions: [(err as Error).message] }; }
    niveaux = s.niveaux; surfacePlancher = s.surfacePlancher; empriseAuSol = s.empriseAuSol;
    hypotheses.push(...s.hypotheses, ...cout.hypotheses);
    const ctrl = e.lignes.find((l) => l.code === "CTRL_BET");
    if (ctrl?.quantite != null && e.metre.niveaux.length) {
      const ecart = ecartVisites(e.metre.niveaux, Number(Dec.de(ctrl.quantite).toString()));
      if (ecart) avertissements.push(ecart);
    }
  }
  hypotheses.push(...(e.hypothesesLibres ?? []).map((h) => h.trim()).filter(Boolean));

  try {
    const resultat = calculerDevis({
      grille, type: e.type, presentation: e.presentation,
      projet: {
        typologie: ctx.typologie ?? undefined, commune: ctx.commune, surfacePlancher: surfacePlancher ?? undefined,
        nbNiveaux: e.metre?.niveaux.length, sousSol: e.metre?.niveaux.some((n) => n.code === "SOUS_SOL"),
      },
      coutTravaux: cout?.coutTravaux, tauxHonoraires: e.tauxHonoraires, lignes: e.lignes,
      missionsDejaReglees: ctx.missionsDejaReglees, modalitesPaiement: e.modalitesPaiement, hypotheses,
    });
    for (const l of resultat.lignes) if (l.surDevis && l.motifSurDevis) avertissements.push(`« ${l.libelle} » : Sur devis (${l.motifSurDevis}).`);
    return { ok: true, niveaux, surfacePlancher, empriseAuSol, cout, resultat, avertissements };
  } catch (err) {
    if (err instanceof DevisInvalide) return { ok: false, questions: err.erreurs };
    throw err;
  }
}

/** Total des prestations chiffrées ; en présentation PACKS, hors packs (le pack retenu s'y ajoute à l'acceptation). */
export function montantDevis(r: ResultatDevis): Dec {
  return r.totalToutesPrestations;
}

/** Exclusions proposées pour une mission forfaitaire administrative (cas Mehdaoui). */
export const EXCLUSIONS_FORFAIT = [
  "Taxes et redevances communales",
  "Modification du projet autorisé",
  "Prestations des autres intervenants",
  "Suivi de chantier",
];

/** Devis de renouvellement prérempli (alerte d'autorisation, spec §8.4). */
export function entreeRenouvellement(): EntreeDevisComplet {
  return {
    type: "COMPLEMENTAIRE", presentation: "DETAILLEE", modalitesPaiement: "AVANCE_TOTALE", validiteJours: 30,
    lignes: [{ code: "DEPOT_RENOUV" }], exclusions: [...EXCLUSIONS_FORFAIT],
  };
}
