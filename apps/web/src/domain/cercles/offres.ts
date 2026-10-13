/**
 * Gabarits des fiches PRODUIT (caractéristiques techniques selon la famille)
 * et des fiches SERVICE (natures, prestations hors ouvrage du chiffrage).
 * Partagé par le front et les Pages Functions.
 *
 * Un produit est vendu dans une unité de vente (« carton de 1,44 m² »,
 * « sac de 50 kg ») ; `facteur` = quantité d'unité d'ouvrage (uniteRef :
 * m², kg…) dans UNE unité de vente. Prix par uniteRef = prix / facteur :
 * c'est lui qui alimente la médiane du référentiel et le chiffrage.
 *
 * Un service est rattaché soit à un ouvrage du chiffrage
 * (domain/chiffrage/ouvrages.ts, ex. RSO.02 pose de carrelage 60×60 au m²),
 * soit à une prestation hors ouvrage (étude BET au m², essai à l'unité,
 * levé topographique à l'hectare…), soit libre (nature AUTRE).
 */
import type { L3 } from "./libelles";

const l = (fr: string, ar: string, en: string): L3 => ({ fr, ar, en });
const o = (code: string, fr: string, ar: string, en: string): [string, L3] => [code, l(fr, ar, en)];

export interface ChampTechnique { cle: string; type: "texte" | "nombre" | "choix" | "oui_non"; libelle: L3; unite?: string; options?: [string, L3][] }

const NORME: ChampTechnique = { cle: "norme", type: "texte", libelle: l("Norme (NM, EN…)", "المعيار (NM، EN…)", "Standard (NM, EN…)") };
const ORIGINE: ChampTechnique = { cle: "origine", type: "texte", libelle: l("Pays de fabrication", "بلد الصنع", "Country of manufacture") };
const GARANTIE: ChampTechnique = { cle: "garantieAns", type: "nombre", libelle: l("Garantie (ans)", "الضمان (سنوات)", "Warranty (years)"), unite: "ans" };
const DIMENSIONS: ChampTechnique = { cle: "dimensions", type: "texte", libelle: l("Dimensions", "الأبعاد", "Dimensions") };
const COULEUR: ChampTechnique = { cle: "couleur", type: "texte", libelle: l("Couleur / teinte", "اللون", "Colour") };
const nombre = (cle: string, fr: string, ar: string, en: string, unite?: string): ChampTechnique => ({ cle, type: "nombre", libelle: l(fr, ar, en), ...(unite ? { unite } : {}) });
const choix = (cle: string, fr: string, ar: string, en: string, options: [string, L3][]): ChampTechnique => ({ cle, type: "choix", libelle: l(fr, ar, en), options });
const texte = (cle: string, fr: string, ar: string, en: string): ChampTechnique => ({ cle, type: "texte", libelle: l(fr, ar, en) });

export interface FamilleProduit { libelle: L3; categorie: string; uniteRef: string; champs: ChampTechnique[] }

