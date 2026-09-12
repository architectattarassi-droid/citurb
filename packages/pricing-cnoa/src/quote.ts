/**
 * Calcul du devis P2 — fonction pure, sans I/O, exécutable des deux côtés.
 *
 * Doctrine (arbitrage du propriétaire) :
 *   - le barème CNOA 2021 est un PLANCHER déontologique, pas un prix ;
 *   - le prix proposé est le coût réel d'exécution, bas de la fourchette du
 *     niveau choisi ;
 *   - le plancher est vérifié à chaque calcul et le résultat le dit.
 *
 *     coutReel     = surfacePlancher × basFourchette(cat, niveau) × nbBatiments
 *     coutPlancher = surfacePlancher × BAREME[cat].costPerM2      × nbBatiments
 *     coutRetenu   = max(coutReel, coutPlancher)
 *     honorairesHT = coutRetenu × HONORAIRES_RATE
 *
 * Les phases A/B/C, la TVA et l'option photos sont inchangées : elles
 * s'appliquent sur honorairesHT comme avant.
 *
 * Le niveau est obligatoire dès que la catégorie en propose plusieurs :
 * aucune valeur de repli silencieuse. Une catégorie à niveau unique (1.2
 * conventionné, 3.1, 3.2, 4.1…) le sélectionne d'office — il n'y a rien à
 * deviner.
 */

import {
  BAREME_CNOA_2021,
  CategoryCode,
  FollowMode,
  HONORAIRES_RATE,
  P2Section,
  PHASE_A_RATE,
  PHASE_B_RATE,
  PHASE_C_ON_SITE_RATE,
  PHASE_C_PHOTOS_RATE,
  SECTION_LABELS,
  TVA_RATE,
  estCategorieConnue,
} from "./bareme";
import { Bascule, resoudreCategorie } from "./catalogue";
import { Fourchette, basFourchette, estNiveauValide, fourchetteDe, niveauxDe } from "./grille";

export type CodeErreurDevis =
  | "categorie_requise"
  | "categorie_inconnue"
  | "categorie_section_invalide"
  | "surface_requise"
  | "niveau_requis"
  | "niveau_invalide";

/** Erreur de saisie : l'appelant HTTP la transforme en 400. */
export class ErreurDevis extends Error {
  constructor(public readonly code: CodeErreurDevis, message?: string) {
    super(message || code);
    this.name = "ErreurDevis";
  }
}

export type DevisInput = {
  section: P2Section;
  categoryCode?: string;
  /** Clé de GRILLE_REELLE[cat].niveaux — jamais un multiplicateur. */
  niveau?: string;
  surfacePlancherM2?: number;
  nbBatiments?: number;
  surfaceTerrainHa?: number;
  followMode?: FollowMode;
};

export type DevisResult = {
  ok: true;
  currency: "MAD";
  meta: {
    section: P2Section;
    sectionLabel: string;
    category?: CategoryCode;
    categoryLabel?: string;
    niveau?: string;
    followMode: FollowMode;
    photoOptionAvailable: boolean;
    requiresQuotePersonnalise: boolean;
    /** Catégorie corrigée par une règle de surface du barème. */
    bascule?: Bascule;
  };
  base: {
    surfacePlancherM2?: number;
    nbBatiments: number;
    /** Conservé : bas de fourchette appliqué, en DH/m². */
    coutConstructionM2?: number;
    /** Conservé pour l'affichage historique = coutRetenu. */
    coutTravauxEstime?: number;
    coutReel?: number;
    coutPlancher?: number;
    coutRetenu?: number;
    fourchette?: Fourchette;
    surfaceTerrainHa?: number;
  };
  conformite?: {
    plancherRespecte: boolean;
    categorie: CategoryCode;
    plancherM2: number;
  };
  honoraires: {
    rate: number;
    totalHT: number | null;
    tvaRate: number;
    tva: number | null;
    totalTTC: number | null;
    breakdown: {
      phaseA_esquisseAutorisation: number | null;
      phaseB_dceCps: number | null;
      phaseC_suivi: number | null;
    };
  };
  visaCroa: { payableSeparately: true; note: string };
  decennale: { applicable: boolean; options?: ("PROMOTEUR_GARDE" | "CITURBAREA_PORTE" | "CONSTRUCTEUR_INITIAL")[]; note: string };
  notes: string[];
};

