/**
 * Phases d'un matériau : quand on le CHOISIT (phases d'étude) et quand on
 * l'ACHÈTE (phase de réalisation où il est mis en œuvre), avec un délai
 * d'approvisionnement indicatif.
 *
 * Identifiants repris de packages/contracts/src/phases.catalog.ts (codes de
 * phase et lots de second œuvre LOT_*) et du moteur de chiffrage (lots,
 * ouvrages, sous-détails) ; la correspondance lot du chiffrage → phase de
 * chantier recoupe les jalons du référentiel (domain/referentiel/data).
 *
 * Données incertaines : `aValider: true` = « à valider par l'architecte ».
 * Délais d'approvisionnement : HYPOTHÈSES CITURBAREA (aucune source publiée
 * sur les délais des négoces marocains), affichées comme telles.
 */
import { CORRESPONDANCE_CIT } from "../chiffrage/correspondanceCIT";
import type { CodeLot } from "../chiffrage/lots";
import { OUVRAGES } from "../chiffrage/ouvrages";
import { materiau } from "./catalogue";
import { COMPOSANTS_PAR_CIT } from "./reference";
import type { Categorie } from "./types";

export type Texte3 = { fr: string; ar: string; en: string };

// ───────────────────────── phases d'étude ─────────────────────────

export type PhaseEtude = "ESQ_APS" | "APD" | "EXE" | "METRE" | "DCE" | "CONSULTATION";

export const PHASES_ETUDE: { id: PhaseEtude; codes: string[]; libelle: Texte3; decision: Texte3 }[] = [
  { id: "ESQ_APS", codes: ["10_ESQUISSE", "12_APS"],
    libelle: { fr: "Esquisse / APS", ar: "الرسم الأولي / المشروع التمهيدي الموجز", en: "Sketch / outline design" },
    decision: { fr: "Gamme et budget : niveau de finition, enveloppe au m², système constructif.", ar: "الفئة والميزانية: مستوى التشطيب، الغلاف المالي للمتر المربع، النظام الإنشائي.", en: "Range and budget: finish level, cost per m², structural system." } },
  { id: "APD", codes: ["14_APD"],
    libelle: { fr: "Avant-projet détaillé (APD)", ar: "المشروع التمهيدي المفصل", en: "Detailed design" },
    decision: { fr: "Choix technique : spécification, performances, marque ou équivalent, échantillons.", ar: "الاختيار التقني: المواصفات، الأداء، العلامة أو ما يعادلها، العينات.", en: "Technical choice: specification, performance, brand or equivalent, samples." } },
  { id: "EXE", codes: ["40_DOSSIER_EXECUTION"],
    libelle: { fr: "Dossier d'exécution (plans BA, détails)", ar: "ملف التنفيذ (مخططات الخرسانة، التفاصيل)", en: "Construction drawings" },
    decision: { fr: "Spécifications d'exécution : classes de béton, nuances et diamètres d'acier, détails de mise en œuvre (BET).", ar: "مواصفات التنفيذ: أصناف الخرسانة، أنواع وأقطار الحديد، تفاصيل التنفيذ (مكتب الدراسات).", en: "Execution specs: concrete classes, steel grades and diameters, details (engineer)." } },
  { id: "METRE", codes: ["48_METRE_QUANTITATIF"],
    libelle: { fr: "Métré et quantités", ar: "القياس والكميات", en: "Quantity take-off" },
    decision: { fr: "Quantités par ouvrage, pertes, conditionnements.", ar: "الكميات لكل منشأ، الضياع، التعبئة.", en: "Quantities per work item, waste, packaging." } },
  { id: "DCE", codes: ["50_DCE"],
    libelle: { fr: "Dossier de consultation (CPS, BPU/DQE)", ar: "ملف الاستشارة (دفتر الشروط، جدول الأثمان)", en: "Tender documents" },
    decision: { fr: "Article du CPS (prescription « ou équivalent ») et poste du BPU/DQE.", ar: "بند دفتر الشروط الخاصة (أو ما يعادله) وبند جدول الأثمان.", en: "Specification clause (or equivalent) and bill of quantities item." } },
  { id: "CONSULTATION", codes: ["54_ATTRIBUTION_MARCHE"],
    libelle: { fr: "Consultation et offres", ar: "الاستشارة والعروض", en: "Bids" },
    decision: { fr: "Comparaison des offres à spécification égale, délais, conditions de livraison.", ar: "مقارنة العروض بنفس المواصفات، الآجال، شروط التسليم.", en: "Compare bids at equal spec, lead times, delivery terms." } },
];