/** Familles techniques des fiches produit. `categorie` : clé de CATEGORIES (domain/materiaux/types.ts). */
export const FAMILLES_PRODUIT: Record<string, FamilleProduit> = {
  CIMENT_LIANT: { libelle: l("Ciment, chaux, plâtre", "الإسمنت والجير والجبس", "Cement, lime, plaster"), categorie: "GROS_OEUVRE", uniteRef: "kg", champs: [
    choix("classe", "Classe", "الصنف", "Class", [o("CPJ35", "CPJ 35", "CPJ 35", "CPJ 35"), o("CPJ45", "CPJ 45", "CPJ 45", "CPJ 45"), o("CPJ55", "CPJ 55", "CPJ 55", "CPJ 55"),
      o("CPA55", "CPA 55", "CPA 55", "CPA 55"), o("CHAUX", "Chaux", "الجير", "Lime"), o("PLATRE", "Plâtre", "الجبس", "Plaster"), o("AUTRE", "Autre", "أخرى", "Other")]),
    NORME, ORIGINE] },
  ACIER: { libelle: l("Acier d'armature, treillis", "حديد التسليح والشبكات", "Reinforcing steel, mesh"), categorie: "GROS_OEUVRE", uniteRef: "kg", champs: [
    choix("nuance", "Nuance", "الدرجة", "Grade", [o("FEE400", "FeE400", "FeE400", "FeE400"), o("FEE500", "FeE500", "FeE500", "FeE500"), o("AUTRE", "Autre", "أخرى", "Other")]),
    nombre("diametreMm", "Diamètre", "القطر", "Diameter", "mm"), nombre("longueurM", "Longueur de barre", "طول القضيب", "Bar length", "m"), NORME, ORIGINE] },
  GRANULAT: { libelle: l("Sable, gravier, tout-venant", "الرمل والحصى والتوفنا", "Sand, gravel, sub-base"), categorie: "GROS_OEUVRE", uniteRef: "m3", champs: [
    texte("granulometrie", "Granulométrie (ex. 0/4, 15/25)", "التدرج الحبيبي (مثال 0/4، 15/25)", "Grading (e.g. 0/4, 15/25)"),
    choix("nature", "Nature", "النوع", "Type", [o("CONCASSE", "Concassé", "مكسر", "Crushed"), o("ROULE", "Roulé", "مدور", "Rounded"), o("RECYCLE", "Recyclé", "معاد تدويره", "Recycled")]),
    texte("carriere", "Carrière d'origine", "المقلع", "Source quarry")] },
  BETON: { libelle: l("Béton prêt à l'emploi", "الخرسانة الجاهزة", "Ready-mix concrete"), categorie: "GROS_OEUVRE", uniteRef: "m3", champs: [
    choix("classe", "Classe de résistance", "صنف المقاومة", "Strength class", ["B20", "B25", "B30", "B35", "B40"].map((c) => o(c, c, c, c))),
    texte("consistance", "Consistance (affaissement)", "القوام (الهبوط)", "Consistency (slump)"), texte("exposition", "Classe d'exposition", "صنف التعرض", "Exposure class"),
    { cle: "pompageInclus", type: "oui_non", libelle: l("Pompage inclus", "الضخ مشمول", "Pumping included") }, NORME] },
  BLOC_BRIQUE: { libelle: l("Agglos, briques, hourdis", "الآجر والطوب والهوردي", "Blocks, bricks, hollow-core"), categorie: "GROS_OEUVRE", uniteRef: "u", champs: [
    choix("type", "Type", "النوع", "Type", [o("AGGLO_CREUX", "Agglo creux", "آجر مجوف", "Hollow block"), o("AGGLO_PLEIN", "Agglo plein", "آجر مصمت", "Solid block"),
      o("BRIQUE_CREUSE", "Brique creuse", "طوب مجوف", "Hollow brick"), o("BRIQUE_PLEINE", "Brique pleine", "طوب مصمت", "Solid brick"),
      o("HOURDIS", "Hourdis", "هوردي", "Infill block"), o("CELLULAIRE", "Béton cellulaire", "خرسانة خلوية", "Aerated concrete")]),
    DIMENSIONS, nombre("resistanceMPa", "Résistance", "المقاومة", "Strength", "MPa"), NORME] },
  CARRELAGE: { libelle: l("Carrelage, faïence, marbre, zellige", "البلاط والفايونس والرخام والزليج", "Tiles, marble, zellige"), categorie: "REVETEMENT", uniteRef: "m2", champs: [
    choix("matiere", "Matière", "المادة", "Material", [o("GRES_CERAME", "Grès cérame", "خزف حجري", "Porcelain stoneware"), o("FAIENCE", "Faïence", "فايونس", "Ceramic wall tile"),
      o("MARBRE", "Marbre", "رخام", "Marble"), o("GRANIT", "Granit", "جرانيت", "Granite"), o("ZELLIGE", "Zellige", "زليج", "Zellige"),
      o("TERRAZZO", "Granito / terrazzo", "غرانيتو", "Terrazzo"), o("AUTRE", "Autre", "أخرى", "Other")]),
    texte("format", "Format (cm)", "المقاس (سم)", "Size (cm)"), nombre("epaisseurMm", "Épaisseur", "السمك", "Thickness", "mm"),
    choix("finition", "Finition", "التشطيب", "Finish", [o("MAT", "Mat", "مطفأ", "Matt"), o("POLI", "Poli", "مصقول", "Polished"), o("SATINE", "Satiné", "ساتان", "Satin"),
      o("STRUCTURE", "Structuré", "محبب", "Textured")]),
    choix("glissance", "Résistance à la glissance", "مقاومة الانزلاق", "Slip resistance", ["R9", "R10", "R11", "R12", "R13"].map((c) => o(c, c, c, c))),
    choix("pei", "Classe PEI (usure)", "صنف PEI (التآكل)", "PEI class (wear)", ["I", "II", "III", "IV", "V"].map((c) => o(c, c, c, c))),
    { cle: "rectifie", type: "oui_non", libelle: l("Rectifié", "مصحح الحواف", "Rectified") }, COULEUR, ORIGINE] },
  PEINTURE: { libelle: l("Peinture, enduit de finition", "الصباغة ومعجون التشطيب", "Paint, finishing filler"), categorie: "PEINTURE", uniteRef: "kg", champs: [
    choix("type", "Type", "النوع", "Type", [o("VINYLIQUE", "Vinylique", "فينيلية", "Vinyl"), o("ACRYLIQUE", "Acrylique", "أكريليك", "Acrylic"), o("GLYCERO", "Glycéro", "زيتية", "Alkyd"),
      o("SILOXANE", "Siloxane", "سيلوكسان", "Siloxane"), o("ELASTOMERE", "Élastomère", "مطاطية", "Elastomeric"), o("ENDUIT", "Enduit", "معجون", "Filler")]),
    choix("usage", "Usage", "الاستعمال", "Use", [o("INTERIEUR", "Intérieur", "داخلي", "Interior"), o("EXTERIEUR", "Extérieur", "خارجي", "Exterior"), o("MIXTE", "Intérieur et extérieur", "داخلي وخارجي", "Interior & exterior")]),
    choix("finition", "Finition", "التشطيب", "Finish", [o("MAT", "Mat", "مطفأ", "Matt"), o("SATINE", "Satiné", "ساتان", "Satin"), o("BRILLANT", "Brillant", "لامع", "Gloss")]),
    nombre("rendementM2", "Rendement", "المردودية", "Coverage", "m²/kg"), COULEUR, NORME] },
  ETANCHEITE_ISOLATION: { libelle: l("Étanchéité, isolation", "العزل المائي والحراري", "Waterproofing, insulation"), categorie: "ETANCHEITE", uniteRef: "m2", champs: [
    choix("type", "Type", "النوع", "Type", [o("SBS", "Membrane SBS", "غشاء SBS", "SBS membrane"), o("APP", "Membrane APP", "غشاء APP", "APP membrane"),
      o("LIQUIDE", "Étanchéité liquide", "عزل سائل", "Liquid membrane"), o("XPS", "Polystyrène extrudé (XPS)", "بوليستيرين مبثوق", "XPS"),
      o("PSE", "Polystyrène expansé (PSE)", "بوليستيرين ممدد", "EPS"), o("LAINE_ROCHE", "Laine de roche", "صوف صخري", "Rock wool"),
      o("LAINE_VERRE", "Laine de verre", "صوف زجاجي", "Glass wool"), o("AUTRE", "Autre", "أخرى", "Other")]),
    nombre("epaisseurMm", "Épaisseur", "السمك", "Thickness", "mm"), texte("armature", "Armature", "التسليح", "Reinforcement"),
    nombre("lambda", "Conductivité λ", "الموصلية الحرارية λ", "Conductivity λ", "W/m·K"), NORME, ORIGINE] },
  PLOMBERIE_SANITAIRE: { libelle: l("Plomberie, robinetterie, sanitaires", "الترصيص والصنابير والأدوات الصحية", "Plumbing, taps, sanitary ware"), categorie: "PLOMBERIE", uniteRef: "u", champs: [
    choix("matiere", "Matière", "المادة", "Material", [o("PPR", "PPR", "PPR", "PPR"), o("PER", "PER / multicouche", "PER / متعدد الطبقات", "PEX / multilayer"), o("PVC", "PVC", "PVC", "PVC"),
      o("CUIVRE", "Cuivre", "نحاس", "Copper"), o("CERAMIQUE", "Céramique", "خزف", "Ceramic"), o("LAITON", "Laiton chromé", "نحاس مطلي", "Chromed brass"), o("INOX", "Inox", "فولاذ مقاوم للصدأ", "Stainless steel")]),
    nombre("diametreMm", "Diamètre", "القطر", "Diameter", "mm"), nombre("pressionBar", "Pression nominale", "الضغط الاسمي", "Nominal pressure", "bar"), DIMENSIONS, GARANTIE, ORIGINE] },
  ELECTRICITE: { libelle: l("Électricité, câbles, appareillage", "الكهرباء والأسلاك والأجهزة", "Electrical, cables, devices"), categorie: "ELECTRICITE", uniteRef: "u", champs: [
    nombre("sectionMm2", "Section", "المقطع", "Cross-section", "mm²"), nombre("intensiteA", "Intensité", "الشدة", "Current rating", "A"),
    nombre("modules", "Nombre de modules", "عدد الوحدات", "Number of modules"), texte("gammeFabricant", "Série / gamme du fabricant", "سلسلة المصنع", "Manufacturer series"), NORME, GARANTIE] },
  MENUISERIE: { libelle: l("Menuiserie, portes, fenêtres", "النجارة والأبواب والنوافذ", "Joinery, doors, windows"), categorie: "MENUISERIE_ALU", uniteRef: "m2", champs: [
    choix("matiere", "Matière", "المادة", "Material", [o("ALU", "Aluminium", "ألمنيوم", "Aluminium"), o("ALU_RPT", "Aluminium à rupture de pont thermique", "ألمنيوم بقاطع حراري", "Thermally broken aluminium"),
      o("PVC", "PVC", "PVC", "uPVC"), o("BOIS", "Bois", "خشب", "Wood"), o("ACIER", "Acier", "فولاذ", "Steel")]),
    texte("vitrage", "Vitrage (ex. 4/16/4)", "الزجاج (مثال 4/16/4)", "Glazing (e.g. 4/16/4)"), DIMENSIONS, texte("ouverture", "Type d'ouverture", "نوع الفتح", "Opening type"), COULEUR, GARANTIE] },
  CVC: { libelle: l("Climatisation, ventilation, chauffe-eau", "التكييف والتهوية وسخانات الماء", "HVAC, water heaters"), categorie: "CVC", uniteRef: "u", champs: [
    nombre("puissanceBTU", "Puissance", "القدرة", "Capacity", "BTU/h"), texte("classeEnergie", "Classe énergétique", "صنف الطاقة", "Energy class"),
    { cle: "inverter", type: "oui_non", libelle: l("Inverter", "إنفرتر", "Inverter") }, texte("fluide", "Fluide frigorigène", "سائل التبريد", "Refrigerant"),
    nombre("capaciteL", "Capacité", "السعة", "Capacity", "L"), GARANTIE, ORIGINE] },
  METALLERIE: { libelle: l("Métallerie, profilés, garde-corps", "الحدادة والمقاطع والدرابزين", "Metalwork, sections, railings"), categorie: "STRUCTURE_METALLIQUE", uniteRef: "kg", champs: [
    texte("profil", "Profil / section", "المقطع", "Section"), texte("nuance", "Nuance (S235, S275…)", "الدرجة (S235، S275…)", "Grade (S235, S275…)"),
    choix("traitement", "Traitement", "المعالجة", "Treatment", [o("BRUT", "Brut", "خام", "Untreated"), o("GALVA", "Galvanisé", "مجلفن", "Galvanised"), o("THERMOLAQUE", "Thermolaqué", "مطلي حرارياً", "Powder-coated"), o("INOX", "Inox", "فولاذ مقاوم للصدأ", "Stainless")]),
    DIMENSIONS, NORME] },
  PLATRERIE: { libelle: l("Plâtrerie, plaques, faux plafonds", "الجبس والألواح والأسقف المستعارة", "Plasterboard, ceilings"), categorie: "FAUX_PLAFOND", uniteRef: "m2", champs: [
    choix("type", "Type", "النوع", "Type", [o("STANDARD", "Standard (BA13)", "عادي (BA13)", "Standard"), o("HYDRO", "Hydrofuge", "مقاوم للرطوبة", "Moisture-resistant"),
      o("FEU", "Coupe-feu", "مقاوم للحريق", "Fire-rated"), o("ACOUSTIQUE", "Acoustique", "صوتي", "Acoustic"), o("STAFF", "Staff", "سطاف", "Fibrous plaster")]),
    DIMENSIONS, nombre("epaisseurMm", "Épaisseur", "السمك", "Thickness", "mm"), NORME] },
  BOIS_AGENCEMENT: { libelle: l("Bois, panneaux, agencement", "الخشب والألواح والتهيئة", "Timber, boards, fit-out"), categorie: "MENUISERIE_BOIS", uniteRef: "m2", champs: [
    choix("essence", "Essence / matériau", "نوع الخشب / المادة", "Species / material", [o("PIN", "Pin", "صنوبر", "Pine"), o("HETRE", "Hêtre", "زان", "Beech"), o("CHENE", "Chêne", "بلوط", "Oak"),
      o("MDF", "MDF", "MDF", "MDF"), o("AGGLO", "Aggloméré mélaminé", "خشب مضغوط مغطى", "Melamine chipboard"), o("CONTREPLAQUE", "Contreplaqué", "خشب رقائقي", "Plywood"), o("AUTRE", "Autre", "أخرى", "Other")]),
    nombre("epaisseurMm", "Épaisseur", "السمك", "Thickness", "mm"), DIMENSIONS, COULEUR, ORIGINE] },
  VRD_EXTERIEUR: { libelle: l("VRD, pavés, bordures, canalisations", "الطرق والشبكات والرصيف والقنوات", "External works, pavers, kerbs, pipes"), categorie: "VRD", uniteRef: "u", champs: [
    DIMENSIONS, nombre("resistanceMPa", "Résistance", "المقاومة", "Strength", "MPa"), texte("classe", "Classe (SN, T…)", "الصنف (SN، T…)", "Class (SN, T…)"), COULEUR, NORME] },
  AUTRE: { libelle: l("Autre produit", "منتج آخر", "Other product"), categorie: "QUINCAILLERIE", uniteRef: "u", champs: [DIMENSIONS, texte("matiere", "Matière", "المادة", "Material"), COULEUR, NORME, ORIGINE, GARANTIE] },
};