export const VISA_CROA_NOTE =
  "Le visa du contrat par le Conseil Régional de l'Ordre des Architectes (CROA) est obligatoire avant dépôt du dossier d'autorisation (Chap V Règlement Intérieur CNOA 2024, délai max 15 jours calendaires). Facturé séparément, payable directement via plateforme CITURBAREA — reversé au CROA territorialement compétent.";

function decennaleDe(section: P2Section): DevisResult["decennale"] {
  if (section === "AMG") {
    return {
      applicable: true,
      options: ["CONSTRUCTEUR_INITIAL"],
      note: "Garantie décennale conservée par le constructeur initial du bâtiment. L'aménageur (porteur P2-AMG) s'engage formellement à n'effectuer aucune intervention sur les éléments de structure (murs porteurs, dalles, fondations, charpente).",
    };
  }
  return {
    applicable: true,
    options: ["PROMOTEUR_GARDE", "CITURBAREA_PORTE"],
    note: "Deux scénarios proposés : (A) Le promoteur conserve sa décennale (moins cher, mais traçabilité entreprises maintenue par CITURBAREA — polices, PV, photos avant fermeture). (B) CITURBAREA porte la décennale (plus cher, prise en charge totale du risque par CITURBAREA).",
  };
}

/** Niveau effectif : exigé dès qu'il y a un choix, déduit s'il n'y en a qu'un. */
export function resoudreNiveau(categorie: CategoryCode, niveau?: string): string {
  const dispo = niveauxDe(categorie);
  if (niveau) {
    if (!estNiveauValide(categorie, niveau)) {
      throw new ErreurDevis("niveau_invalide", `Niveau « ${niveau} » inconnu pour la catégorie ${categorie} (attendus : ${dispo.join(", ")}).`);
    }
    return niveau;
  }
  if (dispo.length === 1) return dispo[0];
  throw new ErreurDevis("niveau_requis", `Niveau requis pour la catégorie ${categorie} (attendus : ${dispo.join(", ")}).`);
}