/** Phases d'étude où un matériau est décidé, selon sa catégorie. */
export function phasesEtude(c: Categorie): PhaseEtude[] {
  if (c === "GROS_OEUVRE" || c === "STRUCTURE_METALLIQUE") return ["ESQ_APS", "EXE", "METRE", "DCE", "CONSULTATION"];
  if (c === "ETANCHEITE" || c === "ISOLATION" || c === "VRD") return ["APD", "EXE", "METRE", "DCE", "CONSULTATION"];
  return ["ESQ_APS", "APD", "METRE", "DCE", "CONSULTATION"];
}

// ───────────────────────── phases de réalisation ─────────────────────────

export type PhaseReal =
  | "INSTALLATION" | "TERRASSEMENT" | "FONDATIONS" | "SOUS_SOL" | "GROS_OEUVRE" | "PLANCHERS" | "ETANCHEITE" | "MACONNERIE"
  | "RESEAUX" | "ENDUITS" | "MENUISERIES" | "REVETEMENTS" | "PEINTURE" | "EQUIPEMENTS" | "VRD" | "FINITIONS";

export interface DefPhaseReal {
  id: PhaseReal;
  /** Codes de phases.catalog.ts (phases fixes, gabarits par niveau ou lots de second œuvre). */
  codes: string[];
  libelle: Texte3;
  /** Début et durée indicatifs (semaines) pour une villa R+1 d'environ 250 m² — hypothèse, ajustée par niveaux. */
  debut: number;
  duree: number;
}

const P = (id: PhaseReal, codes: string[], fr: string, ar: string, en: string, debut: number, duree: number): DefPhaseReal =>
  ({ id, codes, libelle: { fr, ar, en }, debut, duree });

