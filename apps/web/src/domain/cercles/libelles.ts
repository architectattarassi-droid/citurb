/**
 * Libellés trilingues (fr / ar / en) du référentiel partagés par le front et
 * les Pages Functions : catégories et familles du catalogue matériaux,
 * unités, lots (corps d'état). Module sans dépendance React.
 *
 * Affichage : `tr(l, lang)` renvoie la langue demandée, sinon le français.
 * Contenus saisis par les pros (désignation_fr / désignation_ar) : `bilingue`
 * choisit la langue du visiteur avec repli sur l'autre langue.
 */

export type Langue = "fr" | "ar" | "en";
export type L3 = { fr: string; ar: string; en: string };

export const LANGUES: Langue[] = ["fr", "ar", "en"];
export const estLangue = (v: unknown): v is Langue => v === "fr" || v === "ar" || v === "en";

export const tr = (l: L3 | undefined, lang: Langue): string => (l ? l[lang] || l.fr : "");

/** Contenu saisi en FR et/ou AR : langue du visiteur, sinon l'autre (l'anglais lit le français). */
export function bilingue(fr: string | null | undefined, ar: string | null | undefined, lang: Langue): { texte: string; langue: "fr" | "ar" } {
  const f = (fr || "").trim(), a = (ar || "").trim();
  if (lang === "ar") return a ? { texte: a, langue: "ar" } : { texte: f, langue: "fr" };
  return f ? { texte: f, langue: "fr" } : { texte: a, langue: "ar" };
}

const l = (fr: string, ar: string, en: string): L3 => ({ fr, ar, en });

/** Catégories du catalogue (clés de domain/materiaux/types.ts CATEGORIES). */
export const CATEGORIES_L3: Record<string, L3> = {
  GROS_OEUVRE: l("Gros œuvre", "الأشغال الكبرى", "Structural works"),
  ETANCHEITE: l("Étanchéité", "العزل المائي", "Waterproofing"),
  ISOLATION: l("Isolation", "العزل الحراري والصوتي", "Insulation"),
  VRD: l("VRD & extérieurs", "الطرق والشبكات والتهيئة الخارجية", "Roads, utilities & external works"),
  ELECTRICITE: l("Électricité & courants faibles", "الكهرباء والتيارات الضعيفة", "Electrical & low voltage"),
  PLOMBERIE: l("Plomberie & sanitaire", "الترصيص والأدوات الصحية", "Plumbing & sanitary"),
  CVC: l("Climatisation, ventilation, eau chaude", "التكييف والتهوية والماء الساخن", "HVAC & hot water"),
  STRUCTURE_METALLIQUE: l("Métallerie & structure métallique", "الحدادة والهياكل المعدنية", "Metalwork & steel structures"),
  MENUISERIE_ALU: l("Menuiserie aluminium & PVC", "نجارة الألمنيوم و PVC", "Aluminium & PVC joinery"),
  MENUISERIE_BOIS: l("Menuiserie bois & agencement", "نجارة الخشب والتهيئة الداخلية", "Wood joinery & fit-out"),
  FAUX_PLAFOND: l("Plâtrerie & faux plafonds", "الجبس والأسقف المستعارة", "Plaster & false ceilings"),
  REVETEMENT: l("Carrelage & revêtements", "البلاط والتكسيات", "Tiling & floor/wall finishes"),
  MARBRERIE: l("Marbre, pierre & zellige", "الرخام والحجر والزليج", "Marble, stone & zellige"),
  PEINTURE: l("Peinture & enduits", "الصباغة والطلاءات", "Painting & coatings"),
  QUINCAILLERIE: l("Quincaillerie & fixations", "الخردوات ومواد التثبيت", "Hardware & fixings"),
};

