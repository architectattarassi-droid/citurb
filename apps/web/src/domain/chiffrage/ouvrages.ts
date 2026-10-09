/**
 * Bibliothèque d'OUVRAGES avec sous-détail de prix (format du décret
 * 2-22-431 : matériaux, main-d'œuvre, matériel, puis frais et marge via K).
 *
 * Pour chaque ouvrage, par unité d'ouvrage :
 *   - `mat`  : matériau du référentiel × quantité × (1 + pertes) ;
 *   - `mo`   : heures par métier × coût horaire chargé ;
 *   - `ouv`  : sous-ouvrage (on reprend son déboursé sec, sans K) ;
 *   - petit matériel = 5 % de la main-d'œuvre (hypothèse).
 * Les quantités élémentaires et les temps unitaires sont des HYPOTHÈSES
 * (règles de l'art, temps calibrés sur les prix posés du marché) : aucune
 * productivité marocaine n'est publiée (marche-prive-main-oeuvre.md §4.2).
 * Les temps CYPE cités (marches-publics.md §4) sont repris quand ils existent.
 */
import type { CodeLot } from "./lots";
import type { Metier } from "./referentiel";

export type Composant =
  | { type: "mat"; ref: string; qte: number; perte?: number; note?: string }
  | { type: "mo"; metier: Metier; h: number }
  | { type: "ouv"; ref: string; qte: number; note?: string };

export type Ouvrage = {
  code: string;
  lot: CodeLot;
  libelle: string;
  unite: string;
  composants: Composant[];
  /** Fourni-posé par un sous-traitant : coefficient de coordination au lieu de K. */
  sousTraite?: boolean;
  /**
   * Famille de coût si elle diffère de celle du lot. Cloisons, enduits
   * intérieurs et chapes relèvent du second œuvre (convention des corps
   * d'état ; LeChantier : gros œuvre 42 %, second œuvre 34 %, finitions 24 %).
   */
  famille?: "SECOND_OEUVRE";
  /** Ouvrage technique interne (non affiché comme ligne de DQE). */
  interne?: boolean;
  cps?: string;
  terriscan?: string;
  /** Hypothèses de quantités et de temps propres à l'ouvrage. */
  note?: string;
};

const mat = (ref: string, qte: number, perte = 0, note?: string): Composant => ({ type: "mat", ref, qte, perte, ...(note ? { note } : {}) });
const mo = (metier: Metier, h: number): Composant => ({ type: "mo", metier, h });
const ouv = (ref: string, qte: number, note?: string): Composant => ({ type: "ouv", ref, qte, ...(note ? { note } : {}) });

const O = (o: Ouvrage) => o;

/** Acier façonné posé par m³ selon l'élément (ratios kg/m³, hypothèses BET usuelles). */
export const RATIO_ACIER = {
  semellesIsolees: 50,
  semellesFilantes: 60,
  radier: 85,
  longrines: 100,
  poteaux: 130,
  poutres: 110,
  dallePleine: 90,
  voile: 70,
  voileEnterre: 100,
  soutenement: 90,
  escalier: 90,
} as const;

/** Coffrage par m³ de béton (m²/m³), hypothèses géométriques. */
export const RATIO_COFFRAGE = {
  semelles: 1,
  radier: 0.5,
  longrines: 6,
  poteaux: 10,
  poutres: 8,
  dallePleine: 5.5,
  voile: 10,
  escalier: 7,
} as const;

/** Béton armé : béton mis en place + acier + coffrage (+ MO complémentaire). */
const ba = (code: string, lot: CodeLot, libelle: string, beton: "X.BETON_B25" | "X.BETON_B30", acier: number, coffrage: number, extra: Composant[] = [], o: Partial<Ouvrage> = {}): Ouvrage => O({
  code, lot, libelle, unite: "m³",
  composants: [ouv(beton, 1), ouv("X.ACIER", acier, `${acier} kg/m³`), ouv("X.COFFRAGE", coffrage, `${coffrage} m² de coffrage par m³`), ...extra],
  note: `Ratio acier ${acier} kg/m³ et coffrage ${coffrage} m²/m³ : hypothèses BET usuelles, à remplacer par la note de calcul.`,
  ...o,
});