export const PHASES_REALISATION: DefPhaseReal[] = [
  P("INSTALLATION", ["82_INSTALLATION_CHANTIER", "58_RACCORDEMENTS_PROVISOIRES"], "Installation de chantier", "تهيئة الورش", "Site set-up", 0, 1),
  P("TERRASSEMENT", ["83_TERRASSEMENT"], "Terrassement et fouilles", "الحفر والتسوية", "Earthworks", 1, 2),
  P("FONDATIONS", ["84_FONDATIONS"], "Fondations", "الأساسات", "Foundations", 3, 3),
  P("SOUS_SOL", ["85_SOUS_SOL"], "Soutènement et sous-sol", "الجدران الاستنادية والطابق السفلي", "Retaining walls & basement", 3, 4),
  P("GROS_OEUVRE", ["86_PLANCHER"], "Gros œuvre en élévation (poteaux, poutres, voiles)", "الأشغال الكبرى (أعمدة، روافد، جدران)", "Superstructure (columns, beams, walls)", 6, 8),
  P("PLANCHERS", ["86_PLANCHER", "86_PLANCHER_TERRASSE"], "Planchers et dalles", "البلاطات والأسقف", "Floors and slabs", 6, 8),
  P("ETANCHEITE", ["LOT_ETANCHEITE", "LOT_ISOLATION"], "Étanchéité et isolation", "العزل المائي والحراري", "Waterproofing & insulation", 14, 2),
  P("MACONNERIE", ["LOT_MACONNERIE"], "Maçonnerie et cloisons", "البناء والحواجز", "Masonry & partitions", 12, 4),
  P("RESEAUX", ["LOT_PLOMBERIE", "LOT_ELECTRICITE", "LOT_CVC", "LOT_DOMOTIQUE"], "Réseaux encastrés (plomberie, électricité, climatisation)", "الشبكات المدمجة (السباكة، الكهرباء، التكييف)", "Embedded networks (plumbing, electrical, HVAC)", 15, 4),
  P("ENDUITS", ["LOT_ENDUITS", "LOT_FACADE"], "Enduits, chapes et façades", "التلبيس والتسوية والواجهات", "Renders, screeds & façades", 18, 4),
  P("MENUISERIES", ["LOT_MENUISERIE_ALU", "LOT_MENUISERIE_BOIS", "LOT_FERRONNERIE", "LOT_VITRERIE"], "Menuiseries et ferronnerie", "النجارة والحدادة", "Joinery & metalwork", 22, 3),
  P("REVETEMENTS", ["LOT_CARRELAGE", "LOT_REVETEMENT_SOL", "LOT_FAUX_PLAFOND"], "Revêtements (sols, murs, faux plafonds)", "التكسيات (الأرضيات، الجدران، الأسقف المعلقة)", "Finishes (floors, walls, ceilings)", 22, 5),
  P("PEINTURE", ["LOT_PEINTURE", "LOT_FACADE"], "Peinture", "الصباغة", "Painting", 27, 3),
  P("EQUIPEMENTS", ["LOT_SANITAIRE", "LOT_CVC", "LOT_ASCENSEUR", "LOT_ELECTRICITE", "LOT_MENUISERIE_BOIS"], "Équipements (sanitaires, appareillage, climatisation, ascenseur)", "التجهيزات (الصحية، الكهربائية، التكييف، المصعد)", "Equipment (sanitary, fittings, HVAC, lift)", 28, 3),
  P("VRD", ["LOT_AMENAGEMENT_EXT", "LOT_PORTAIL_CLOTURE"], "VRD et extérieurs", "الطرق والشبكات والمحيط الخارجي", "Utilities & outdoor works", 26, 3),
  P("FINITIONS", ["92_FIN_SECOND_OEUVRE", "93_RECEPTION_PROVISOIRE"], "Finitions et réception", "التشطيبات والاستلام", "Finishing & handover", 31, 2),
];
export const PHASE_REAL: Record<PhaseReal, DefPhaseReal> = Object.fromEntries(PHASES_REALISATION.map((p) => [p.id, p])) as Record<PhaseReal, DefPhaseReal>;

/** Phase de réalisation d'un ouvrage du chiffrage (lot, code, étiquettes du métré). */
export function phaseOuvrage(code: string, tags: readonly string[] = []): PhaseReal {
  const o = OUVRAGES[code];
  const lot = (o?.lot || code.split(".")[0]) as CodeLot;
  if (tags.includes("sous_sol") || tags.includes("soutenement")) return lot === "TER" ? "TERRASSEMENT" : "SOUS_SOL";
  switch (lot) {
    case "INS": return "INSTALLATION";
    case "TER": return "TERRASSEMENT";
    case "FON": return ["FON.10", "FON.11", "FON.12", "FON.13", "FON.14", "FON.15", "FON.16"].includes(code) ? "SOUS_SOL" : "FONDATIONS";
    case "STR": return ["STR.03", "STR.04", "STR.05"].includes(code) ? "PLANCHERS" : "GROS_OEUVRE";
    case "MAC": return /enduit|chape/i.test(o?.libelle || "") ? "ENDUITS" : "MACONNERIE";
    case "ETA": return "ETANCHEITE";
    case "FAC": return code === "FAC.01" ? "ENDUITS" : code === "FAC.04" ? "REVETEMENTS" : "PEINTURE";
    case "ALU": case "MET": return "MENUISERIES";
    case "BOI": return code === "BOI.06" ? "EQUIPEMENTS" : "MENUISERIES";
    case "FPL": case "RSO": case "RMU": return "REVETEMENTS";
    case "PEI": return "PEINTURE";
    case "PLO": return ["PLO.01", "PLO.10", "PLO.11", "PLO.12"].includes(code) ? "RESEAUX" : "EQUIPEMENTS";
    case "ELE": return ["ELE.01", "ELE.02", "ELE.05", "ELE.07"].includes(code) ? "RESEAUX" : "EQUIPEMENTS";
    case "CFA": return code === "CFA.01" ? "RESEAUX" : "EQUIPEMENTS";
    case "CVC": case "ENR": return "EQUIPEMENTS";
    case "ASC": return code === "ASC.04" ? "GROS_OEUVRE" : "EQUIPEMENTS";
    case "VRD": case "EXT": return "VRD";
    default: return "FINITIONS";
  }
}