/** Familles du catalogue (champ `famille` de domain/materiaux/catalogue.ts), clé = libellé français. */
export const FAMILLES_L3: Record<string, { ar: string; en: string }> = {
  "Aciers d'armature": { ar: "حديد التسليح", en: "Reinforcing steel" },
  Liants: { ar: "المواد الرابطة (إسمنت، جير)", en: "Binders" },
  Mortiers: { ar: "الملاط", en: "Mortars" },
  Enduits: { ar: "التلبيسات", en: "Renders" },
  Granulats: { ar: "الحصى والرمال", en: "Aggregates" },
  Pierres: { ar: "الأحجار", en: "Stones" },
  "Bétons": { ar: "الخرسانة", en: "Concrete" },
  "Blocs & briques": { ar: "الآجر والطوب", en: "Blocks & bricks" },
  Planchers: { ar: "الأسقف (البلانشي)", en: "Floor systems" },
  Coffrages: { ar: "القوالب (الكوفراج)", en: "Formwork" },
  "Films & accessoires": { ar: "الأغشية والملحقات", en: "Films & accessories" },
  Membranes: { ar: "الأغشية العازلة", en: "Membranes" },
  "Primaires & enduits": { ar: "الطلاءات الأولية", en: "Primers & coatings" },
  Accessoires: { ar: "الملحقات", en: "Accessories" },
  Drainage: { ar: "الصرف", en: "Drainage" },
  "Formes de pente": { ar: "طبقات الميل", en: "Screeds to falls" },
  Isolants: { ar: "مواد العزل", en: "Insulants" },
  Thermique: { ar: "العزل الحراري", en: "Thermal" },
  Acoustique: { ar: "العزل الصوتي", en: "Acoustic" },
  "Éléments béton VRD": { ar: "عناصر خرسانية للطرق والشبكات", en: "Precast concrete for external works" },
  "Enrobés": { ar: "الإسفلت", en: "Asphalt" },
  "Granulats VRD": { ar: "حصى الطرق", en: "Road aggregates" },
  Pavage: { ar: "الترصيف", en: "Paving" },
  "Regards & ouvrages": { ar: "البالوعات والمنشآت", en: "Manholes & structures" },
  Canalisations: { ar: "القنوات", en: "Pipes" },
  "Clôture & extérieur": { ar: "الأسوار والتهيئة الخارجية", en: "Fencing & outdoor" },
  Appareillage: { ar: "الأجهزة الكهربائية (مفاتيح ومقابس)", en: "Switches & sockets" },
  "Courants faibles": { ar: "التيارات الضعيفة", en: "Low voltage" },
  "Câbles": { ar: "الأسلاك والكابلات", en: "Cables" },
  "Mise à la terre": { ar: "التأريض", en: "Earthing" },
  Tableaux: { ar: "اللوحات الكهربائية", en: "Distribution boards" },
  Protection: { ar: "الحماية", en: "Protection" },
  Conduits: { ar: "الأنابيب الكهربائية", en: "Conduits" },
  Luminaires: { ar: "الإنارة", en: "Light fittings" },
  Robinetterie: { ar: "الصنابير", en: "Taps & valves" },
  Sanitaires: { ar: "الأدوات الصحية", en: "Sanitary ware" },
  "Évacuation": { ar: "الصرف الصحي", en: "Drainage & waste" },
  Isolation: { ar: "العزل", en: "Insulation" },
  "Eau chaude sanitaire": { ar: "الماء الساخن", en: "Domestic hot water" },
  "Production froid": { ar: "إنتاج التبريد", en: "Cooling units" },
  "Liaisons frigorifiques": { ar: "وصلات التبريد", en: "Refrigerant lines" },
  "Isolation frigorifique": { ar: "عزل التبريد", en: "Refrigerant insulation" },
  Gaines: { ar: "قنوات الهواء", en: "Ducts" },
  "Diffusion d'air": { ar: "توزيع الهواء", en: "Air diffusion" },
  "Traitement d'air": { ar: "معالجة الهواء", en: "Air handling" },
  Ventilation: { ar: "التهوية", en: "Ventilation" },
  "Chambre froide": { ar: "غرف التبريد", en: "Cold rooms" },
  Supports: { ar: "الحوامل", en: "Supports" },
  Chauffage: { ar: "التدفئة", en: "Heating" },
  "Profilés acier": { ar: "المقاطع الفولاذية", en: "Steel sections" },
  "Planchers collaborants": { ar: "الأسقف المركبة", en: "Composite decks" },
  Boulonnerie: { ar: "البراغي والصواميل", en: "Bolts & nuts" },
  Fixations: { ar: "مواد التثبيت", en: "Fixings" },
  "Garde-corps": { ar: "الدرابزين", en: "Railings" },
  "Platines & assemblages": { ar: "الصفائح والوصلات", en: "Plates & connections" },
  "Tôlerie": { ar: "الصفائح المعدنية", en: "Sheet metal" },
  Panneaux: { ar: "الألواح", en: "Panels" },
  "Protection & peinture": { ar: "الحماية والصباغة", en: "Protection & paint" },
  "Profilés alu": { ar: "مقاطع الألمنيوم", en: "Aluminium profiles" },
  "Fenêtres": { ar: "النوافذ", en: "Windows" },
  Portes: { ar: "الأبواب", en: "Doors" },
  Fermetures: { ar: "الإغلاقات (الستائر المعدنية)", en: "Shutters" },
  Motorisation: { ar: "المحركات الآلية", en: "Motorisation" },
  Vitrage: { ar: "الزجاج", en: "Glazing" },
  "Ossatures façade": { ar: "هياكل الواجهات", en: "Façade frames" },
  Bardage: { ar: "تكسية الواجهات", en: "Cladding" },
  Finitions: { ar: "التشطيبات", en: "Finishes" },
  "Plans de travail": { ar: "أسطح العمل", en: "Worktops" },
  "Plans & composites": { ar: "الأسطح والمواد المركبة", en: "Tops & composites" },
  Tablettes: { ar: "الرفوف", en: "Shelves & sills" },
  "Bois massif": { ar: "الخشب الصلب", en: "Solid wood" },
  Quincaillerie: { ar: "الخردوات", en: "Hardware" },
  "Plâtres": { ar: "الجبس", en: "Plasters" },
  Plaques: { ar: "ألواح الجبس", en: "Plasterboards" },
  Ossatures: { ar: "الهياكل الحاملة", en: "Framing" },
  Dalles: { ar: "البلاطات", en: "Tiles (ceiling)" },
  "Profilés lumineux": { ar: "المقاطع المضيئة", en: "Light profiles" },
  Staff: { ar: "الجبس المزخرف (السطاف)", en: "Decorative plaster" },
  Carrelage: { ar: "البلاط", en: "Floor tiles" },
  "Faïence": { ar: "الزليج الحائطي (الفايونس)", en: "Wall tiles" },
  Plinthes: { ar: "الوزرات", en: "Skirtings" },
  Parquet: { ar: "الباركيه", en: "Parquet" },
  "Sols souples": { ar: "الأرضيات المرنة", en: "Resilient flooring" },
  "Colles & joints": { ar: "اللواصق ومواد الفواصل", en: "Adhesives & grouts" },
  "Préparation": { ar: "التحضير", en: "Preparation" },
  "Résines": { ar: "الراتنجات", en: "Resins" },
  Miroiterie: { ar: "المرايا", en: "Mirrors" },
  Marbre: { ar: "الرخام", en: "Marble" },
  Granit: { ar: "الجرانيت", en: "Granite" },
  Pierre: { ar: "الحجر", en: "Stone" },
  Zellige: { ar: "الزليج", en: "Zellige" },
  "Plans & escaliers": { ar: "الأسطح والأدراج", en: "Tops & stairs" },
  Peintures: { ar: "الصباغات", en: "Paints" },
  "Enduits & sous-couches": { ar: "المعاجين والطبقات التحضيرية", en: "Fillers & undercoats" },
  "Visserie & fixation": { ar: "البراغي ومواد التثبيت", en: "Screws & fixings" },
  Serrurerie: { ar: "الأقفال", en: "Locks" },
};
export const famille3 = (famille: string): L3 => ({ fr: famille, ar: FAMILLES_L3[famille]?.ar || famille, en: FAMILLES_L3[famille]?.en || famille });