export function computeQuote(input: DevisInput): DevisResult {
  const section = input.section;
  const followMode: FollowMode = input.followMode ?? "ON_SITE";
  const nbBatiments = Math.max(1, Math.floor(input.nbBatiments ?? 1));

  // Lotissement : aucune catégorie au barème, aucun calcul automatique.
  if (section === "LOT") {
    return {
      ok: true,
      currency: "MAD",
      meta: {
        section: "LOT",
        sectionLabel: SECTION_LABELS.LOT,
        followMode: "ON_SITE",
        photoOptionAvailable: false,
        requiresQuotePersonnalise: true,
      },
      base: { nbBatiments: 1, surfaceTerrainHa: input.surfaceTerrainHa },
      honoraires: {
        rate: HONORAIRES_RATE,
        totalHT: null,
        tvaRate: TVA_RATE,
        tva: null,
        totalTTC: null,
        breakdown: { phaseA_esquisseAutorisation: null, phaseB_dceCps: null, phaseC_suivi: null },
      },
      visaCroa: { payableSeparately: true, note: VISA_CROA_NOTE },
      decennale: {
        applicable: false,
        note: "Pas de garantie décennale sur les travaux de lotissement (voiries/réseaux divers). La décennale s'applique aux constructions à venir sur chaque lot.",
      },
      notes: [
        "La grille tarifaire des honoraires de lotissement (par tranche de surface en hectares) est en cours de finalisation par CITURBAREA.",
        "Notre équipe vous recontacte sous 24h pour vous proposer un devis personnalisé.",
        "Référence légale : Loi 25-90 (lotissements) + Contrat type unifié Lotissement (CNOA 28-02-2024).",
      ],
    };
  }

  const demandee = input.categoryCode;
  if (!demandee) throw new ErreurDevis("categorie_requise", `categoryCode requis pour la section ${section}.`);
  if (!estCategorieConnue(demandee)) throw new ErreurDevis("categorie_inconnue", `Catégorie inconnue : ${demandee}.`);

  const surfacePlancherM2 = input.surfacePlancherM2;
  if (!surfacePlancherM2 || surfacePlancherM2 <= 0) {
    throw new ErreurDevis("surface_requise", "surfacePlancherM2 requis et > 0.");
  }

  // Règles de surface du barème (1.1 ≤ 500 m², 6.1 ≤ 50 m²) avant toute chose.
  const { categorie, bascule } = resoudreCategorie(demandee, surfacePlancherM2);
  const cat = BAREME_CNOA_2021[categorie];
  if (!cat.validSections.includes(section)) {
    throw new ErreurDevis(
      "categorie_section_invalide",
      `Catégorie ${categorie} non valide pour la section ${section}. Sections valides : ${cat.validSections.join(", ")}.`,
    );
  }

  const niveau = resoudreNiveau(categorie, input.niveau);
  const bas = basFourchette(categorie, niveau) as number;
  const fourchette = fourchetteDe(categorie, niveau) as Fourchette;

  const coutReel = surfacePlancherM2 * bas * nbBatiments;
  const coutPlancher = surfacePlancherM2 * cat.costPerM2 * nbBatiments;
  const coutRetenu = Math.max(coutReel, coutPlancher);

  const effectiveFollowMode: FollowMode = !cat.photoOptionAvailable && followMode === "PHOTOS" ? "ON_SITE" : followMode;
  const phaseCRate = effectiveFollowMode === "PHOTOS" ? PHASE_C_PHOTOS_RATE : PHASE_C_ON_SITE_RATE;

  const totalHT = Math.round(coutRetenu * HONORAIRES_RATE);
  const tva = Math.round(totalHT * TVA_RATE);
  const totalTTC = totalHT + tva;

  const notes: string[] = [
    "Honoraires calculés sur estimation provisoire (article 5 du contrat type unifié Construction CNOA).",
    "Le montant final sera révisé sur la base du coût réel des travaux après adjudication.",
    "Standing à confirmer par le client : les honoraires peuvent être révisés à la hausse en cas de constatation d'un standing supérieur ou de demande de montée en gamme du maître d'ouvrage.",
    "TVA 20% incluse en sus des honoraires HT.",
  ];
  if (bascule?.raison === "surface_sup_500") {
    notes.push(`Au-delà de ${500} m² de plancher, le barème CNOA classe le projet en collectif (catégorie 3.1) : la catégorie 1.1 ne s'applique plus.`);
  }
  if (bascule?.raison === "amg_petite_surface" || bascule?.raison === "amg_grande_surface") {
    notes.push(`Aménagement : la catégorie dépend de la surface (≤ 50 m² → 6.1, au-delà → 6.2), pas de l'activité exercée dans le local.`);
  }
  if (cat.notes) notes.push(`Catégorie : ${cat.notes}`);
  if (!cat.photoOptionAvailable && followMode === "PHOTOS") {
    notes.push("Suivi photos non disponible pour cette catégorie — DCE+CPS+suivi physique obligatoires. Suivi physique appliqué (30%).");
  }
  if (effectiveFollowMode === "PHOTOS") {
    notes.push("Suivi par photos plateforme : 1 photo par réception (gros œuvre par élément de structure + second œuvre par étage).");
  }

  return {
    ok: true,
    currency: "MAD",
    meta: {
      section,
      sectionLabel: SECTION_LABELS[section],
      category: categorie,
      categoryLabel: cat.label,
      niveau,
      followMode: effectiveFollowMode,
      photoOptionAvailable: cat.photoOptionAvailable,
      requiresQuotePersonnalise: false,
      bascule,
    },
    base: {
      surfacePlancherM2,
      nbBatiments,
      coutConstructionM2: bas,
      coutTravauxEstime: coutRetenu,
      coutReel,
      coutPlancher,
      coutRetenu,
      fourchette,
    },
    conformite: {
      plancherRespecte: coutRetenu >= coutPlancher,
      categorie,
      plancherM2: cat.costPerM2,
    },
    honoraires: {
      rate: HONORAIRES_RATE,
      totalHT,
      tvaRate: TVA_RATE,
      tva,
      totalTTC,
      breakdown: {
        phaseA_esquisseAutorisation: Math.round(totalHT * PHASE_A_RATE),
        phaseB_dceCps: Math.round(totalHT * PHASE_B_RATE),
        phaseC_suivi: Math.round(totalHT * phaseCRate),
      },
    },
    visaCroa: { payableSeparately: true, note: VISA_CROA_NOTE },
    decennale: decennaleDe(section),
    notes,
  };
}