/**
 * Matériaux d'un même ouvrage achetés à des moments différents : l'encastré
 * (gaines, fils, boîtes) aux réseaux, l'appareillage et les luminaires en fin
 * de chantier, avant la peinture de finition.
 */
const PHASE_MATERIAU: Record<string, PhaseReal> = {
  GAINE_ICTA20: "RESEAUX", FIL_15: "RESEAUX", FIL_25: "RESEAUX", FIL_6: "RESEAUX", BOITE_ENC: "RESEAUX",
  PRISE: "EQUIPEMENTS", INTER: "EQUIPEMENTS", APPAREILLAGE_HAUT: "EQUIPEMENTS", SPOT_LED: "EQUIPEMENTS",
  COFFRET42: "RESEAUX", DISJ: "EQUIPEMENTS", ID30: "EQUIPEMENTS",
};

/** Phase d'achat d'un composant du chiffrage consommé par un ouvrage. */
export const phaseComposant = (id: string, ouvrage: string, tags: readonly string[] = []): PhaseReal =>
  PHASE_MATERIAU[id] ?? phaseOuvrage(ouvrage, tags);

// Ouvrages (non internes) par composant, sous-ouvrages déroulés.
function composants(code: string, vus = new Set<string>()): Set<string> {
  const o = OUVRAGES[code];
  const out = new Set<string>();
  if (!o || vus.has(code)) return out;
  vus.add(code);
  for (const c of o.composants) {
    if (c.type === "mat") out.add(c.ref);
    else if (c.type === "ouv") for (const m of composants(c.ref, vus)) out.add(m);
  }
  return out;
}
const OUVRAGES_PAR_COMPOSANT = new Map<string, string[]>();
for (const o of Object.values(OUVRAGES)) {
  if (o.interne) continue;
  for (const m of composants(o.code)) OUVRAGES_PAR_COMPOSANT.set(m, [...(OUVRAGES_PAR_COMPOSANT.get(m) || []), o.code]);
}
export const ouvragesDuComposant = (id: string): string[] => OUVRAGES_PAR_COMPOSANT.get(id) || [];

/** Lot CPS du catalogue (LOT_NN_*) → phase, pour les matériaux qu'aucun ouvrage du chiffrage n'utilise. */
const PHASE_LOT_CPS: Record<string, PhaseReal> = {
  LOT_01_TERRASSEMENT: "TERRASSEMENT", LOT_02_GO_BETON: "GROS_OEUVRE", LOT_03_MACONNERIE: "MACONNERIE", LOT_04_ETANCHEITE: "ETANCHEITE",
  LOT_07_MENUISERIE_EXT_ALU: "MENUISERIES", LOT_08_MENUISERIE_INT_BOIS: "MENUISERIES", LOT_09_METALLERIE: "MENUISERIES",
  LOT_10_CLOISONS_DOUBLAGES: "MACONNERIE", LOT_11_REVETEMENTS_SOLS: "REVETEMENTS", LOT_12_REVETEMENTS_MURS: "REVETEMENTS", LOT_13_PEINTURE: "PEINTURE",
  LOT_14_PLOMBERIE_SANITAIRE: "EQUIPEMENTS", LOT_15_ELECTRICITE: "RESEAUX", LOT_16_CLIMATISATION: "EQUIPEMENTS", LOT_17_PLOMBERIE_ECS: "EQUIPEMENTS",
  LOT_18_FAUX_PLAFONDS: "REVETEMENTS", LOT_19_STAFF_STUC: "REVETEMENTS", LOT_20_VDI_COURANTS_FAIBLES: "RESEAUX", LOT_21_ESPACES_VERTS: "VRD", LOT_26_VRD_VOIRIE: "VRD",
};
const PHASE_CATEGORIE: Record<Categorie, PhaseReal> = {
  GROS_OEUVRE: "GROS_OEUVRE", ETANCHEITE: "ETANCHEITE", ISOLATION: "ETANCHEITE", VRD: "VRD", ELECTRICITE: "RESEAUX", PLOMBERIE: "EQUIPEMENTS",
  CVC: "EQUIPEMENTS", STRUCTURE_METALLIQUE: "GROS_OEUVRE", MENUISERIE_ALU: "MENUISERIES", MENUISERIE_BOIS: "MENUISERIES", FAUX_PLAFOND: "REVETEMENTS",
  REVETEMENT: "REVETEMENTS", MARBRERIE: "REVETEMENTS", PEINTURE: "PEINTURE", QUINCAILLERIE: "MENUISERIES",
};