/** Unités (matériaux, ouvrages, services). */
export const UNITES_L3: Record<string, L3> = {
  kg: l("kg", "كلغ", "kg"),
  t: l("tonne", "طن", "tonne"),
  m3: l("m³", "م³", "m³"),
  "m³": l("m³", "م³", "m³"),
  m2: l("m²", "م²", "m²"),
  "m²": l("m²", "م²", "m²"),
  ml: l("ml", "متر طولي", "lin. m"),
  u: l("unité", "وحدة", "unit"),
  l: l("litre", "لتر", "litre"),
  ens: l("ensemble", "مجموعة", "set"),
  h: l("heure", "ساعة", "hour"),
  jour: l("jour", "يوم", "day"),
  sem: l("semaine", "أسبوع", "week"),
  mois: l("mois", "شهر", "month"),
  forfait: l("forfait", "جزافي", "lump sum"),
  ha: l("hectare", "هكتار", "hectare"),
  voyage: l("voyage", "رحلة", "trip"),
  kWc: l("kWc", "كيلوواط ذروة", "kWp"),
  m2mois: l("m² par mois", "م² في الشهر", "m² per month"),
};
export const unite3 = (u: string): L3 => UNITES_L3[u] || { fr: u, ar: u, en: u };

/** Lots du chiffrage (domain/chiffrage/lots.ts), utilisés comme « corps d'état ». */
export const LOTS_L3: Record<string, L3> = {
  INS: l("Installation de chantier", "تجهيز الورش", "Site set-up"),
  TER: l("Terrassements", "أشغال الحفر والردم", "Earthworks"),
  FON: l("Fondations, infrastructure et soutènement", "الأساسات والبنية التحتية والجدران الساندة", "Foundations & retaining structures"),
  STR: l("Structure béton armé", "هيكل الخرسانة المسلحة", "Reinforced concrete structure"),
  MAC: l("Maçonnerie et enduits", "البناء والتلبيس", "Masonry & rendering"),
  ETA: l("Étanchéité et isolation", "العزل المائي والحراري", "Waterproofing & insulation"),
  FAC: l("Façades", "الواجهات", "Façades"),
  ALU: l("Menuiseries extérieures aluminium", "نجارة الألمنيوم الخارجية", "Aluminium external joinery"),
  BOI: l("Menuiseries intérieures bois et cuisine", "النجارة الخشبية الداخلية والمطبخ", "Interior wood joinery & kitchen"),
  MET: l("Métallerie, ferronnerie", "الحدادة والحديد المشغول", "Metalwork & ironwork"),
  FPL: l("Faux plafonds, plâtre et staff", "الأسقف المستعارة والجبس والسطاف", "False ceilings, plaster & staff"),
  RSO: l("Revêtements de sols", "تكسية الأرضيات", "Floor finishes"),
  RMU: l("Revêtements muraux (faïence)", "تكسية الجدران (الفايونس)", "Wall tiling"),
  PEI: l("Peinture intérieure", "الصباغة الداخلية", "Interior painting"),
  PLO: l("Plomberie sanitaire et eau chaude", "الترصيص الصحي والماء الساخن", "Plumbing & hot water"),
  ELE: l("Électricité", "الكهرباء", "Electrical"),
  CFA: l("Courants faibles", "التيارات الضعيفة", "Low voltage systems"),
  CVC: l("Climatisation", "التكييف", "Air conditioning"),
  ASC: l("Ascenseur / élévateur", "المصعد", "Lift"),
  ENR: l("Énergies renouvelables", "الطاقات المتجددة", "Renewable energy"),
  VRD: l("Assainissement et réseaux extérieurs", "التطهير والشبكات الخارجية", "Drainage & external networks"),
  EXT: l("Clôture, portail, piscine et extérieurs", "السور والبوابة والمسبح والتهيئة الخارجية", "Fencing, gate, pool & outdoor"),
};