export const GAMMES: Record<string, L3> = {
  ECO: l("Économique", "اقتصادي", "Budget"),
  MOYEN: l("Moyen standing", "متوسط", "Mid-range"),
  HAUT: l("Haut de gamme", "راقٍ", "High-end"),
  LUXE: l("Luxe", "فاخر", "Luxury"),
};

export const DISPONIBILITES_L3: Record<string, L3> = {
  EN_STOCK: l("En stock", "متوفر", "In stock"),
  SUR_COMMANDE: l("Sur commande", "حسب الطلب", "Made to order"),
  RUPTURE: l("En rupture", "غير متوفر حالياً", "Out of stock"),
};

// ───────────────────────── services ─────────────────────────

export const NATURES_SERVICE: Record<string, L3> = {
  POSE: l("Pose / main-d'œuvre seule (fournitures non comprises)", "التركيب / اليد العاملة فقط (دون المواد)", "Labour only (materials not included)"),
  FOURNI_POSE: l("Fourni-posé", "توريد وتركيب", "Supply and install"),
  ETUDE: l("Étude", "دراسة", "Design / study"),
  ESSAI: l("Essai de laboratoire", "تجربة مخبرية", "Laboratory test"),
  TOPO: l("Topographie", "طوبوغرافيا", "Surveying"),
  CONTROLE: l("Contrôle technique", "مراقبة تقنية", "Technical inspection"),
  LOCATION: l("Location de matériel", "كراء المعدات", "Equipment hire"),
  TRANSPORT: l("Transport, livraison, évacuation", "النقل والتوصيل وإزالة الأتربة", "Haulage, delivery, removal"),
  AUTRE: l("Autre prestation", "خدمة أخرى", "Other service"),
};