export interface PhasesMateriau {
  realisation: PhaseReal[];
  /** Ouvrages du chiffrage qui consomment le matériau (postes du DQE). */
  ouvrages: string[];
  /** Vrai si la phase est déduite du lot ou de la catégorie (aucun ouvrage du chiffrage) : à valider par l'architecte. */
  aValider: boolean;
  etude: PhaseEtude[];
}

const ORDRE = PHASES_REALISATION.map((p) => p.id);
const trier = (l: Iterable<PhaseReal>) => [...new Set(l)].sort((a, b) => ORDRE.indexOf(a) - ORDRE.indexOf(b));

/** Phases d'un matériau du catalogue (code CIT, ou déclinaison via son parent). */
export function phasesMateriau(code: string): PhasesMateriau | null {
  const r = materiau(code);
  if (!r) return null;
  const ids = [...(COMPOSANTS_PAR_CIT[code] || []), ...(r.parent ? COMPOSANTS_PAR_CIT[r.parent] || [] : [])].map((c) => c.id);
  const ouvrages = [...new Set(ids.flatMap(ouvragesDuComposant))];
  const realisation = trier(ids.flatMap((id) => ouvragesDuComposant(id).map((o) => phaseComposant(id, o))));
  if (realisation.length) return { realisation, ouvrages, aValider: false, etude: phasesEtude(r.categorie) };
  const parLot = trier(r.lots.map((l) => PHASE_LOT_CPS[l]).filter(Boolean));
  return { realisation: parLot.length ? parLot : [PHASE_CATEGORIE[r.categorie]], ouvrages: [], aValider: true, etude: phasesEtude(r.categorie) };
}

// ───────────────────────── délais d'approvisionnement ─────────────────────────

export interface DelaiAppro { jours: number; note: string; hypothese: true }

const D = (jours: number, note: string): DelaiAppro => ({ jours, note, hypothese: true });