/** Régions (codes de domain/materiaux/regions.ts). */
export const REGIONS_L3: Record<string, L3> = {
  "tanger-tetouan-al-hoceima": l("Tanger-Tétouan-Al Hoceima", "طنجة تطوان الحسيمة", "Tangier-Tetouan-Al Hoceima"),
  oriental: l("Oriental", "الشرق", "Oriental"),
  "fes-meknes": l("Fès-Meknès", "فاس مكناس", "Fez-Meknes"),
  "rabat-sale-kenitra": l("Rabat-Salé-Kénitra", "الرباط سلا القنيطرة", "Rabat-Sale-Kenitra"),
  "beni-mellal-khenifra": l("Béni Mellal-Khénifra", "بني ملال خنيفرة", "Beni Mellal-Khenifra"),
  "casablanca-settat": l("Casablanca-Settat", "الدار البيضاء سطات", "Casablanca-Settat"),
  "marrakech-safi": l("Marrakech-Safi", "مراكش آسفي", "Marrakesh-Safi"),
  "draa-tafilalet": l("Drâa-Tafilalet", "درعة تافيلالت", "Draa-Tafilalet"),
  "souss-massa": l("Souss-Massa", "سوس ماسة", "Souss-Massa"),
  "guelmim-oued-noun": l("Guelmim-Oued Noun", "كلميم واد نون", "Guelmim-Oued Noun"),
  "laayoune-sakia-el-hamra": l("Laâyoune-Sakia El Hamra", "العيون الساقية الحمراء", "Laayoune-Sakia El Hamra"),
  "dakhla-oued-ed-dahab": l("Dakhla-Oued Ed-Dahab", "الداخلة وادي الذهب", "Dakhla-Oued Ed-Dahab"),
  national: l("Tout le Maroc", "كل المغرب", "Nationwide"),
};
export const region3 = (code: string): L3 => REGIONS_L3[code] || { fr: code, ar: code, en: code };

/** Fiabilité d'un prix affiché. */
export const FIABILITE_L3: Record<string, L3> = {
  A: l("Prix fournisseurs vérifiés (3 offres ou plus)", "أسعار موردين موثقة (3 عروض أو أكثر)", "Verified supplier prices (3+ offers)"),
  B: l("Source publique datée", "مصدر عمومي مؤرخ", "Dated public source"),
  C: l("Indicatif", "إرشادي", "Indicative"),
  H: l("Hypothèse CITURBAREA", "فرضية سيتوربارية", "CITURBAREA assumption"),
};