/** Unités admises pour une prestation libre. */
export const UNITES_SERVICE = ["m2", "m3", "ml", "u", "kg", "t", "ens", "h", "jour", "sem", "mois", "forfait", "ha", "voyage", "kWc", "m2mois"];

export interface Prestation { libelle: L3; unite: string; nature: string }
const p = (unite: string, nature: string, fr: string, ar: string, en: string): Prestation => ({ libelle: l(fr, ar, en), unite, nature });

/** Prestations hors ouvrage du chiffrage (études, essais, topographie, contrôle, location, transport). */
export const PRESTATIONS: Record<string, Prestation> = {
  ETUDE_BET_STRUCTURE: p("m2", "ETUDE", "Étude béton armé et plans d'exécution (par m² de plancher)", "دراسة الخرسانة المسلحة وتصاميم التنفيذ (للمتر المربع من الأسقف)", "Reinforced concrete design & drawings (per m² of floor)"),
  ETUDE_BET_FLUIDES: p("m2", "ETUDE", "Étude des lots techniques (plomberie, électricité, CVC) par m²", "دراسة الشبكات التقنية (ترصيص، كهرباء، تكييف) للمتر المربع", "MEP design (per m²)"),
  ETUDE_THERMIQUE: p("m2", "ETUDE", "Étude thermique (RTCM) par m²", "الدراسة الحرارية (ن.ح.ب.م) للمتر المربع", "Thermal study (per m²)"),
  ETUDE_BET_VRD: p("forfait", "ETUDE", "Étude VRD (voirie, réseaux)", "دراسة الطرق والشبكات", "Civil works design"),
  ETUDE_GEOTECHNIQUE: p("forfait", "ESSAI", "Étude géotechnique de sol (villa / petit immeuble)", "الدراسة الجيوتقنية للتربة (فيلا / عمارة صغيرة)", "Geotechnical study (villa / small building)"),
  SONDAGE: p("ml", "ESSAI", "Sondage carotté ou pressiométrique (par mètre)", "سبر بأخذ العينات أو بالضغط (للمتر)", "Borehole (per metre)"),
  ESSAI_BETON: p("u", "ESSAI", "Essai d'écrasement de béton (série d'éprouvettes)", "تجربة سحق الخرسانة (سلسلة عينات)", "Concrete compression test (set of cubes)"),
  ESSAI_PLAQUE: p("u", "ESSAI", "Essai à la plaque", "تجربة الصفيحة", "Plate load test"),
  ESSAI_PROCTOR: p("u", "ESSAI", "Essai Proctor", "تجربة بروكتور", "Proctor test"),
  CAROTTAGE: p("u", "ESSAI", "Carottage de béton", "أخذ عينة أسطوانية من الخرسانة", "Concrete core sample"),
  ESSAI_ACIER: p("u", "ESSAI", "Essai de traction sur acier", "تجربة الشد على الفولاذ", "Steel tensile test"),
  LEVE_TOPOGRAPHIQUE: p("ha", "TOPO", "Levé topographique (par hectare)", "رفع طوبوغرافي (للهكتار)", "Topographic survey (per hectare)"),
  PLAN_COTE: p("forfait", "TOPO", "Plan coté du terrain", "تصميم مقاسات الأرض", "Dimensioned site plan"),
  IMPLANTATION: p("forfait", "TOPO", "Implantation du bâtiment", "تحديد مواقع البناية على الأرض", "Building setting-out"),
  BORNAGE: p("forfait", "TOPO", "Bornage", "التحديد بالأنصاب", "Boundary marking"),
  MISSION_CONTROLE: p("m2", "CONTROLE", "Mission de contrôle technique (par m²)", "مهمة المراقبة التقنية (للمتر المربع)", "Technical inspection mission (per m²)"),
  VISA_PLANS: p("forfait", "CONTROLE", "Visa des plans par un bureau de contrôle", "تأشيرة التصاميم من مكتب المراقبة", "Plan approval by an inspection body"),
  LOCATION_ENGIN: p("jour", "LOCATION", "Location d'engin de terrassement avec chauffeur", "كراء آلية الحفر مع السائق", "Earthmoving machine hire with driver"),
  LOCATION_GRUE: p("jour", "LOCATION", "Location de grue", "كراء رافعة", "Crane hire"),
  LOCATION_ECHAFAUDAGE: p("m2mois", "LOCATION", "Location d'échafaudage (m² par mois)", "كراء السقالات (م² في الشهر)", "Scaffolding hire (m² per month)"),
  LOCATION_BETONNIERE: p("jour", "LOCATION", "Location de bétonnière", "كراء خلاطة الخرسانة", "Concrete mixer hire"),
  LOCATION_COMPACTEUR: p("jour", "LOCATION", "Location de compacteur", "كراء آلة الدك", "Compactor hire"),
  TRANSPORT_MATERIAUX: p("voyage", "TRANSPORT", "Transport de matériaux (par voyage)", "نقل المواد (للرحلة)", "Materials haulage (per trip)"),
  EVACUATION_GRAVATS: p("m3", "TRANSPORT", "Évacuation de gravats en décharge autorisée", "إزالة الأتربة إلى مطرح مرخص", "Rubble removal to licensed tip"),
  NETTOYAGE_FIN_CHANTIER: p("m2", "AUTRE", "Nettoyage de fin de chantier", "تنظيف نهاية الورش", "End-of-works cleaning"),
};