/** Par famille du catalogue (puis par catégorie). Hypothèses CITURBAREA, à valider par l'architecte. */
const DELAI_FAMILLE: Record<string, DelaiAppro> = {
  "Bétons": D(2, "Béton prêt à l'emploi : réserver la centrale 48 h avant le coulage."),
  "Liants": D(3, "Négoce local, livraison sous 2 à 3 jours ; stock de chantier limité (humidité)."),
  "Mortiers": D(3, "Négoce local."),
  "Granulats": D(3, "Carrière ou négoce, livraison par camion."),
  "Aciers d'armature": D(7, "Commande sur nomenclature des plans BA ; façonnage éventuel."),
  "Blocs & briques": D(7, "Briqueterie ou fabricant d'agglos, livraison palettisée."),
  "Planchers": D(10, "Poutrelles fabriquées selon le calepinage du plancher."),
  "Coffrages": D(7, "Achat ou location."),
  "Carrelage": D(14, "Vérifier stock et lot de fabrication (nuance) ; import : 30 à 60 jours."),
  "Marbre": D(21, "Débit et polissage en marbrerie."),
  "Sanitaires": D(15, "Selon stock du distributeur."),
  "Robinetterie": D(15, "Selon stock du distributeur."),
  "Fenêtres": D(35, "Fabrication sur mesure après prise de cotes sur maçonnerie finie."),
  "Portes": D(30, "Fabrication ou commande après prise de cotes."),
  "Production froid": D(21, "Selon stock de l'installateur."),
  "Tableaux": D(10, "Coffret et protections selon schéma électrique."),
};
const DELAI_CATEGORIE: Record<Categorie, DelaiAppro> = {
  GROS_OEUVRE: D(5, "Négoce local."), ETANCHEITE: D(10, "Distributeur spécialisé."), ISOLATION: D(10, "Distributeur spécialisé."),
  VRD: D(10, "Négoce ou préfabricant."), ELECTRICITE: D(7, "Distributeur électrique."), PLOMBERIE: D(7, "Distributeur sanitaire."),
  CVC: D(15, "Installateur ou distributeur."), STRUCTURE_METALLIQUE: D(21, "Fabrication en atelier."),
  MENUISERIE_ALU: D(35, "Fabrication sur mesure après prise de cotes."), MENUISERIE_BOIS: D(30, "Fabrication sur mesure."),
  FAUX_PLAFOND: D(7, "Négoce plâtrerie."), REVETEMENT: D(14, "Selon stock ; import plus long."), MARBRERIE: D(21, "Marbrerie."),
  PEINTURE: D(5, "Distributeur de peinture."), QUINCAILLERIE: D(5, "Quincaillerie."),
};
/** Composants du chiffrage sans code catalogue (fournis-posés, sous-traités). */
const DELAI_COMPOSANT: Record<string, DelaiAppro> = {
  ELEVATEUR_MAISON: D(120, "Fabrication et dossier de l'ascensoriste."), ASCENSEUR_480: D(120, "Fabrication et dossier de l'ascensoriste."),
  ASC_NIVEAU_SUP: D(120, "Avec l'ascenseur."), CUISINE_ML: D(45, "Fabrication après relevé des cotes."), PV_SYSTEME: D(30, "Étude et matériel de l'installateur."),
  CES_200: D(15, "Distributeur."), SPLIT24: D(15, "Distributeur."), SPLIT12_PREMIUM: D(21, "Distributeur."), PORTAIL: D(30, "Fabrication en atelier."),
  PLACARD: D(30, "Fabrication sur mesure."), ALARME_VIDEO: D(15, "Installateur."), DOMOTIQUE: D(30, "Intégrateur."), PISCINE_EQUIP: D(30, "Pisciniste."),
  GC_INOX: D(21, "Fabrication en atelier."), GC_VERRE: D(30, "Verre trempé sur mesure."), GC_TOUT_VERRE: D(30, "Verre feuilleté sur mesure."),
  GRILLE_DEFENSE: D(21, "Ferronnerie."), ALU_LUXE: D(60, "Profilés importés, fabrication sur mesure."), VOLET_ALU: D(35, "Fabrication sur mesure."),
};
const DELAI_DEFAUT = D(14, "Délai par défaut.");

/** Délai d'approvisionnement d'un code CIT. */
export function delaiMateriau(code: string): DelaiAppro {
  const r = materiau(code);
  if (!r) return DELAI_DEFAUT;
  return DELAI_FAMILLE[r.famille] || DELAI_CATEGORIE[r.categorie] || DELAI_DEFAUT;
}
/** Délai d'approvisionnement d'un composant du chiffrage (référentiel). */
export function delaiComposant(id: string): DelaiAppro {
  if (DELAI_COMPOSANT[id]) return DELAI_COMPOSANT[id];
  const c = CORRESPONDANCE_CIT[id];
  return c ? delaiMateriau(c.cit) : DELAI_DEFAUT;
}

// ───────────────────────── conseils de chantier ─────────────────────────