export const OUVRAGES: Record<string, Ouvrage> = Object.fromEntries([
  // ── Sous-ouvrages techniques ───────────────────────────────────────────
  O({ code: "X.MORTIER", lot: "MAC", libelle: "Mortier de ciment dosé à 350 kg/m³", unite: "m³", interne: true,
    composants: [mat("CIMENT_CPJ45", 7, 0.03, "350 kg = 7 sacs"), mat("SABLE", 1.1), mo("manoeuvre", 3)],
    note: "Malaxage en bétonnière : 3 h de manœuvre par m³ (hypothèse)." }),
  O({ code: "X.BETON_B15", lot: "FON", libelle: "Béton B15 mis en place", unite: "m³", interne: true,
    composants: [mat("BPE_B15", 1, 0.05), mo("manoeuvre", 1.2), mo("macon", 0.3)] }),
  O({ code: "X.BETON_B25", lot: "STR", libelle: "Béton B25 mis en place et vibré", unite: "m³", interne: true,
    composants: [mat("BPE_B25", 1, 0.03), mo("manoeuvre", 1.5), mo("macon", 0.5)],
    note: "BPE livré ; pertes 3 % ; mise en place et vibration 2 h/m³ (hypothèse)." }),
  O({ code: "X.BETON_B30", lot: "FON", libelle: "Béton B30 mis en place et vibré", unite: "m³", interne: true,
    composants: [mat("BPE_B30", 1, 0.03), mo("manoeuvre", 1.5), mo("macon", 0.5)] }),
  O({ code: "X.ACIER", lot: "STR", libelle: "Acier HA façonné et posé", unite: "kg", interne: true,
    composants: [mat("ACIER_HA", 1, 0.05, "chutes et recouvrements 5 %"), mat("FIL_ATTACHE", 0.01), mo("ferrailleur", 0.05), mo("manoeuvre", 0.03)],
    note: "Temps de façonnage-pose 0,08 h/kg (CYPE : 0,10 h/kg, fiabilité C)." }),
  O({ code: "X.COFFRAGE", lot: "STR", libelle: "Coffrage bois (réemploi 3 à 4 fois)", unite: "m²", interne: true,
    composants: [mat("CTBX18", 0.3, 0, "panneau réemployé 3 à 4 fois"), mat("BOIS_COFFRAGE", 0.006, 0, "bastaings, étais bois"), mo("coffreur", 0.6), mo("manoeuvre", 0.3)],
    note: "Prix posé recoupé avec coffrage-fond-lcgo / coffrage-dalle-lcgo (120-250 DH/m²)." }),

  // ── 01 Terrassements ───────────────────────────────────────────────────
  O({ code: "TER.01", lot: "TER", libelle: "Décapage de la terre végétale sur 20 cm", unite: "m²", cps: "1.01", terriscan: "GO.01.B.01",
    composants: [mat("MINI_PELLE", 1 / 250, 0, "250 m²/jour"), mo("manoeuvre", 0.05)] }),
  O({ code: "TER.02", lot: "TER", libelle: "Déblai en pleine masse, terrain ordinaire", unite: "m³", cps: "1.02", terriscan: "GO.01.B.02",
    composants: [mat("MINI_PELLE", 1 / 60, 0, "60 m³/jour"), mo("manoeuvre", 0.15)] }),
  O({ code: "TER.03", lot: "TER", libelle: "Fouilles en rigole et en trou pour fondations", unite: "m³", cps: "1.03", terriscan: "GO.01.B.03",
    composants: [mat("MINI_PELLE", 1 / 30, 0, "30 m³/jour"), mo("manoeuvre", 0.5)] }),
  O({ code: "TER.04", lot: "TER", libelle: "Plus-value pour déblai en terrain rocheux (BRH)", unite: "m³",
    composants: [mat("BRH", 1 / 25, 0, "25 m³/jour"), mat("MINI_PELLE", 1 / 25), mo("manoeuvre", 0.3)],
    note: "Hypothèse : rendement 25 m³/jour au brise-roche." }),
  O({ code: "TER.05", lot: "TER", libelle: "Évacuation des déblais excédentaires (foisonnés)", unite: "m³", cps: "1.06", terriscan: "GO.01.B.04",
    composants: [mat("EVACUATION", 1), mat("MINI_PELLE", 1 / 150, 0, "chargement 150 m³/jour")] }),
  O({ code: "TER.06", lot: "TER", libelle: "Remblai compacté en matériau d'apport (tout-venant)", unite: "m³", cps: "1.04", terriscan: "GO.01.B.05",
    composants: [mat("TOUT_VENANT", 1.25, 0, "compactage 25 %"), mat("MINI_PELLE", 1 / 100), mo("manoeuvre", 0.4)] }),
  O({ code: "TER.07", lot: "TER", libelle: "Remblai compacté en réemploi des déblais", unite: "m³", cps: "1.05",
    composants: [mat("MINI_PELLE", 1 / 80), mo("manoeuvre", 0.3)] }),
  O({ code: "TER.08", lot: "TER", libelle: "Blindage et soutènement provisoire des fouilles", unite: "m²", cps: "1.07",
    composants: [mat("BLINDAGE", 1)] }),
  O({ code: "TER.09", lot: "TER", libelle: "Épuisement des eaux / rabattement de nappe", unite: "sem", cps: "1.08",
    composants: [mat("POMPE_EPUISEMENT", 1)] }),

  // ── 02 Fondations, infrastructure, soutènement ─────────────────────────
  O({ code: "FON.01", lot: "FON", libelle: "Béton de propreté B15, ép. 10 cm", unite: "m²", cps: "2.01", terriscan: "GO.02.A.01",
    composants: [mat("BPE_B15", 0.1, 0.05), mo("manoeuvre", 0.15), mo("macon", 0.05)] }),
  ba("FON.02", "FON", "Béton armé pour semelles isolées", "X.BETON_B25", RATIO_ACIER.semellesIsolees, RATIO_COFFRAGE.semelles, [], { cps: "2.03", terriscan: "GO.02.A.02" }),
  ba("FON.03", "FON", "Béton armé pour semelles filantes", "X.BETON_B25", RATIO_ACIER.semellesFilantes, RATIO_COFFRAGE.semelles, [], { cps: "2.03", terriscan: "GO.02.A.02" }),
  ba("FON.04", "FON", "Radier général en béton armé", "X.BETON_B25", RATIO_ACIER.radier, RATIO_COFFRAGE.radier, [mat("POMPAGE", 1)], { cps: "2.03" }),
  ba("FON.05", "FON", "Béton armé pour longrines", "X.BETON_B25", RATIO_ACIER.longrines, RATIO_COFFRAGE.longrines, [], { cps: "2.03", terriscan: "GO.02.A.03" }),
  ba("FON.06", "FON", "Béton armé pour amorces de poteaux", "X.BETON_B25", RATIO_ACIER.poteaux, RATIO_COFFRAGE.poteaux, [], { cps: "2.03", terriscan: "GO.02.A.03" }),
  O({ code: "FON.07", lot: "FON", libelle: "Hérisson / couche de forme en tout-venant, ép. 20 cm", unite: "m²", terriscan: "GO.02.A.05",
    composants: [mat("TOUT_VENANT", 0.22), mo("manoeuvre", 0.3)] }),
  O({ code: "FON.08", lot: "FON", libelle: "Dallage sur terre-plein en béton armé de treillis soudé, ép. 12 cm", unite: "m²", cps: "2.08", terriscan: "GO.02.A.06",
    composants: [ouv("X.BETON_B25", 0.12), mat("TREILLIS_ST25", 1.15, 0, "recouvrements 15 %"), mo("macon", 0.25), mo("manoeuvre", 0.4)] }),
  O({ code: "FON.09", lot: "FON", libelle: "Gros béton de rattrapage / substitution", unite: "m³", cps: "2.02",
    composants: [ouv("X.BETON_B15", 1), mo("manoeuvre", 0.5)] }),
  O({ code: "FON.10", lot: "FON", libelle: "Voile périphérique enterré en béton armé B30, ép. 20 cm", unite: "m²", cps: "2.04",
    composants: [ouv("X.BETON_B30", 0.2), ouv("X.ACIER", 0.2 * RATIO_ACIER.voileEnterre, "100 kg/m³"), ouv("X.COFFRAGE", 2, "2 faces")],
    note: "Voile de sous-sol appuyé en tête par le plancher haut : 20 cm jusqu'à 3 m de hauteur de terre, 100 kg/m³ (hypothèse à valider par le BET)." }),
  O({ code: "FON.11", lot: "FON", libelle: "Mur de soutènement en béton armé en L (h ≤ 3 m), par m² de parement", unite: "m²",
    composants: [ouv("X.BETON_B30", 0.45, "voile 25 cm + semelle ≈ 0,6 h"), ouv("X.ACIER", 0.45 * RATIO_ACIER.soutenement), ouv("X.COFFRAGE", 2.4), mat("DRAIN_PVC", 0.3, 0, "barbacanes")],
    note: "Mur cantilever autostable : 0,45 m³ de béton par m² de parement (voile + semelle), 90 kg/m³ (hypothèse)." }),
  O({ code: "FON.12", lot: "FON", libelle: "Drainage périphérique : drain Ø100, massif drainant, géotextile", unite: "ml", terriscan: "GO.05.A.02",
    composants: [mat("DRAIN_PVC", 1, 0.05), mat("GRAVIER", 0.25), mat("GEOTEXTILE", 1.5), mo("manoeuvre", 0.6)] }),
  O({ code: "FON.13", lot: "FON", libelle: "Étanchéité des parois enterrées : primaire + membrane bitumineuse + protection", unite: "m²", terriscan: "GO.05.A.02",
    composants: [mat("PRIMAIRE_EIF", 0.3), mat("MEMBRANE_SBS4", 1, 0.15), mat("GEOTEXTILE", 1.1), mo("etancheur", 0.35), mo("manoeuvre", 0.15)] }),
  O({ code: "FON.14", lot: "FON", libelle: "Cuvelage intérieur (présence de nappe)", unite: "m²", terriscan: "GO.05.A.02", sousTraite: true,
    composants: [mat("CUVELAGE_HYDRO", 1)], note: "Aucun prix sourcé : hypothèse à remplacer par un devis d'étancheur." }),

  // ── 03 Structure béton armé ────────────────────────────────────────────
  ba("STR.01", "STR", "Béton armé pour poteaux", "X.BETON_B25", RATIO_ACIER.poteaux, RATIO_COFFRAGE.poteaux, [], { cps: "2.04", terriscan: "GO.03.A.01" }),
  ba("STR.02", "STR", "Béton armé pour poutres, chaînages et linteaux", "X.BETON_B25", RATIO_ACIER.poutres, RATIO_COFFRAGE.poutres, [], { cps: "2.04", terriscan: "GO.03.A.02" }),
  O({ code: "STR.03", lot: "STR", libelle: "Plancher à corps creux 16+4 (poutrelles, hourdis, dalle de compression)", unite: "m²", cps: "2.06", terriscan: "GO.03.A.03",
    composants: [mat("POUTRELLE", 1.67, 0.05, "entraxe 60 cm"), mat("HOURDIS16", 8.33, 0.05), ouv("X.BETON_B25", 0.065, "compression 4 cm + clavetage"), mat("POMPAGE", 0.065), mat("TREILLIS_ST25", 1.15), mat("BOIS_COFFRAGE", 0.003, 0, "étaiement"), mo("macon", 0.35), mo("manoeuvre", 0.6)],
    note: "Recoupé avec op-lechantier-dalle-hourdis (350-545 DH/m² posé)." }),
  O({ code: "STR.04", lot: "STR", libelle: "Plancher à corps creux 20+5 (grandes portées)", unite: "m²", cps: "2.06", terriscan: "GO.03.A.03",
    composants: [mat("POUTRELLE", 1.67, 0.05, "entraxe 60 cm"), mat("HOURDIS20", 8.33, 0.05), ouv("X.BETON_B25", 0.085), mat("POMPAGE", 0.085), mat("TREILLIS_ST25", 1.15), mat("BOIS_COFFRAGE", 0.0035), mo("macon", 0.4), mo("manoeuvre", 0.7)] }),
  ba("STR.05", "STR", "Dalle pleine en béton armé (balcons, porte-à-faux, paliers)", "X.BETON_B25", RATIO_ACIER.dallePleine, RATIO_COFFRAGE.dallePleine, [mat("POMPAGE", 1)], { cps: "2.05", terriscan: "GO.03.A.04" }),
  ba("STR.06", "STR", "Escalier en béton armé (paillasse et marches)", "X.BETON_B25", RATIO_ACIER.escalier, RATIO_COFFRAGE.escalier, [mo("macon", 4)], { cps: "2.07", terriscan: "GO.03.A.05" }),
  ba("STR.07", "STR", "Voiles en béton armé (cage d'escalier / d'ascenseur)", "X.BETON_B25", RATIO_ACIER.voile, RATIO_COFFRAGE.voile, [], { cps: "2.04" }),
  O({ code: "STR.08", lot: "STR", libelle: "Acrotère maçonné h 0,60 m avec chaînage et enduit", unite: "ml",
    composants: [ouv("MAC.02", 0.6), ouv("STR.02", 0.03), ouv("MAC.05", 1.3)],
    note: "Recoupé avec op-lechantier-acrotere (250-400 DH/ml)." }),

  // ── 04 Maçonnerie et enduits ───────────────────────────────────────────
  O({ code: "MAC.01", lot: "MAC", libelle: "Mur en agglos creux de 20 cm", unite: "m²", cps: "3.01", terriscan: "GO.04.A.01",
    composants: [mat("AGGLO20", 12.5, 0.05), ouv("X.MORTIER", 0.02), mo("macon", 0.8), mo("manoeuvre", 0.8)],
    note: "12,5 agglos/m² ; 10 m²/jour par binôme (hypothèse ; CYPE 1,9-2,1 h/m²). Recoupé avec op-lechantier-agglo20 (180-250)." }),
  O({ code: "MAC.02", lot: "MAC", libelle: "Mur en agglos creux de 15 cm", unite: "m²", cps: "3.01",
    composants: [mat("AGGLO15", 12.5, 0.05), ouv("X.MORTIER", 0.015), mo("macon", 0.7), mo("manoeuvre", 0.7)] }),
  O({ code: "MAC.03", lot: "MAC", famille: "SECOND_OEUVRE", libelle: "Cloison en agglos creux de 10 cm", unite: "m²", terriscan: "GO.04.A.02",
    composants: [mat("AGGLO10", 12.5, 0.05), ouv("X.MORTIER", 0.01), mo("macon", 0.6), mo("manoeuvre", 0.5)] }),
  O({ code: "MAC.05", lot: "MAC", famille: "SECOND_OEUVRE", libelle: "Enduit de ciment intérieur dressé (murs)", unite: "m²", cps: "3.07", terriscan: "GO.04.A.04",
    composants: [ouv("X.MORTIER", 0.02), mo("macon", 0.4), mo("manoeuvre", 0.35)],
    note: "Temps calibré sur les prix posés (LeChantier 35-65, 7rafti 80-160 : sources contradictoires) ; CYPE donne 1,6-1,7 h/m²." }),
  O({ code: "MAC.06", lot: "MAC", famille: "SECOND_OEUVRE", libelle: "Enduit de ciment sous plafond", unite: "m²", cps: "3.07",
    composants: [ouv("X.MORTIER", 0.018), mo("macon", 0.5), mo("manoeuvre", 0.4)] }),
  O({ code: "MAC.07", lot: "MAC", famille: "SECOND_OEUVRE", libelle: "Chape de ciment ép. 5 cm (support des revêtements)", unite: "m²", terriscan: "FIN.01.A.01",
    composants: [ouv("X.MORTIER", 0.05, "dosage courant"), mo("macon", 0.2), mo("manoeuvre", 0.25)] }),

  // ── 05 Étanchéité et isolation ─────────────────────────────────────────
  O({ code: "ETA.01", lot: "ETA", libelle: "Forme de pente en mortier, ép. moyenne 6 cm", unite: "m²", cps: "4.01",
    composants: [ouv("X.MORTIER", 0.06), mo("macon", 0.2), mo("manoeuvre", 0.3)] }),
  O({ code: "ETA.02", lot: "ETA", libelle: "Étanchéité bicouche bitume SBS (3 + 4 mm) soudée", unite: "m²", cps: "4.04", terriscan: "GO.05.A.01",
    composants: [mat("PRIMAIRE_EIF", 0.3), mat("MEMBRANE_SBS3", 1, 0.15), mat("MEMBRANE_SBS4", 1, 0.15), mo("etancheur", 0.25), mo("manoeuvre", 0.15)],
    note: "Recoupé avec op-lechantier-etanch-systemes (110-160 TTC) et op-lechantier-etanch-terrasse (80-150)." }),
  O({ code: "ETA.03", lot: "ETA", libelle: "Protection lourde : chape 4 cm sur géotextile", unite: "m²", cps: "4.06",
    composants: [ouv("X.MORTIER", 0.04), mat("GEOTEXTILE", 1.1), mo("macon", 0.15), mo("manoeuvre", 0.25)] }),
  O({ code: "ETA.04", lot: "ETA", libelle: "Isolation thermique de toiture XPS 4 cm", unite: "m²", cps: "4.03",
    composants: [mat("XPS4", 1, 0.05), mo("manoeuvre", 0.1)] }),
  O({ code: "ETA.05", lot: "ETA", libelle: "Isolation thermique de toiture PSE 4 cm", unite: "m²", cps: "4.03",
    composants: [mat("PSE4", 1, 0.05), mo("manoeuvre", 0.1)] }),
  O({ code: "ETA.06", lot: "ETA", libelle: "Relevés d'étanchéité sur acrotères (h ≥ 15 cm)", unite: "ml", cps: "4.05",
    composants: [mat("PRIMAIRE_EIF", 0.15), mat("MEMBRANE_SBS3", 0.5, 0.15), mat("MEMBRANE_SBS4", 0.5, 0.15), mo("etancheur", 0.2)] }),
  O({ code: "ETA.07", lot: "ETA", libelle: "Étanchéité sous carrelage des pièces humides", unite: "m²",
    composants: [mat("PRIMAIRE_EIF", 0.3), mat("MEMBRANE_SBS3", 1, 0.15), mo("etancheur", 0.3), mo("manoeuvre", 0.1)] }),

  // ── 07 Façades ─────────────────────────────────────────────────────────
  O({ code: "FAC.01", lot: "FAC", libelle: "Enduit extérieur 3 couches (échafaudage compris)", unite: "m²", cps: "3.08",
    composants: [ouv("X.MORTIER", 0.025), mo("macon", 0.5), mo("manoeuvre", 0.45)],
    note: "Recoupé avec le monocouche façade 85-140 DH/m² (marche-prive-main-oeuvre.md §3)." }),
  O({ code: "FAC.02", lot: "FAC", libelle: "Peinture façade vinylique 2 couches sur impression", unite: "m²",
    composants: [mat("IMPRESSION", 0.12), mat("PEINT_FACADE", 0.6, 0.05), mo("peintre", 0.8), mo("manoeuvre", 0.2)] }),
  O({ code: "FAC.03", lot: "FAC", libelle: "Peinture façade siloxane 2 couches sur impression", unite: "m²",
    composants: [mat("IMPRESSION", 0.12), mat("PEINT_SILOXANE", 0.35, 0.05), mo("peintre", 0.8), mo("manoeuvre", 0.2)] }),
  O({ code: "FAC.04", lot: "FAC", libelle: "Habillage de façade en pierre naturelle collée", unite: "m²",
    composants: [mat("MARBRE_LOCAL", 1, 0.08, "proxy : pierre locale 2 cm"), mat("COLLE_C2", 8), mo("carreleur", 1.5), mo("manoeuvre", 0.8)],
    note: "Pas de prix d'habillage pierre en façade : composé à partir du marbre local (hypothèse)." }),

  // ── 08 Menuiseries extérieures alu ─────────────────────────────────────
  O({ code: "ALU.01", lot: "ALU", libelle: "Fenêtres alu sans RPT, vitrage simple ou double basique, posées", unite: "m²", cps: "7", terriscan: "FIN.03.A.01", sousTraite: true,
    composants: [mat("ALU_ECO", 1), mat("ALU_POSE", 1)] }),
  O({ code: "ALU.02", lot: "ALU", libelle: "Fenêtres alu RPT double vitrage 4/16/4, posées", unite: "m²", cps: "7", terriscan: "FIN.03.A.01", sousTraite: true,
    composants: [mat("ALU_MOY", 1), mat("ALU_POSE", 1)], note: "Recoupé avec tv-alu-moy-p (1 150-1 800 HT posé)." }),
  O({ code: "ALU.03", lot: "ALU", libelle: "Menuiseries alu RPT renforcé, grandes baies, posées", unite: "m²", cps: "7", sousTraite: true,
    composants: [mat("ALU_HAUT", 1), mat("ALU_POSE", 1)] }),
  O({ code: "ALU.04", lot: "ALU", libelle: "Baies levant-coulissantes premium, posées", unite: "m²", cps: "7", sousTraite: true,
    composants: [mat("ALU_LUXE", 1), mat("ALU_POSE", 1.3)] }),
  O({ code: "ALU.05", lot: "ALU", libelle: "Volets roulants aluminium", unite: "m²", sousTraite: true,
    composants: [mat("VOLET_ALU", 1), mat("ALU_POSE", 0.5)] }),
  O({ code: "ALU.06", lot: "ALU", libelle: "Porte d'entrée aluminium pleine, posée", unite: "u", sousTraite: true,
    composants: [mat("PORTE_ENTREE_ALU", 1), mat("ALU_POSE", 2.2)] }),

  // ── 09 Menuiseries intérieures bois ────────────────────────────────────
  O({ code: "BOI.01", lot: "BOI", libelle: "Porte intérieure isoplane mélaminée, posée", unite: "u", cps: "8", terriscan: "SO.03.A.01", sousTraite: true,
    composants: [mat("PORTE_ECO", 1), mat("POSE_PORTE", 1)] }),
  O({ code: "BOI.02", lot: "BOI", libelle: "Bloc-porte intérieur complet, posé", unite: "u", cps: "8", terriscan: "SO.03.A.01", sousTraite: true,
    composants: [mat("PORTE_MOY", 1), mat("POSE_PORTE", 1)] }),
  O({ code: "BOI.03", lot: "BOI", libelle: "Porte intérieure en pin massif, posée", unite: "u", cps: "8", sousTraite: true,
    composants: [mat("PORTE_HAUT", 1), mat("POSE_PORTE_MASSIF", 1)] }),
  O({ code: "BOI.04", lot: "BOI", libelle: "Porte intérieure en chêne massif, posée", unite: "u", cps: "8", sousTraite: true,
    composants: [mat("PORTE_LUXE", 1), mat("POSE_PORTE_MASSIF", 1)] }),
  O({ code: "BOI.05", lot: "BOI", libelle: "Porte d'entrée en bois massif, posée", unite: "u", cps: "8", sousTraite: true,
    composants: [mat("PORTE_ENTREE_BOIS", 1), mat("POSE_PORTE_MASSIF", 1.5)] }),
  O({ code: "BOI.07", lot: "BOI", libelle: "Placards : façades coulissantes et aménagement intérieur", unite: "ml", cps: "8", terriscan: "SO.03.A.02", sousTraite: true,
    composants: [mat("PLACARD", 1)] }),
  O({ code: "BOI.06", lot: "BOI", libelle: "Cuisine équipée sur mesure (hors électroménager), posée", unite: "ml", sousTraite: true,
    composants: [mat("CUISINE_ML", 1)] }),

  // ── 10 Métallerie ──────────────────────────────────────────────────────
  O({ code: "MET.01", lot: "MET", libelle: "Garde-corps aluminium à barreaudage, posé", unite: "ml", cps: "9", terriscan: "SO.01.A.04", sousTraite: true,
    composants: [mat("GC_ALU", 1), mat("GC_POSE", 1)] }),
  O({ code: "MET.02", lot: "MET", libelle: "Garde-corps inox 304, posé", unite: "ml", cps: "9", sousTraite: true,
    composants: [mat("GC_INOX", 1), mat("GC_POSE", 1)] }),
  O({ code: "MET.03", lot: "MET", libelle: "Garde-corps verre trempé et montants inox, posé", unite: "ml", cps: "9", sousTraite: true,
    composants: [mat("GC_VERRE", 1), mat("GC_POSE", 1)] }),
  O({ code: "MET.04", lot: "MET", libelle: "Garde-corps tout verre feuilleté, posé", unite: "ml", cps: "9", sousTraite: true,
    composants: [mat("GC_TOUT_VERRE", 1), mat("GC_POSE", 1)] }),

  // ── 12 Faux plafonds ───────────────────────────────────────────────────
  O({ code: "FPL.01", lot: "FPL", libelle: "Faux plafond BA13 sur ossature galvanisée", unite: "m²", cps: "18", terriscan: "SO.02.A.01",
    composants: [mat("BA13", 1, 0.05), mat("OSSATURE", 2.5, 0, "fourrures + suspentes"), mo("platrier", 0.5), mo("manoeuvre", 0.1)],
    note: "Recoupé avec mn-fp-ba13 et op-mano-fauxplafond (130-200 DH/m² posé)." }),
  O({ code: "FPL.02", lot: "FPL", libelle: "Faux plafond staff décoratif avec corniches", unite: "m²", cps: "19", sousTraite: true,
    composants: [mat("STAFF_DECO_POSE", 1), mat("CORNICHE", 0.3)] }),

  // ── 13 Revêtements de sols ─────────────────────────────────────────────
  O({ code: "RSO.01", lot: "RSO", libelle: "Carrelage grès cérame 45×45 scellé, joints compris", unite: "m²", cps: "11", terriscan: "FIN.01.A.02",
    composants: [mat("CARREAU_45", 1, 0.08), ouv("X.MORTIER", 0.03, "pose scellée"), mo("carreleur", 0.6), mo("manoeuvre", 0.3)] }),
  O({ code: "RSO.02", lot: "RSO", libelle: "Carrelage grès cérame 60×60 collé, joints compris", unite: "m²", cps: "11", terriscan: "FIN.01.A.02",
    composants: [mat("CARREAU_60", 1, 0.08), mat("COLLE_C2", 5), mo("carreleur", 0.7), mo("manoeuvre", 0.3)] }),
  O({ code: "RSO.03", lot: "RSO", libelle: "Carrelage grès cérame grand format collé (double encollage)", unite: "m²", cps: "11",
    composants: [mat("CARREAU_GF", 1, 0.1), mat("COLLE_C2", 6), mo("carreleur", 0.9), mo("manoeuvre", 0.4)] }),
  O({ code: "RSO.04", lot: "RSO", libelle: "Marbre local poli 2 cm, posé, poncé et cristallisé", unite: "m²", cps: "11",
    composants: [mat("MARBRE_LOCAL", 1, 0.08), ouv("X.MORTIER", 0.03), mo("carreleur", 2.2), mo("manoeuvre", 0.6)],
    note: "Pose + polissage : lc-mb-pose 180-350 DH/m² (C)." }),
  O({ code: "RSO.05", lot: "RSO", libelle: "Marbre importé poli 2 cm, posé, poncé et cristallisé", unite: "m²", cps: "11",
    composants: [mat("MARBRE_IMPORT", 1, 0.08), ouv("X.MORTIER", 0.03), mo("carreleur", 2.4), mo("manoeuvre", 0.6)] }),
  O({ code: "RSO.06", lot: "RSO", libelle: "Plinthes assorties", unite: "ml", cps: "11",
    composants: [mat("PLINTHE", 1, 0.05), mat("COLLE_C2", 0.5), mo("carreleur", 0.15)] }),

  // ── 14 Revêtements muraux ──────────────────────────────────────────────
  O({ code: "RMU.01", lot: "RMU", libelle: "Faïence murale 30×60 collée (gamme courante)", unite: "m²", cps: "12", terriscan: "FIN.02.A.03",
    composants: [mat("FAIENCE_ECO", 1, 0.08), mat("COLLE_C2", 4), mo("carreleur", 0.8), mo("manoeuvre", 0.2)] }),
  O({ code: "RMU.02", lot: "RMU", libelle: "Faïence murale décor collée", unite: "m²", cps: "12", terriscan: "FIN.02.A.03",
    composants: [mat("FAIENCE_STD", 1, 0.08), mat("COLLE_C2", 4), mo("carreleur", 0.9), mo("manoeuvre", 0.2)] }),
  O({ code: "RMU.03", lot: "RMU", libelle: "Zellige 10×10 posé par maâlem", unite: "m²", cps: "12",
    composants: [mat("ZELLIGE", 1, 0.1), ouv("X.MORTIER", 0.02), mo("carreleur", 3), mo("manoeuvre", 0.5)],
    note: "Pose zellige par maâlem : lc-zl-pose 200-400 DH/m² (C)." }),

  // ── 15 Peinture intérieure ─────────────────────────────────────────────
  O({ code: "PEI.01", lot: "PEI", libelle: "Enduit de lissage + vinylique 2 couches (gamme éco)", unite: "m²", cps: "13", terriscan: "FIN.02.A.02",
    composants: [mat("ENDUIT_LISSAGE", 0.8), mat("IMPRESSION", 0.1), mat("PEINT_ECO", 0.35, 0.05), mo("peintre", 0.45), mo("manoeuvre", 0.1)],
    note: "Recoupé avec op-archiplan-peinture (30-60 fourni-posé)." }),
  O({ code: "PEI.02", lot: "PEI", libelle: "Enduit de lissage + vinylique lessivable 2 couches", unite: "m²", cps: "13",
    composants: [mat("ENDUIT_LISSAGE", 0.8), mat("IMPRESSION", 0.1), mat("PEINT_MOY", 0.35, 0.05), mo("peintre", 0.5), mo("manoeuvre", 0.1)] }),
  O({ code: "PEI.03", lot: "PEI", libelle: "Enduit 2 passes + acrylique mate haut de gamme 2 couches", unite: "m²", cps: "13",
    composants: [mat("ENDUIT_LISSAGE", 1.2), mat("IMPRESSION", 0.1), mat("PEINT_HAUT", 0.3, 0.05), mo("peintre", 0.7), mo("manoeuvre", 0.1)] }),

  // ── 16 Plomberie ───────────────────────────────────────────────────────
  O({ code: "PLO.01", lot: "PLO", libelle: "Point d'eau : alimentation PPR + évacuation PVC + raccords", unite: "u", cps: "14", terriscan: "TEC.02.A.01",
    composants: [mat("PPR20", 8, 0.05), mat("PVC_EVAC", 4, 0.05), mat("ACCESSOIRES_PLOMB", 1), mo("plombier", 2.5), mo("manoeuvre", 1)],
    note: "8 ml d'alimentation EF/EC et 4 ml d'évacuation par appareil (hypothèse). Recoupé avec op-7rafti-plomb-point (250-800)." }),
  O({ code: "PLO.02", lot: "PLO", libelle: "Équipement salle d'eau éco : pack WC, lavabo-colonne, cabine de douche", unite: "u", cps: "14", terriscan: "TEC.02.A.06",
    composants: [mat("WC_ECO", 1), mat("LAVABO_ECO", 1), mat("MIT_LAV_ECO", 1), mat("MIT_DOUCHE", 1), mat("CABINE_DOUCHE", 1), mo("plombier", 4)] }),
  O({ code: "PLO.03", lot: "PLO", libelle: "Équipement salle de bain courante : WC, lavabo, douche à l'italienne", unite: "u", cps: "14",
    composants: [mat("WC_MOY", 1), mat("LAVABO_MOY", 1), mat("MIT_LAV_ECO", 1), mat("MIT_DOUCHE", 1), mat("PAROI_DOUCHE", 1), mo("plombier", 5)] }),
  O({ code: "PLO.04", lot: "PLO", libelle: "Équipement salle de bain haut de gamme : WC suspendu, vasque, paroi", unite: "u", cps: "14",
    composants: [mat("WC_SUSPENDU", 1), mat("VASQUE_HAUT", 1), mat("MIT_LAV_HAUT", 1), mat("MIT_DOUCHE", 1), mat("PAROI_HAUT", 1), mo("plombier", 6)] }),
  O({ code: "PLO.05", lot: "PLO", libelle: "Équipement salle de bain luxe : WC suspendu, vasque, douche encastrée", unite: "u", cps: "14",
    composants: [mat("WC_SUSPENDU", 1), mat("VASQUE_HAUT", 1), mat("MIT_LAV_HAUT", 1), mat("KIT_DOUCHE_LUXE", 1), mat("PAROI_HAUT", 1), mo("plombier", 8)] }),
  O({ code: "PLO.06", lot: "PLO", libelle: "Évier de cuisine : mitigeur et raccordement", unite: "u", cps: "14",
    composants: [mat("MIT_EVIER", 1), mo("plombier", 1.5)] }),
  O({ code: "PLO.07", lot: "PLO", libelle: "Évier de cuisine : mitigeur haut de gamme", unite: "u", cps: "14",
    composants: [mat("MIT_EVIER_LUXE", 1), mo("plombier", 1.5)] }),
  O({ code: "PLO.09", lot: "PLO", libelle: "WC invités : pack WC et lave-mains", unite: "u", cps: "14",
    composants: [mat("WC_ECO", 1), mat("LAVABO_ECO", 0.6, 0, "lave-mains"), mat("MIT_LAV_ECO", 1), mo("plombier", 3)] }),
  O({ code: "PLO.10", lot: "PLO", libelle: "Chutes et collecteurs EU/EV en PVC Ø100-125 (y compris raccords)", unite: "ml", cps: "14", terriscan: "TEC.02.A.02",
    composants: [mat("PVC_EVAC", 1, 0.1), mat("ACCESSOIRES_PLOMB", 0.15, 0, "raccords, colliers"), mo("plombier", 0.4), mo("manoeuvre", 0.3)] }),
  O({ code: "PLO.08", lot: "PLO", libelle: "Chauffe-eau électrique 100 L avec groupe de sécurité", unite: "u", cps: "17", terriscan: "TEC.02.A.07",
    composants: [mat("CHAUFFE_EAU_100", 1), mat("ACCESSOIRES_PLOMB", 1), mo("plombier", 3)] }),

  // ── 17 Électricité ─────────────────────────────────────────────────────
  O({ code: "ELE.01", lot: "ELE", libelle: "Point lumineux simple allumage encastré (gaine, fil 1,5 mm², interrupteur)", unite: "u", cps: "15", terriscan: "TEC.01.A.01",
    composants: [mat("BOITE_ENC", 2), mat("GAINE_ICTA20", 8, 0.05), mat("FIL_15", 24, 0.05, "3 conducteurs × 8 m"), mat("INTER", 1), mo("electricien", 1), mo("manoeuvre", 0.3)],
    note: "8 ml de gaine par point (hypothèse). Recoupé avec op-7rafti-elec-point (110-320)." }),
  O({ code: "ELE.02", lot: "ELE", libelle: "Prise de courant 2P+T 16 A encastrée (fil 2,5 mm²)", unite: "u", cps: "15", terriscan: "TEC.01.A.03",
    composants: [mat("BOITE_ENC", 1), mat("GAINE_ICTA20", 7, 0.05), mat("FIL_25", 21, 0.05), mat("PRISE", 1), mo("electricien", 0.8), mo("manoeuvre", 0.3)] }),
  O({ code: "ELE.03", lot: "ELE", libelle: "Point lumineux avec appareillage design", unite: "u", cps: "15",
    composants: [mat("BOITE_ENC", 2), mat("GAINE_ICTA20", 8, 0.05), mat("FIL_15", 24, 0.05), mat("APPAREILLAGE_HAUT", 1), mo("electricien", 1.1), mo("manoeuvre", 0.3)] }),
  O({ code: "ELE.04", lot: "ELE", libelle: "Prise de courant avec appareillage design", unite: "u", cps: "15",
    composants: [mat("BOITE_ENC", 1), mat("GAINE_ICTA20", 7, 0.05), mat("FIL_25", 21, 0.05), mat("APPAREILLAGE_HAUT", 1), mo("electricien", 0.9), mo("manoeuvre", 0.3)] }),
  O({ code: "ELE.05", lot: "ELE", libelle: "Circuit spécialisé (plaque, four, lave-linge, chauffe-eau, clim)", unite: "u", cps: "15", terriscan: "TEC.01.A.04",
    composants: [mat("BOITE_ENC", 1), mat("GAINE_ICTA20", 15, 0.05), mat("FIL_25", 45, 0.05), mat("PRISE", 1), mo("electricien", 1.5), mo("manoeuvre", 0.4)] }),
  O({ code: "ELE.06", lot: "ELE", libelle: "Tableau électrique équipé (coffret 42 modules, différentiels 30 mA)", unite: "ens", cps: "15", terriscan: "TEC.01.A.09",
    composants: [mat("COFFRET42", 1), mat("DISJ", 14), mat("ID30", 2), mo("electricien", 8)] }),
  O({ code: "ELE.07", lot: "ELE", libelle: "Prise de terre et liaisons équipotentielles", unite: "ens", cps: "15", terriscan: "TEC.01.A.10",
    composants: [mat("TERRE", 1), mo("electricien", 3), mo("manoeuvre", 2)] }),
  O({ code: "CFA.01", lot: "CFA", libelle: "Courants faibles : coffret VDI, prises RJ45/TV, interphone", unite: "ens", cps: "20", terriscan: "TEC.01.A.11",
    composants: [mat("VDI_FORFAIT", 1), mo("electricien", 8)] }),

  O({ code: "CFA.02", lot: "CFA", libelle: "Alarme et vidéosurveillance", unite: "ens", sousTraite: true, composants: [mat("ALARME_VIDEO", 1)] }),
  O({ code: "CFA.03", lot: "CFA", libelle: "Domotique (éclairage, volets, climatisation)", unite: "ens", sousTraite: true, composants: [mat("DOMOTIQUE", 1)] }),

  // ── 19 Climatisation ───────────────────────────────────────────────────
  O({ code: "CVC.01", lot: "CVC", libelle: "Split inverter 12 000 BTU posé (chambre)", unite: "u", cps: "16", sousTraite: true,
    composants: [mat("SPLIT12", 1), mat("POSE_SPLIT", 1)] }),
  O({ code: "CVC.02", lot: "CVC", libelle: "Split inverter 24 000 BTU posé (séjour)", unite: "u", cps: "16", sousTraite: true,
    composants: [mat("SPLIT24", 1), mat("POSE_SPLIT", 1)] }),
  O({ code: "CVC.03", lot: "CVC", libelle: "Split premium 12 000 BTU posé", unite: "u", cps: "16", sousTraite: true,
    composants: [mat("SPLIT12_PREMIUM", 1), mat("POSE_SPLIT", 1)] }),

  O({ code: "CVC.04", lot: "CVC", libelle: "Climatisation gainable (unité, gaines, diffuseurs) posée", unite: "u", cps: "16", terriscan: "TEC.03.A.01", sousTraite: true,
    composants: [mat("GAINABLE", 1), mat("POSE_SPLIT", 2, 0, "liaisons, gaines et mise en service (hypothèse : 2 poses de split)")] }),

  // ── 20 Ascenseur ───────────────────────────────────────────────────────
  O({ code: "ASC.01", lot: "ASC", libelle: "Élévateur maison 250 kg, 2 niveaux", unite: "u", sousTraite: true, composants: [mat("ELEVATEUR_MAISON", 1)] }),
  O({ code: "ASC.02", lot: "ASC", libelle: "Ascenseur 480 kg à câble, 4 niveaux", unite: "u", sousTraite: true, composants: [mat("ASCENSEUR_480", 1)] }),
  O({ code: "ASC.03", lot: "ASC", libelle: "Supplément par niveau desservi", unite: "u", sousTraite: true, composants: [mat("ASC_NIVEAU_SUP", 1)] }),
  O({ code: "ASC.04", lot: "ASC", libelle: "Génie civil de gaine et fosse d'ascenseur", unite: "u", sousTraite: true, composants: [mat("ASC_GENIE_CIVIL", 1)] }),

  // ── 21 Énergies renouvelables ──────────────────────────────────────────
  O({ code: "ENR.01", lot: "ENR", libelle: "Chauffe-eau solaire 200 L posé", unite: "u", sousTraite: true, composants: [mat("CES_200", 1), mat("CES_POSE", 1)] }),
  O({ code: "ENR.02", lot: "ENR", libelle: "Installation photovoltaïque clé en main", unite: "kWc", sousTraite: true, composants: [mat("PV_SYSTEME", 1000)] }),

  // ── 22 Assainissement ──────────────────────────────────────────────────
  O({ code: "VRD.01", lot: "VRD", libelle: "Canalisation d'assainissement PVC Ø200 en tranchée, lit de sable", unite: "ml", cps: "26", terriscan: "VRD.01.A.01",
    composants: [mat("PVC200", 1, 0.05), mat("MINI_PELLE", 1 / 40), mat("SABLE", 0.1), mo("manoeuvre", 1), mo("plombier", 0.3)],
    note: "Recoupé avec CYPE PVC Ø160 posé (251 HT, C)." }),
  O({ code: "VRD.02", lot: "VRD", libelle: "Regard 60×60 avec tampon fonte", unite: "u", cps: "26", terriscan: "VRD.01.A.01",
    composants: [mat("REGARD60", 1)] }),

  // ── 23 Extérieurs ──────────────────────────────────────────────────────
  O({ code: "EXT.01", lot: "EXT", libelle: "Clôture maçonnée h 2,20 m sur semelle filante, enduite 2 faces", unite: "ml",
    composants: [ouv("TER.03", 0.2), ouv("FON.01", 0.4), ouv("FON.03", 0.08, "semelle 0,40 × 0,20 m"), ouv("MAC.02", 2, "agglos de 15"), ouv("STR.01", 0.02, "raidisseurs tous les 3 m"), ouv("STR.02", 0.025, "chaînage haut"), ouv("FAC.01", 4.4)],
    note: "Composée à partir des ouvrages unitaires. Seule référence : 550 DH/ml (forum 2017, C) et 180 DH/ml (marché public 2005)." }),
  O({ code: "EXT.02", lot: "EXT", libelle: "Portail métallique et portillon, posés", unite: "u", sousTraite: true, composants: [mat("PORTAIL", 1)] }),
  O({ code: "EXT.03", lot: "EXT", libelle: "Piscine : bassin en béton armé, étanchéité et revêtement (hors terrassement)", unite: "m²", sousTraite: true,
    composants: [mat("PISCINE_GO", 1), mat("PISCINE_ETANCH", 1)],
    note: "Prix de bassin issus de sources faibles (C) : op-vvanat-piscine, op-progimmo-piscine." }),
  O({ code: "EXT.04", lot: "EXT", libelle: "Piscine : filtration, pompe et local technique", unite: "ens", sousTraite: true, composants: [mat("PISCINE_EQUIP", 1)] }),
].map((o) => [o.code, o]));