/** Stockage et réception sur chantier, par catégorie (règles de l'art reformulées, à valider). */
export const STOCKAGE: Record<Categorie, Texte3> = {
  GROS_OEUVRE: { fr: "Ciment au sec sur palette, à l'abri de l'humidité, utilisé dans les 3 mois ; aciers sur cales, sans contact avec le sol ; granulats sur aire propre, séparés par classe ; contrôler bons de livraison (classe de béton, heure de fabrication).", ar: "الإسمنت في مكان جاف فوق منصة نقالة، يُستعمل خلال 3 أشهر؛ الحديد فوق دعامات بعيدا عن الأرض؛ الركام على مساحة نظيفة ومفصولة حسب الصنف؛ مراقبة وصولات التسليم.", en: "Cement dry on pallets, used within 3 months; rebar on supports off the ground; aggregates on clean areas by class; check delivery notes." },
  ETANCHEITE: { fr: "Rouleaux stockés debout, à l'abri du soleil et du gel ; vérifier épaisseur et armature à la livraison.", ar: "اللفائف مخزنة واقفة بعيدا عن الشمس والصقيع؛ التحقق من السمك والتسليح عند التسليم.", en: "Rolls stored upright, away from sun and frost; check thickness and reinforcement." },
  ISOLATION: { fr: "Panneaux à plat, protégés des UV et des chocs.", ar: "الألواح مسطحة ومحمية من الأشعة والصدمات.", en: "Boards flat, protected from UV and impacts." },
  VRD: { fr: "Tubes à plat sur toute la longueur, à l'abri du soleil ; contrôler la classe (SN) et les marquages.", ar: "الأنابيب مسطحة على طولها بعيدا عن الشمس؛ مراقبة الصنف والعلامات.", en: "Pipes flat over full length, shaded; check stiffness class and markings." },
  ELECTRICITE: { fr: "Câbles et appareillage au sec ; contrôler sections, marquages et conformité NM à la livraison.", ar: "الكابلات والتجهيزات في مكان جاف؛ مراقبة المقاطع والعلامات والمطابقة.", en: "Cables and fittings dry; check sections, markings, compliance." },
  PLOMBERIE: { fr: "Appareils dans leur emballage jusqu'à la pose ; contrôler casse et références à la réception.", ar: "الأجهزة في تغليفها حتى التركيب؛ مراقبة الكسر والمراجع عند الاستلام.", en: "Fixtures kept packed until fitting; check for breakage and references." },
  CVC: { fr: "Unités dans leur emballage, à l'abri ; vérifier puissance et fluide frigorigène.", ar: "الوحدات في تغليفها؛ التحقق من القدرة ونوع الغاز.", en: "Units packed and sheltered; check capacity and refrigerant." },
  STRUCTURE_METALLIQUE: { fr: "Profilés sur cales, protégés de la corrosion ; contrôler nuance et certificats.", ar: "المقاطع فوق دعامات ومحمية من الصدأ؛ مراقبة الصنف والشهادات.", en: "Sections on supports, protected from corrosion; check grade and certificates." },
  MENUISERIE_ALU: { fr: "Châssis debout, protégés (film) jusqu'à la fin des travaux salissants ; contrôler dimensions et vitrage.", ar: "الإطارات واقفة ومحمية بالغشاء حتى نهاية الأشغال؛ مراقبة الأبعاد والزجاج.", en: "Frames upright, film-protected until messy works end; check sizes and glazing." },
  MENUISERIE_BOIS: { fr: "Au sec et ventilé, à plat ; poser après séchage des enduits.", ar: "في مكان جاف ومهوى؛ التركيب بعد جفاف التلبيس.", en: "Dry and ventilated, flat; fit after plaster has dried." },
  FAUX_PLAFOND: { fr: "Plaques à plat, au sec.", ar: "الألواح مسطحة وفي مكان جاف.", en: "Boards flat and dry." },
  REVETEMENT: { fr: "Commander la quantité totale (+ 5 à 10 % de pertes) dans un même lot de fabrication pour éviter les écarts de teinte.", ar: "طلب الكمية كاملة (+ 5 إلى 10 ٪ ضياع) من نفس دفعة التصنيع لتفادي اختلاف اللون.", en: "Order total quantity (+5–10% waste) from one batch to avoid shade differences." },
  MARBRERIE: { fr: "Tranches debout sur chevalets ; vérifier veinage et épaisseur.", ar: "الألواح واقفة على حوامل؛ التحقق من العروق والسمك.", en: "Slabs upright on racks; check veining and thickness." },
  PEINTURE: { fr: "Hors gel et hors soleil, pots fermés ; même référence de teinte pour toute la surface.", ar: "بعيدا عن الصقيع والشمس؛ نفس مرجع اللون لكامل المساحة.", en: "Away from frost and sun; same colour reference throughout." },
  QUINCAILLERIE: { fr: "Au sec, par lot d'ouvrage.", ar: "في مكان جاف حسب كل منشأ.", en: "Dry, grouped by work item." },
};
