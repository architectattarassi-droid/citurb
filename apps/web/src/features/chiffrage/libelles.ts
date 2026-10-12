/**
 * Traduction à l'affichage des libellés métier du moteur de chiffrage
 * (domain/chiffrage garde ses libellés français, utilisés pour le CPS).
 * Correspondance par CODE (lot, ouvrage, standing, régime, formule, scénario…),
 * repli sur le libellé français pour toute clé manquante.
 */
import type { Lang } from "../../i18n/i18n";

/** [anglais, arabe] */
type Tr = [string, string];
type Table = Record<string, Tr>;

const pick = (lang: Lang, t: Tr | undefined, fr: string): string =>
  !t || lang === "fr" ? fr : (lang === "en" ? t[0] : t[1]) || fr;

// ── Lots ───────────────────────────────────────────────────────────────────
const LOTS: Table = {
  INS: ["Site set-up", "تجهيز الورش"],
  TER: ["Earthworks", "أشغال الحفر والتسوية (الترسيب)"],
  FON: ["Foundations, substructure and retaining walls", "الأساسات (الساس) والبنية التحتية والجدران الساندة"],
  STR: ["Reinforced concrete structure", "الهيكل بالخرسانة المسلحة (البيطون)"],
  MAC: ["Masonry and plastering", "البناء (الماصونري) والتلبيس"],
  ETA: ["Waterproofing and insulation", "العزل المائي (الإيطانشيتي) والعزل الحراري"],
  FAC: ["Facades (external render and paint)", "الواجهات (التلبيس والصباغة الخارجية)"],
  ALU: ["Aluminium windows and external doors", "النجارة الخارجية بالألومنيوم"],
  BOI: ["Internal joinery and kitchen", "النجارة الداخلية بالخشب والمطبخ"],
  MET: ["Metalwork, railings", "الحدادة (الفيرونري)"],
  FPL: ["Suspended ceilings, plaster and staff", "الأسقف المعلقة والجبس (الستاف)"],
  RSO: ["Floor finishes", "تكسية الأرضيات (الزليج والرخام)"],
  RMU: ["Wall tiling", "تكسية الجدران (الفايونس)"],
  PEI: ["Interior painting", "الصباغة الداخلية"],
  PLO: ["Plumbing, sanitary ware and hot water", "الترصيص الصحي (البلومبري) والماء الساخن"],
  ELE: ["Electrical installation", "الكهرباء"],
  CFA: ["Low-voltage systems (data, intercom)", "التيارات الضعيفة (الشبكة، الأنترفون)"],
  CVC: ["Air conditioning", "التكييف (الكليماتيزاسيون)"],
  ASC: ["Lift / home elevator", "المصعد"],
  ENR: ["Renewable energy (solar, photovoltaics)", "الطاقات المتجددة (السخان الشمسي، الألواح الشمسية)"],
  VRD: ["Drainage and external networks", "التطهير والشبكات الخارجية"],
  EXT: ["Boundary wall, gate, pool and external works", "السور، البوابة، المسبح والأشغال الخارجية"],
};

// ── Ouvrages (lignes du DQE) ───────────────────────────────────────────────
const OUVRAGES: Table = {
  "TER.01": ["Topsoil stripping, 20 cm deep", "إزالة التربة السطحية بعمق 20 سم"],
  "TER.02": ["Bulk excavation, ordinary ground", "الحفر الكامل في أرض عادية"],
  "TER.03": ["Trench and pit excavation for foundations", "حفر الخنادق والحفر للأساسات"],
  "TER.04": ["Extra over for excavation in rock (rock breaker)", "زيادة ثمن الحفر في أرض صخرية (البريز روش)"],
  "TER.05": ["Removal of surplus spoil (bulked)", "نقل الأتربة الزائدة (مع الانتفاش)"],
  "TER.06": ["Compacted fill with imported material (crusher run)", "ردم مدكوك بمواد مجلوبة (التوفنان)"],
  "TER.07": ["Compacted backfill reusing excavated material", "ردم مدكوك بإعادة استعمال الأتربة المحفورة"],
  "TER.08": ["Temporary shoring of excavations", "تدعيم مؤقت لجوانب الحفر"],
  "TER.09": ["Dewatering / groundwater lowering", "ضخ المياه / تخفيض منسوب المياه الجوفية"],
  "FON.01": ["Blinding concrete B15, 10 cm thick", "بيطون النظافة B15 بسمك 10 سم"],
  "FON.02": ["Reinforced concrete for pad footings", "خرسانة مسلحة للقواعد المنفردة (السمائل)"],
  "FON.03": ["Reinforced concrete for strip footings", "خرسانة مسلحة للقواعد الشريطية"],
  "FON.04": ["Reinforced concrete raft foundation", "لبشة عامة (راديي) بالخرسانة المسلحة"],
  "FON.05": ["Reinforced concrete for ground beams", "خرسانة مسلحة للجسور الأرضية (لونغرين)"],
  "FON.06": ["Reinforced concrete for column starters", "خرسانة مسلحة لبدايات الأعمدة (الأموْرس)"],
  "FON.07": ["Hardcore / sub-base in crusher run, 20 cm thick", "طبقة الحجر (الهيريسون) بالتوفنان بسمك 20 سم"],
  "FON.08": ["Ground-bearing slab reinforced with welded mesh, 12 cm thick", "بلاطة على الأرض مسلحة بشبكة ملحومة بسمك 12 سم"],
  "FON.09": ["Mass concrete for levelling / replacement", "خرسانة عادية للتسوية أو التعويض"],
  "FON.10": ["Buried perimeter wall in reinforced concrete B30, 20 cm thick", "جدار محيطي مدفون بالخرسانة المسلحة B30 بسمك 20 سم"],
  "FON.11": ["L-shaped reinforced concrete retaining wall (h ≤ 3 m), per m² of face", "جدار ساند بالخرسانة المسلحة على شكل L (العلو ≤ 3 م)، للمتر المربع من الواجهة"],
  "FON.12": ["Perimeter drainage: Ø100 drain, gravel bed, geotextile", "التصريف المحيطي: أنبوب Ø100، حصى تصريف، جيوتكستيل"],
  "FON.13": ["Waterproofing of buried walls: primer + bitumen membrane + protection", "عزل الجدران المدفونة: طبقة أساس + غشاء بيتوميني + حماية"],
  "FON.14": ["Internal tanking (groundwater present)", "تبطين داخلي مانع للماء (وجود فرشة مائية)"],
  "FON.15": ["Gabion retaining wall (cage + stone), per m³", "جدار ساند بالقفف الحجرية (الغابيون)، للمتر المكعب"],
  "FON.16": ["Rubble-stone gravity wall, per m³", "جدار ثقلي بالحجر (الدبش)، للمتر المكعب"],
  "STR.01": ["Reinforced concrete for columns", "خرسانة مسلحة للأعمدة (البوطو)"],
  "STR.02": ["Reinforced concrete for beams, ring beams and lintels", "خرسانة مسلحة للجسور (البوتر) والأحزمة والعتبات"],
  "STR.03": ["Hollow-block floor 16+4 (joists, hollow blocks, topping slab)", "سقف بالهوردي 16+4 (روافد، هوردي، بلاطة الضغط)"],
  "STR.04": ["Hollow-block floor 20+5 (long spans)", "سقف بالهوردي 20+5 (بحور كبيرة)"],
  "STR.05": ["Solid reinforced concrete slab (balconies, cantilevers, landings)", "بلاطة مصمتة بالخرسانة المسلحة (الدالة: البلكونات، البروزات، البسطات)"],
  "STR.06": ["Reinforced concrete staircase (waist slab and steps)", "درج بالخرسانة المسلحة (الدروج)"],
  "STR.07": ["Reinforced concrete walls (stair / lift core)", "جدران بالخرسانة المسلحة (قفص الدرج / المصعد)"],
  "STR.08": ["Masonry parapet h 0.60 m with ring beam and render", "حاجز السطح (أكروتير) بعلو 0,60 م مع حزام وتلبيس"],
  "MAC.01": ["20 cm hollow concrete block wall", "حائط بالآجور الإسمنتي (البريك) 20 سم"],
  "MAC.02": ["15 cm hollow concrete block wall", "حائط بالآجور الإسمنتي (البريك) 15 سم"],
  "MAC.03": ["10 cm hollow block partition", "حاجز داخلي بالبريك 10 سم"],
  "MAC.05": ["Internal cement plaster, trued (walls)", "تلبيس داخلي بالإسمنت مستقيم (الجدران)"],
  "MAC.06": ["Cement plaster to ceilings", "تلبيس السقف بالإسمنت"],
  "MAC.07": ["Cement screed 5 cm (base for floor finishes)", "شاب إسمنتية بسمك 5 سم (قاعدة للتكسية)"],
  "ETA.01": ["Mortar falls screed, average 6 cm", "طبقة الميلان (الفورم دو بانت) بالملاط بمتوسط 6 سم"],
  "ETA.02": ["Two-layer SBS bitumen waterproofing (3 + 4 mm), torch-applied", "عزل مائي بطبقتين من البيتوم SBS (3 + 4 مم) ملحوم"],
  "ETA.03": ["Heavy protection: 4 cm screed on geotextile", "حماية ثقيلة: شاب 4 سم فوق جيوتكستيل"],
  "ETA.04": ["Roof thermal insulation XPS 4 cm", "عزل حراري للسطح XPS بسمك 4 سم"],
  "ETA.05": ["Roof thermal insulation EPS 4 cm", "عزل حراري للسطح PSE بسمك 4 سم"],
  "ETA.06": ["Waterproofing upstands on parapets (h ≥ 15 cm)", "رفع العزل المائي على الأكروتير (العلو ≥ 15 سم)"],
  "ETA.07": ["Waterproofing under tiles in wet rooms", "عزل مائي تحت الزليج في الحمامات والمطابخ"],
  "FAC.01": ["External three-coat render (scaffolding included)", "تلبيس خارجي بثلاث طبقات (مع السقالات)"],
  "FAC.02": ["Vinyl facade paint, 2 coats on primer", "صباغة الواجهة الفينيلية طبقتان فوق طبقة أساس"],
  "FAC.03": ["Siloxane facade paint, 2 coats on primer", "صباغة الواجهة بالسيلوكسان طبقتان فوق طبقة أساس"],
  "FAC.04": ["Bonded natural stone facade cladding", "تكسية الواجهة بالحجر الطبيعي الملصق"],
  "ALU.01": ["Aluminium windows without thermal break, single or basic double glazing, installed", "نوافذ ألومنيوم بدون قاطع حراري، زجاج عادي أو مزدوج بسيط، مركبة"],
  "ALU.02": ["Thermally broken aluminium windows, double glazing 4/16/4, installed", "نوافذ ألومنيوم بقاطع حراري، زجاج مزدوج 4/16/4، مركبة"],
  "ALU.03": ["Reinforced thermally broken aluminium joinery, large openings, installed", "نجارة ألومنيوم بقاطع حراري معززة، فتحات كبيرة، مركبة"],
  "ALU.04": ["Premium lift-and-slide doors, installed", "أبواب منزلقة رافعة فاخرة، مركبة"],
  "ALU.05": ["Aluminium roller shutters", "شراجم ملفوفة (فوليط) بالألومنيوم"],
  "ALU.06": ["Solid aluminium entrance door, installed", "باب المدخل بالألومنيوم المصمت، مركب"],
  "BOI.01": ["Melamine flush interior door, installed", "باب داخلي مسطح بالميلامين، مركب"],
  "BOI.02": ["Complete interior door set, installed", "باب داخلي كامل بالإطار (بلوك بورت)، مركب"],
  "BOI.03": ["Solid pine interior door, installed", "باب داخلي بخشب الصنوبر المصمت، مركب"],
  "BOI.04": ["Solid oak interior door, installed", "باب داخلي بخشب البلوط المصمت، مركب"],
  "BOI.05": ["Solid wood entrance door, installed", "باب المدخل بالخشب المصمت، مركب"],
  "BOI.06": ["Bespoke fitted kitchen (excluding appliances), installed", "مطبخ مجهز حسب الطلب (بدون الأجهزة)، مركب"],
  "BOI.07": ["Built-in wardrobes: sliding fronts and interior fittings", "خزائن حائطية (بلاكار): واجهات منزلقة وتجهيز داخلي"],
  "BOI.10": ["Fitted kitchen installed — very economical (excluding appliances)", "مطبخ مجهز مركب — اقتصادي جدا (بدون الأجهزة)"],
  "BOI.11": ["Fitted kitchen installed — mid-range (excluding appliances)", "مطبخ مجهز مركب — مستوى متوسط (بدون الأجهزة)"],
  "BOI.12": ["Fitted kitchen installed — standard (excluding appliances)", "مطبخ مجهز مركب — مستوى جيد (بدون الأجهزة)"],
  "BOI.13": ["Fitted kitchen installed — high-end (excluding appliances)", "مطبخ مجهز مركب — مستوى رفيع (بدون الأجهزة)"],
  "BOI.14": ["Fitted kitchen installed — luxury (excluding appliances)", "مطبخ مجهز مركب — فاخر (بدون الأجهزة)"],
  "MET.01": ["Aluminium baluster railing, installed", "درابزين ألومنيوم بالقضبان، مركب"],
  "MET.02": ["Stainless steel 304 railing, installed", "درابزين من الإينوكس 304، مركب"],
  "MET.03": ["Toughened glass railing with stainless posts, installed", "درابزين زجاج مقوى بقوائم إينوكس، مركب"],
  "MET.04": ["All-glass laminated railing, installed", "درابزين بالزجاج المصفح بالكامل، مركب"],
  "MET.05": ["Steel security grilles, installed", "شبابيك حماية بالحديد (الشرجم)، مركبة"],
  "FPL.01": ["Plasterboard (BA13) ceiling on galvanised frame", "سقف معلق بالبلاكو BA13 على هيكل مجلفن"],
  "FPL.02": ["Decorative staff ceiling with cornices", "سقف معلق بالجبس المزخرف (الستاف) مع الكرانيش"],
  "RSO.01": ["Porcelain tiles 45×45, mortar-bedded, grouting included", "زليج غري سيرام 45×45 مثبت بالملاط، مع الجوانات"],
  "RSO.02": ["Porcelain tiles 60×60, glued, grouting included", "زليج غري سيرام 60×60 ملصق، مع الجوانات"],
  "RSO.03": ["Large-format porcelain tiles, glued (double buttering)", "زليج غري سيرام كبير الحجم ملصق (لصق مزدوج)"],
  "RSO.04": ["Local polished marble 2 cm, laid, ground and crystallised", "رخام محلي مصقول 2 سم، مركب ومحكوك ومبلور"],
  "RSO.05": ["Imported polished marble 2 cm, laid, ground and crystallised", "رخام مستورد مصقول 2 سم، مركب ومحكوك ومبلور"],
  "RSO.06": ["Matching skirting", "الوزرة (البلانط) المتناسقة"],
  "RMU.01": ["Wall tiles 30×60, glued (standard range)", "فايونس حائطي 30×60 ملصق (تشكيلة عادية)"],
  "RMU.02": ["Decorative wall tiles, glued", "فايونس حائطي مزخرف ملصق"],
  "RMU.03": ["Zellige 10×10 laid by a maâlem", "زليج 10×10 يركبه المعلم"],
  "PEI.01": ["Skim coat + 2 coats of vinyl paint (economy range)", "معجون التمليس + صباغة فينيلية طبقتان (تشكيلة اقتصادية)"],
  "PEI.02": ["Skim coat + 2 coats of washable vinyl paint", "معجون التمليس + صباغة فينيلية قابلة للغسل طبقتان"],
  "PEI.03": ["Two-pass skim coat + 2 coats of high-end matt acrylic", "معجون بمرتين + صباغة أكريليك مطفية رفيعة طبقتان"],
  "PLO.01": ["Water point: PPR supply + PVC waste + fittings", "نقطة ماء: تزويد PPR + صرف PVC + الوصلات"],
  "PLO.02": ["Economy shower room fit-out: WC pack, pedestal basin, shower cabin", "تجهيز حمام اقتصادي: مرحاض، مغسلة بعمود، كابينة دوش"],
  "PLO.03": ["Standard bathroom fit-out: WC, basin, walk-in shower", "تجهيز حمام عادي: مرحاض، مغسلة، دوش إيطالي"],
  "PLO.04": ["High-end bathroom fit-out: wall-hung WC, vanity basin, screen", "تجهيز حمام رفيع: مرحاض معلق، حوض، حاجز زجاجي"],
  "PLO.05": ["Luxury bathroom fit-out: wall-hung WC, vanity basin, concealed shower", "تجهيز حمام فاخر: مرحاض معلق، حوض، دوش مدمج"],
  "PLO.06": ["Kitchen sink: mixer tap and connection", "مغسلة المطبخ: خلاط وربط"],
  "PLO.07": ["Kitchen sink: high-end mixer tap", "مغسلة المطبخ: خلاط رفيع"],
  "PLO.08": ["100 L electric water heater with safety group", "سخان ماء كهربائي 100 لتر مع مجموعة الأمان"],
  "PLO.09": ["Guest WC: WC pack and hand basin", "مرحاض الضيوف: مرحاض ومغسلة يد"],
  "PLO.10": ["PVC soil and waste stacks and collectors Ø100-125 (fittings included)", "أعمدة ومجمعات الصرف PVC Ø100-125 (مع الوصلات)"],
  "PLO.11": ["PVC rainwater downpipe Ø100 with outlet and brackets", "أنبوب مياه الأمطار PVC Ø100 مع المخرج والمشابك"],
  "PLO.12": ["Main supply: meter chamber, hot/cold manifolds, valves", "التزويد العام: علبة العداد، موزعات الماء البارد والساخن، صمامات"],
  "ELE.01": ["Recessed single-switch lighting point (conduit, 1.5 mm² wire, switch)", "نقطة إنارة مدمجة بمفتاح واحد (غلاف، سلك 1,5 مم²، مفتاح)"],
  "ELE.02": ["Recessed 2P+E 16 A socket outlet (2.5 mm² wire)", "مأخذ كهربائي 2P+T 16 A مدمج (سلك 2,5 مم²)"],
  "ELE.03": ["Lighting point with designer fittings", "نقطة إنارة بتجهيزات ديزاين"],
  "ELE.04": ["Socket outlet with designer fittings", "مأخذ كهربائي بتجهيزات ديزاين"],
  "ELE.05": ["Dedicated circuit (hob, oven, washing machine, water heater, AC)", "دارة مخصصة (فرن، طباخة، آلة غسيل، سخان، مكيف)"],
  "ELE.06": ["Equipped distribution board (42-module enclosure, 30 mA RCDs)", "لوحة كهربائية مجهزة (علبة 42 وحدة، قواطع تفاضلية 30 mA)"],
  "ELE.07": ["Earth electrode and equipotential bonding", "الربط بالأرض والوصلات متساوية الجهد"],
  "ELE.08": ["Basic LED light fitting installed (downlight or ceiling light)", "مصباح LED أساسي مركب (سبوط مدمج أو سقفي)"],
  "ELE.09": ["Floor sub-distribution board (enclosure, RCD, breakers)", "لوحة فرعية للطابق (علبة، قاطع تفاضلي، قواطع)"],
  "CFA.01": ["Low-voltage: data cabinet, RJ45/TV outlets, intercom", "التيارات الضعيفة: علبة الشبكة، مآخذ RJ45/TV، أنترفون"],
  "CFA.02": ["Alarm and CCTV", "الإنذار والمراقبة بالكاميرات"],
  "CFA.03": ["Home automation (lighting, shutters, air conditioning)", "المنزل الذكي (الإنارة، الشراجم، التكييف)"],
  "CVC.01": ["12,000 BTU inverter split unit installed (bedroom)", "مكيف سبليت إنفرتر 12 000 BTU مركب (غرفة النوم)"],
  "CVC.02": ["24,000 BTU inverter split unit installed (living room)", "مكيف سبليت إنفرتر 24 000 BTU مركب (الصالون)"],
  "CVC.03": ["Premium 12,000 BTU split unit installed", "مكيف سبليت فاخر 12 000 BTU مركب"],
  "CVC.04": ["Ducted air conditioning (unit, ducts, diffusers) installed", "تكييف بالقنوات (وحدة، قنوات، موزعات) مركب"],
  "ASC.01": ["Home elevator 250 kg, 2 levels", "مصعد منزلي 250 كغ، طابقان"],
  "ASC.02": ["Traction lift 480 kg, 4 levels", "مصعد بالكابل 480 كغ، 4 طوابق"],
  "ASC.03": ["Extra per additional level served", "زيادة لكل طابق إضافي مخدوم"],
  "ASC.04": ["Civil works for lift shaft and pit", "الهندسة المدنية لبئر وحفرة المصعد"],
  "ENR.01": ["200 L solar water heater installed", "سخان شمسي 200 لتر مركب"],
  "ENR.02": ["Turnkey photovoltaic installation", "منشأة ألواح شمسية كهروضوئية جاهزة"],
  "VRD.01": ["PVC Ø200 drainage pipe in trench on sand bed", "قناة تطهير PVC Ø200 في خندق على فرشة رمل"],
  "VRD.02": ["60×60 inspection chamber with cast-iron cover", "بالوعة تفتيش (رݣار) 60×60 بغطاء من الفونط"],
  "EXT.01": ["Masonry boundary wall h 2.20 m on strip footing, rendered both sides", "سور مبني بعلو 2,20 م على قاعدة شريطية، ملبس من الجهتين"],
  "EXT.02": ["Metal gate and pedestrian gate, installed", "بوابة حديدية وباب صغير، مركبان"],
  "EXT.03": ["Pool: reinforced concrete shell, waterproofing and finish (excluding excavation)", "المسبح: حوض بالخرسانة المسلحة، العزل والتكسية (بدون الحفر)"],
  "EXT.04": ["Pool: filtration, pump and plant room", "المسبح: التصفية، المضخة والغرفة التقنية"],
};

// ── Standings, régimes, formules d'architecte, familles ─────────────────────
const STANDINGS: Table = {
  ULTRA_ECO: ["Very economical", "اقتصادي جدا"],
  ECONOMIQUE: ["Mid-range", "مستوى متوسط"],
  STANDARD: ["Standard", "ستاندينغ (مستوى جيد)"],
  STANDING: ["High-end", "مستوى رفيع (هوت ستاندينغ)"],
  PREMIUM: ["Luxury", "فاخر"],
};
const REGIMES: Table = {
  ENTREPRISE: ["General contractor (excl. VAT, overheads and margin included)", "مقاولة عامة (دون الضريبة، مع المصاريف والربح)"],
  TACHERON: ["Labour-only contractor (tâcheron) / craftsmen (supplies bought by the client, labour outside VAT)", "طاشرون / المعلم (المواد يشتريها الزبون، اليد العاملة بدون ضريبة)"],
};
const REGIMES_COURTS: Table = {
  ENTREPRISE: ["General contractor (turnkey)", "مقاولة عامة (مفتاح في اليد)"],
  TACHERON: ["Labour-only contractor (tâcheron) (you buy the supplies)", "طاشرون / المعلم (أنت تشتري المواد)"],
};
const FORMULES: Record<string, { l: Tr; d: Tr }> = {
  PLAN_TYPE: { l: ["Standard plan", "تصميم نموذجي"], d: ["Existing architect's plan adapted to your plot, permit application, fixed fee", "تصميم معماري موجود يُكيَّف مع أرضك، ملف رخصة البناء، بثمن جزافي"] },
  ESSENTIEL: { l: ["Custom plan — Essential", "تصميم حسب الطلب — أساسي"], d: ["Bespoke design up to the building permit", "تصميم حسب الطلب حتى رخصة البناء"] },
  AVANCE: { l: ["Custom plan — Advanced", "تصميم حسب الطلب — متقدم"], d: ["Bespoke design + construction drawings to tender to contractors", "تصميم حسب الطلب + تصاميم التنفيذ لاستشارة المقاولات"] },
  COMPLET: { l: ["Custom plan — Complete", "تصميم حسب الطلب — كامل"], d: ["Bespoke design, construction drawings and site supervision until handover", "تصميم حسب الطلب، التنفيذ وتتبع الورش حتى التسليم"] },
};
const FAMILLES: Table = {
  INSTALLATION: ["Site set-up", "تجهيز الورش"],
  TERRASSEMENTS_FONDATIONS: ["Earthworks, foundations and retaining walls", "الحفر والأساسات والجدران الساندة"],
  STRUCTURE_MACONNERIE: ["Structure, masonry and plastering (shell excluding foundations)", "الهيكل والبناء والتلبيس (الأشغال الكبرى بدون الأساسات)"],
  ETANCHEITE: ["Waterproofing and insulation", "العزل المائي والحراري"],
  SECOND_OEUVRE: ["Fit-out and finishes", "أشغال التشطيب"],
  EQUIPEMENTS: ["Equipment (air conditioning, lift, solar)", "التجهيزات (التكييف، المصعد، الطاقة الشمسية)"],
  EXTERIEURS: ["External works, networks and options", "الخارج والشبكات والاختيارات"],
};
const SOUTENEMENTS: Table = {
  COUR_ANGLAISE: ["Lightwell (cour anglaise)", "فناء إنجليزي (كور أنغليز)"],
  JARDIN: ["Garden retaining wall", "جدار ساند للحديقة"],
  TERRASSE: ["External terrace retaining wall", "جدار ساند للتراس الخارجي"],
  LIMITE: ["Retaining wall on the property line", "جدار ساند على حدود الملكية"],
};
const PRECISION: Table = {
  "1": ["Ratio-based estimate", "تقدير بالنسب"],
  "2": ["Parametric take-off", "قياس بارامتري للكميات"],
  "3": ["Quantities measured on drawings", "كميات مدخلة من التصاميم"],
};
const GROUPES_HYP: Table = {
  "Géométrie": ["Geometry", "الهندسة"], "Structure": ["Structure", "الهيكل"], "Fondations": ["Foundations", "الأساسات"],
  "Sous-sol": ["Basement", "الطابق تحت الأرضي"], "Pente": ["Slope", "الانحدار"], "Second œuvre": ["Fit-out", "أشغال التشطيب"],
  "Équipements": ["Equipment", "التجهيزات"], "Frais": ["Costs", "المصاريف"],
};
const HYPOTHESES: Table = {
  "geo.coefPerimetre": ["Perimeter = coefficient × √(area)", "المحيط = معامل × √(المساحة)"],
  "geo.epaisseurPlancher": ["Floor + finishes thickness (storey height = ceiling height + this figure)", "سمك السقف + التكسية (علو الطابق = علو السقف + هذا الرقم)"],
  "geo.ratioCloisons": ["Interior partitions per m² of floor (ceiling 2.9 m)", "الحواجز الداخلية لكل م² من المساحة (علو 2,9 م)"],
  "geo.ratioSols": ["Interior floor area / gross floor area", "مساحة الأرضيات الداخلية / المساحة المغطاة"],
  "geo.plinthes": ["Skirting per m² of floor", "الوزرة لكل م² من الأرضية"],
  "geo.faienceSdb": ["Wall tiles per bathroom", "الفايونس لكل حمام"],
  "geo.faienceCuisine": ["Wall tiles per kitchen (splashback)", "الفايونس لكل مطبخ (الكريدونس)"],
  "geo.partDallePleine": ["Share of floors in solid slab (balconies, landings)", "نسبة السقوف بالدالة المصمتة (البلكونات، البسطات)"],
  "geo.epDallePleine": ["Solid slab thickness", "سمك الدالة المصمتة"],
  "str.poteaux": ["Column concrete per m² of floor", "بيطون الأعمدة لكل م² من المساحة"],
  "str.poutres": ["Beam, ring beam and lintel concrete per m² of floor", "بيطون الجسور والأحزمة والعتبات لكل م²"],
  "str.escalier": ["Concrete per flight of stairs", "البيطون لكل مقطع درج"],
  "str.epDallePleineGenerale": ["Solid slab throughout: average thickness (4-5 m spans)", "دالة مصمتة في كل السقوف: السمك المتوسط (بحور 4-5 م)"],
  "str.voilesImmeuble": ["Stair / lift core walls per level (apartment building)", "جدران قفص الدرج / المصعد لكل طابق (عمارة)"],
  "fon.ratio.ROCHER": ["Foundations on rock: pad footings per m² of floor", "أساسات على الصخر: قواعد منفردة لكل م²"],
  "fon.ratio.BON": ["Good soil: pad footings per m² of floor", "تربة جيدة: قواعد منفردة لكل م²"],
  "fon.ratio.MOYEN": ["Average soil: strip footings per m² of floor", "تربة متوسطة: قواعد شريطية لكل م²"],
  "fon.radierEpaisseur": ["Raft (clay, fill, groundwater): average thickness incl. ribs, for G+1", "اللبشة (طين، ردم، فرشة مائية): السمك المتوسط مع الأعصاب، لـ R+1"],
  "fon.purge": ["Clay / fill: removal and replacement under the raft", "طين / ردم: إزالة وتعويض تحت اللبشة"],
  "fon.longrines": ["Ground beams per m² of footprint", "الجسور الأرضية لكل م² من مساحة البناء"],
  "fon.amorces": ["Column starters per m² of footprint", "بدايات الأعمدة لكل م² من مساحة البناء"],
  "fon.hauteurSemelle": ["Average footing depth (for blinding concrete)", "العلو المتوسط للقواعد (لبيطون النظافة)"],
  "fon.surlargeurFouilles": ["Excavation / foundation concrete volume", "الحفر / حجم بيطون الأساسات"],
  "ter.foisonnement": ["Bulking of removed spoil", "انتفاش الأتربة المنقولة"],
  "ter.abords": ["Stripped strip around the footprint", "الشريط المُزال حول مساحة البناء"],
  "ss.surlargeur": ["Extra excavation width around the basement", "عرض الحفر الإضافي حول الطابق تحت الأرضي"],
  "ss.semelleVoile": ["Strip footing under perimeter wall", "قاعدة شريطية تحت الجدار المحيطي"],
  "ss.reductionSemelles": ["Lightened pad footings: facade loads taken by the wall footing", "قواعد منفردة مخففة: أحمال الواجهة تحملها قاعدة الجدار"],
  "sout.coefLimite": ["Retaining wall on property line: surcharge (access, one-sided formwork, shoring)", "جدار ساند على الحدود: زيادة (الولوج، قالب من جهة واحدة، تدعيم)"],
  "ca.largeur": ["Lightwell: clear width", "الفناء الإنجليزي: العرض الحر"],
  "ss.semainesEpuisement": ["Dewatering duration", "مدة ضخ المياه الجوفية"],
  "pente.seuil": ["Slope above which retaining walls are needed", "الانحدار الذي تلزم بعده جدران ساندة"],
  "pente.zoneTerrassee": ["Levelled area / footprint", "المساحة المسواة / مساحة البناء"],
  "pente.surcoutFondations": ["Stepped foundations: extra concrete per % of slope", "أساسات مدرجة: بيطون إضافي لكل % من الانحدار"],
  "so.pointsLumineux": ["Lighting points per m² of floor", "نقاط الإنارة لكل م²"],
  "so.prises": ["Sockets per m² of floor", "المآخذ الكهربائية لكل م²"],
  "so.circuitsSpecialises": ["Dedicated circuits per dwelling (excluding AC)", "الدارات المخصصة لكل مسكن (بدون التكييف)"],
  "so.gardeCorpsBalcons": ["Railings per m² of balcony / terrace", "الدرابزين لكل م² من البلكون / التراس"],
  "so.gardeCorpsEscalier": ["Railings per flight of stairs", "الدرابزين لكل مقطع درج"],
  "so.etancheiteSdb": ["Waterproofing under tiles per bathroom", "العزل تحت الزليج لكل حمام"],
  "so.collecteurs": ["Stacks and collectors: lm per bathroom and kitchen, per level served", "أعمدة ومجمعات الصرف: م.ط لكل حمام ومطبخ ولكل طابق"],
  "so.placards": ["Wardrobes per bedroom", "الخزائن لكل غرفة نوم"],
  "so.partiesCommunes": ["Common areas (lobby, landings) per level, apartment building", "الأجزاء المشتركة (البهو، البسطات) لكل طابق، عمارة"],
  "so.faienceWc": ["Guest WC wall tiles", "فايونس مرحاض الضيوف"],
  "so.grillesDefense": ["Security grilles: share of openings fitted (ground floor and basement)", "شبابيك الحماية: نسبة النوافذ المجهزة (الأرضي والسفلي)"],
  "so.descentesEP": ["Roof area served per rainwater downpipe", "مساحة السطح لكل أنبوب مياه الأمطار"],
  "so.exterieurs": ["External lighting points (facades, garden, gate)", "نقاط الإنارة الخارجية (الواجهات، الحديقة، البوابة)"],
  "vrd.longueurReseau": ["External drainage network: fixed length added to √(plot)", "شبكة التطهير الخارجية: طول ثابت يضاف إلى √(الأرض)"],
  "vrd.regards": ["Drainage inspection chambers", "بالوعات التطهير"],
  "frais.installation": ["Site set-up, as % of works", "تجهيز الورش، كنسبة من الأشغال"],
  "frais.aleas": ["Contingency provision, as % of works", "احتياطي الطوارئ، كنسبة من الأشغال"],
};

/** Gammes de finition par lot (index = standing ULTRA_ECO → PREMIUM). */
const GAMMES: Record<string, { lot: Tr; gammes: Tr[] }> = {
  RSO: { lot: ["Floors", "الأرضيات"], gammes: [["Porcelain 45×45", "غري 45×45"], ["Porcelain 60×60", "غري 60×60"], ["Large-format porcelain", "غري كبير الحجم"], ["Local marble", "رخام محلي"], ["Imported marble", "رخام مستورد"]] },
  RMU: { lot: ["Wall tiles", "الفايونس"], gammes: [["Standard wall tiles", "فايونس عادي"], ["Standard wall tiles", "فايونس عادي"], ["Decorative wall tiles", "فايونس مزخرف"], ["Decorative wall tiles", "فايونس مزخرف"], ["Zellige", "زليج بلدي"]] },
  PEI: { lot: ["Paint", "الصباغة"], gammes: [["Economy vinyl", "فينيل اقتصادي"], ["Washable vinyl", "فينيل قابل للغسل"], ["Washable vinyl", "فينيل قابل للغسل"], ["High-end acrylic", "أكريليك رفيع"], ["High-end acrylic", "أكريليك رفيع"]] },
  FPL: { lot: ["Ceilings", "الأسقف"], gammes: [["Plaster, no suspended ceiling", "تلبيس بدون سقف معلق"], ["Plasterboard on 30%", "بلاكو على 30%"], ["Plasterboard on 60%", "بلاكو على 60%"], ["Plasterboard + staff 40%", "بلاكو + جبس 40%"], ["Decorative staff 70%", "جبس مزخرف 70%"]] },
  ALU: { lot: ["Windows", "النوافذ"], gammes: [["Aluminium, no thermal break", "ألومنيوم بدون قاطع حراري"], ["Thermally broken aluminium, double glazing", "ألومنيوم بقاطع حراري وزجاج مزدوج"], ["Thermally broken aluminium, large openings", "ألومنيوم بقاطع حراري، فتحات كبيرة"], ["+ 30% lift-and-slide", "+ 30% منزلق رافع"], ["+ 70% lift-and-slide", "+ 70% منزلق رافع"]] },
  BOI: { lot: ["Doors", "الأبواب"], gammes: [["Flush door", "باب مسطح"], ["Door set", "باب بالإطار"], ["Solid pine", "صنوبر مصمت"], ["Solid oak", "بلوط مصمت"], ["Solid oak", "بلوط مصمت"]] },
  MET: { lot: ["Railings", "الدرابزين"], gammes: [["Aluminium", "ألومنيوم"], ["Stainless steel", "إينوكس"], ["Glass and stainless steel", "زجاج وإينوكس"], ["Glass and stainless steel", "زجاج وإينوكس"], ["All glass", "زجاج بالكامل"]] },
  PLO: { lot: ["Sanitary ware", "التجهيزات الصحية"], gammes: [["Economy (shower cabin)", "اقتصادي (كابينة دوش)"], ["Standard (walk-in shower)", "عادي (دوش إيطالي)"], ["High-end (wall-hung WC)", "رفيع (مرحاض معلق)"], ["Luxury (concealed shower)", "فاخر (دوش مدمج)"], ["Luxury (concealed shower)", "فاخر (دوش مدمج)"]] },
  ELE: { lot: ["Electrics", "الكهرباء"], gammes: [["Standard", "عادي"], ["Standard", "عادي"], ["Designer fittings", "تجهيزات ديزاين"], ["Designer, more points", "ديزاين، نقاط أكثر"], ["Designer, luxury density", "ديزاين، كثافة فاخرة"]] },
  FAC: { lot: ["Facade", "الواجهة"], gammes: [["Render + vinyl", "تلبيس + فينيل"], ["Render + vinyl", "تلبيس + فينيل"], ["Siloxane + 10% stone", "سيلوكسان + 10% حجر"], ["Siloxane + 25% stone", "سيلوكسان + 25% حجر"], ["Siloxane + 50% stone", "سيلوكسان + 50% حجر"]] },
};

const UNITES: Table = {
  u: ["no.", "وحدة"], ml: ["lm", "م.ط"], "m²": ["m²", "م²"], "m³": ["m³", "م³"], m: ["m", "م"], kg: ["kg", "كغ"],
  ens: ["set", "مجموعة"], sem: ["wk", "أسبوع"], ff: ["LS", "جزافي"], kWc: ["kWp", "kWc"], sac: ["bag", "كيس"], j: ["d", "يوم"],
  semaines: ["weeks", "أسابيع"], "m³/niveau": ["m³/level", "م³/طابق"], "% / %": ["% / %", "% / %"], "u/m²": ["no./m²", "وحدة/م²"],
  "ml/m²": ["lm/m²", "م.ط/م²"], "m²/m²": ["m²/m²", "م²/م²"], "m³/m²": ["m³/m²", "م³/م²"], "m³/ml": ["m³/lm", "م³/م.ط"], "%": ["%", "%"],
};

/** Notes (justification) des hypothèses, par identifiant. */
const NOTES_HYP: Table = {
  "geo.coefPerimetre": ["1 × 1.5 rectangle (4.08) + setbacks ≈ 10%", "مستطيل 1 × 1,5 (4,08) + تراجعات ≈ 10%"],
  "geo.epaisseurPlancher": ["16+4 floor + screed + tiles", "سقف 16+4 + شاب + زليج"],
  "geo.ratioCloisons": ["≈ 0.3 lm of partition per m² × 2.9 m", "≈ 0,3 م.ط من الحواجز لكل م² × 2,9 م"],
  "geo.ratioSols": ["Walls and ducts take ≈ 12%", "الجدران والقنوات ≈ 12%"],
  "geo.plinthes": ["Rooms of 12 to 20 m²", "غرف من 12 إلى 20 م²"],
  "geo.faienceSdb": ["Full height, 4 sides of a 5 m² room minus the door (2026-10 review: 18 found too low)", "على كامل العلو، 4 جهات لغرفة 5 م² بدون الباب (مراجعة 2026-10: 18 قليلة)"],
  "geo.faienceCuisine": ["Splashback over 5 to 6 lm, h 1.4 m", "كريدونس على 5 إلى 6 م.ط، علو 1,4 م"],
  "str.poteaux": ["4-5 m grid, columns 25×25 to 30×30", "شبكة 4-5 م، أعمدة 25×25 إلى 30×30"],
  "str.poutres": ["4-5 m spans", "بحور 4-5 م"],
  "str.escalier": ["1.10 m stair, 15 cm waist, 17 steps", "درج 1,10 م، سمك 15 سم، 17 درجة"],
  "str.epDallePleineGenerale": ["2026-10 research: solid slab 15-20 cm 480-810 DH/m², +35 to 50% over hollow blocks (PL-003, PL-005)", "بحث 2026-10: دالة مصمتة 15-20 سم بـ 480-810 DH/م²، +35 إلى 50% على الهوردي (PL-003، PL-005)"],
  "fon.ratio.ROCHER": ["Bearing capacity ≥ 4 bar (soil survey to confirm)", "قدرة التحمل ≥ 4 بار (يتأكد بدراسة التربة)"],
  "fon.ratio.BON": ["Bearing capacity 2 to 3 bar", "قدرة التحمل 2 إلى 3 بار"],
  "fon.ratio.MOYEN": ["Bearing capacity 1.2 to 2 bar", "قدرة التحمل 1,2 إلى 2 بار"],
  "fon.radierEpaisseur": ["+ 5 cm per additional level", "+ 5 سم لكل طابق إضافي"],
  "fon.purge": ["To be set by the geotechnical survey", "تحددها الدراسة الجيوتقنية"],
  "fon.surlargeurFouilles": ["Working space and batter", "عرض العمل والميلان"],
  "ss.surlargeur": ["Working space + batter; replaced by shoring on the party-wall side", "عرض العمل + الميلان؛ يعوضه التدعيم من جهة الجار"],
  "ss.semelleVoile": ["0.60 × 0.35 m", "0,60 × 0,35 م"],
  "ss.reductionSemelles": ["2026-10 review: risk of double counting pad footings / strip footing under wall", "مراجعة 2026-10: خطر الحساب المزدوج للقواعد / القاعدة تحت الجدار"],
  "sout.coefLimite": ["gros-oeuvre-soutenement-cps.json SO-040", "gros-oeuvre-soutenement-cps.json SO-040"],
  "ca.largeur": ["Daylight and ventilation of the basement", "إنارة وتهوية الطابق تحت الأرضي"],
  "ss.semainesEpuisement": ["Duration of below-ground structural works", "مدة الأشغال الكبرى تحت الأرض"],
  "pente.zoneTerrassee": ["Building + access + flat garden", "البناية + المدخل + حديقة مستوية"],
  "so.pointsLumineux": ["≥ 1 point per room (NF C 15-100 as a benchmark)", "≥ نقطة لكل غرفة (NF C 15-100 كمرجع)"],
  "so.circuitsSpecialises": ["Hob, oven, hood, washing machine, dishwasher, dryer, water heater, outdoor", "طباخة، فرن، شفاط، آلة غسيل، غسالة الأواني، مجفف، سخان، خارجي"],
  "so.gardeCorpsEscalier": ["Handrail + stairwell railing", "درابزين الدرج + درابزين الفتحة"],
  "so.collecteurs": ["Soil stack + collector under the slab", "عمود الصرف + مجمع تحت البلاطة"],
  "so.grillesDefense": ["Common practice in economy and mid-range villas", "ممارسة شائعة فالفيلات الاقتصادية والمتوسطة"],
  "frais.installation": ["INS weight from costRangesMA (2%)", "وزن INS من costRangesMA (2%)"],
  "frais.aleas": ["Francobat, Archiplan: 5-15%; overruns observed 20-40% (LesMRE)", "Francobat، Archiplan: 5-15%؛ تجاوزات ملاحظة 20-40% (LesMRE)"],
};

const MATERIAUX: Table = {
  BPE_B25: ["Ready-mix concrete B25", "بيطون جاهز B25"],
  BPE_B30: ["Ready-mix concrete B30", "بيطون جاهز B30"],
  ACIER_HA: ["HA FeE500 rebar", "حديد التسليح HA FeE500"],
  CIMENT_CPJ45: ["CPJ 45 cement", "إسمنت CPJ 45"],
  AGGLO20: ["Hollow block 20×20×40", "بريك 20×20×40"],
  HOURDIS16: ["Concrete hollow block 16 cm", "هوردي 16 سم"],
  HOURDIS20: ["Concrete hollow block 20 cm", "هوردي 20 سم"],
};
const METIERS: Table = {
  manoeuvre: ["labourer", "عامل (مانوفر)"], macon: ["skilled mason", "بنّاء (معلم)"], ferrailleur: ["steel fixer", "حداد التسليح"],
  coffreur: ["formwork carpenter", "نجار القوالب (كوفرور)"], carreleur: ["tiler", "زلايجي"], peintre: ["painter", "صباغ"],
  platrier: ["plasterer", "جباس"], electricien: ["electrician", "كهربائي"], plombier: ["plumber", "بلومبي"],
  etancheur: ["waterproofer", "عامل العزل"], menuisier: ["joiner / metalworker", "نجار / حداد"], chef: ["foreman", "رئيس الفرقة"],
};

/** Fragments récurrents des formules de métré (remplacés du plus long au plus court). */
const FORMULES_CALC: [string, string, string][] = [
  ["quantité saisie sur plans", "quantity measured on drawings", "كمية مدخلة من التصاميم"],
  ["substitution compactée en tout-venant", "compacted replacement with crusher run", "تعويض مدكوك بالتوفنان"],
  ["semelles sur argile / remblai", "footings on clay / fill", "قواعد على طين / ردم"],
  ["volume des semelles ÷ hauteur + longrines", "footing volume ÷ depth + ground beams", "حجم القواعد ÷ العلو + الجسور الأرضية"],
  ["béton de fondation", "foundation concrete", "بيطون الأساسات"],
  ["fouilles en terrain rocheux", "excavation in rock", "حفر في أرض صخرية"],
  ["fond du sous-sol", "basement floor", "أرضية الطابق تحت الأرضي"],
  ["emprise du RDC", "ground-floor footprint", "مساحة الطابق الأرضي"],
  ["déblai du sous-sol en terrain rocheux", "basement excavation in rock", "حفر الطابق تحت الأرضي في أرض صخرية"],
  ["côté(s) mitoyen(s)", "party-wall side(s)", "جهة (جهات) مشتركة"],
  ["périmètre du sous-sol", "basement perimeter", "محيط الطابق تحت الأرضي"],
  ["parois enterrées", "buried walls", "الجدران المدفونة"],
  ["remblai contre les voiles (surlargeur)", "backfill against the walls (extra width)", "ردم مقابل الجدران (العرض الإضافي)"],
  ["parois + fond", "walls + floor", "الجدران + الأرضية"],
  ["durée du gros œuvre enterré", "duration of below-ground structural works", "مدة الأشغال الكبرى تحت الأرض"],
  ["sol du sous-sol (grès 45×45)", "basement floor (porcelain 45×45)", "أرضية الطابق تحت الأرضي (غري 45×45)"],
  ["sol du sous-sol", "basement floor", "أرضية الطابق تحت الأرضي"],
  ["face intérieure des voiles", "inner face of the walls", "الوجه الداخلي للجدران"],
  ["sous-face du plancher", "underside of the floor", "الوجه السفلي للسقف"],
  ["murs et plafond", "walls and ceiling", "الجدران والسقف"],
  ["remblai de la partie aval (déblai/remblai équilibrés)", "fill on the downhill side (balanced cut/fill)", "ردم الجهة السفلى (حفر وردم متوازنان)"],
  ["mur amont", "uphill wall", "الجدار العلوي"],
  ["murs latéraux", "side walls", "جدران جانبية"],
  ["drain en pied du talus amont", "drain at the foot of the uphill slope", "تصريف عند أسفل المنحدر العلوي"],
  ["plateforme", "platform", "المنصة"],
  ["dénivelé", "level difference", "فرق المستوى"],
  ["voile côté terre", "earth-side wall", "الجدار من جهة التربة"],
  ["dalle de fond", "base slab", "بلاطة القاع"],
  ["drain en pied", "toe drain", "تصريف في الأسفل"],
  ["face enterrée", "buried face", "الوجه المدفون"],
  ["évacuation des eaux (1 regard / 10 ml)", "water drainage (1 chamber / 10 lm)", "تصريف المياه (بالوعة لكل 10 م.ط)"],
  ["parement vu", "exposed face", "الوجه الظاهر"],
  ["garde-corps en tête", "railing on top", "درابزين في الأعلى"],
  ["(au-delà de 3 m : mur à contreforts, à dimensionner)", "(above 3 m: buttressed wall, to be designed)", "(فوق 3 م: جدار بدعامات، يحتاج حسابا)"],
  ["drain et massif drainant", "drain and gravel bed", "تصريف وحصى تصريف"],
  ["en gabions", "in gabions", "بالغابيون"],
  ["en moellons", "in rubble stone", "بالدبش"],
  ["remblai des fouilles en réemploi", "backfill of excavations with reused spoil", "ردم الحفر بإعادة استعمال الأتربة"],
  ["déblais", "spoil", "الأتربة"],
  ["réemploi", "reuse", "إعادة الاستعمال"],
  ["tous planchers en dalle pleine", "all floors in solid slab", "كل السقوف بالدالة المصمتة"],
  ["planchers", "floors", "السقوف"],
  ["volée(s)", "flight(s)", "مقطع (مقاطع) درج"],
  ["cage d'escalier / ascenseur", "stair / lift core", "قفص الدرج / المصعد"],
  ["périmètre de la toiture", "roof perimeter", "محيط السطح"],
  ["face intérieure de l'édicule", "inner face of the roof structure", "الوجه الداخلي لبيت السطح"],
  ["face extérieure de l'édicule", "outer face of the roof structure", "الوجه الخارجي لبيت السطح"],
  ["toiture de l'édicule", "roof of the roof structure", "سطح بيت السطح"],
  ["édicule", "roof structure", "بيت السطح"],
  ["périmètre × ", "perimeter × ", "المحيط × "],
  ["− porte", "− door", "− الباب"],
  ["périmètre", "perimeter", "المحيط"],
  ["− baies", "− openings", "− الفتحات"],
  ["2 faces des cloisons + face intérieure des murs", "both faces of partitions + inner face of walls", "وجها الحواجز + الوجه الداخلي للجدران"],
  ["plafonds sans faux plafond", "ceilings without suspended ceiling", "أسقف بدون سقف معلق"],
  ["sols intérieurs + terrasses carrelées", "interior floors + tiled terraces", "الأرضيات الداخلية + التراسات المزلجة"],
  ["toiture-terrasse", "flat roof", "السطح"],
  ["toiture + balcons en porte-à-faux (50 %)", "roof + cantilevered balconies (50%)", "السطح + البلكونات البارزة (50%)"],
  ["toiture non accessible", "non-accessible roof", "سطح غير قابل للولوج"],
  ["toiture (RTCM)", "roof (RTCM)", "السطح (RTCM)"],
  ["périmètre des acrotères", "parapet perimeter", "محيط الأكروتير"],
  ["salle(s) de bain", "bathroom(s)", "حمام (حمامات)"],
  ["murs extérieurs × façades libres", "external walls × free facades", "الجدران الخارجية × الواجهات الحرة"],
  ["+ acrotères", "+ parapets", "+ الأكروتير"],
  ["surface enduite", "rendered area", "المساحة الملبسة"],
  ["de la façade en pierre", "of the facade in stone", "من الواجهة بالحجر"],
  ["des baies en levant-coulissant", "of openings as lift-and-slide", "من الفتحات منزلقة رافعة"],
  ["des baies (RDC, sous-sol)", "of openings (ground floor, basement)", "من الفتحات (الأرضي، السفلي)"],
  ["des baies", "of openings", "من الفتحات"],
  ["porte(s) d'entrée", "entrance door(s)", "باب (أبواب) المدخل"],
  ["par logement : chambres + SdB + 2", "per dwelling: bedrooms + bathrooms + 2", "لكل مسكن: الغرف + الحمامات + 2"],
  ["chambres + SdB + niveaux + 2", "bedrooms + bathrooms + levels + 2", "الغرف + الحمامات + الطوابق + 2"],
  ["chambre(s)", "bedroom(s)", "غرفة (غرف)"],
  ["linéaire de cuisine saisi", "kitchen length entered", "طول المطبخ المدخل"],
  ["1 cuisine aménagée par logement (provision selon le standing)", "1 fitted kitchen per dwelling (allowance by standard)", "مطبخ مجهز لكل مسكن (مبلغ حسب المستوى)"],
  ["escaliers + balcons + toit accessible", "stairs + balconies + accessible roof", "الدروج + البلكونات + السطح المستعمل"],
  ["des plafonds", "of ceilings", "من الأسقف"],
  ["× surface de plancher", "× floor area", "× المساحة المغطاة"],
  ["balcons et terrasses (grès antidérapant)", "balconies and terraces (non-slip porcelain)", "البلكونات والتراسات (غري مانع للانزلاق)"],
  ["ml/m² de sol", "lm/m² of floor", "م.ط/م² من الأرضية"],
  ["cuisine(s)", "kitchen(s)", "مطبخ (مطابخ)"],
  ["WC invités au RDC", "guest WC on ground floor", "مرحاض الضيوف في الطابق الأرضي"],
  ["WC invités", "guest WC", "مرحاض الضيوف"],
  ["murs enduits − faïence + plafonds", "plastered walls − tiling + ceilings", "الجدران الملبسة − الفايونس + الأسقف"],
  ["3 par SdB + 2 par cuisine + 1 extérieur", "3 per bathroom + 2 per kitchen + 1 outdoor", "3 لكل حمام + 2 لكل مطبخ + 1 خارجي"],
  ["1 par cuisine", "1 per kitchen", "1 لكل مطبخ"],
  ["1 par logement", "1 per dwelling", "1 لكل مسكن"],
  ["descentes", "downpipes", "أنابيب نزول"],
  ["(SdB + cuisines + WC)", "(bathrooms + kitchens + WC)", "(الحمامات + المطابخ + المراحيض)"],
  ["1 pour 2 SdB", "1 per 2 bathrooms", "1 لكل حمامين"],
  ["1 chauffe-eau solaire 200 L pour 3 SdB", "1 solar water heater 200 L per 3 bathrooms", "سخان شمسي 200 لتر لكل 3 حمامات"],
  ["densité", "density", "الكثافة"],
  ["circuits dédiés (+ 1 par appareil de clim)", "dedicated circuits (+ 1 per AC unit)", "دارات مخصصة (+ 1 لكل مكيف)"],
  ["1 tableau par logement", "1 board per dwelling", "لوحة لكل مسكن"],
  ["1 tableau divisionnaire par niveau supplémentaire", "1 sub-board per additional level", "لوحة فرعية لكل طابق إضافي"],
  ["luminaire(s) de base", "basic light fitting(s)", "مصباح (مصابيح) أساسية"],
  ["points", "points", "نقاط"],
  ["façades, jardin, portail", "facades, garden, gate", "الواجهات، الحديقة، البوابة"],
  ["1 par bâtiment", "1 per building", "1 لكل بناية"],
  ["alarme et vidéosurveillance", "alarm and CCTV", "الإنذار والمراقبة"],
  ["domotique", "home automation", "المنزل الذكي"],
  ["(hall, paliers en marbre local)", "(lobby, landings in local marble)", "(البهو والبسطات برخام محلي)"],
  ["murs et plafonds des parties communes", "walls and ceilings of common areas", "جدران وأسقف الأجزاء المشتركة"],
  ["3 points par niveau", "3 points per level", "3 نقاط لكل طابق"],
  ["1 split 12 000 BTU par chambre", "1 split 12,000 BTU per bedroom", "سبليت 12 000 BTU لكل غرفة"],
  ["1 split 24 000 BTU par séjour", "1 split 24,000 BTU per living room", "سبليت 24 000 BTU لكل صالون"],
  ["1 gainable pour 60 m²", "1 ducted unit per 60 m²", "وحدة بالقنوات لكل 60 م²"],
  ["ascenseur 480 kg, 4 niveaux", "lift 480 kg, 4 levels", "مصعد 480 كغ، 4 طوابق"],
  ["niveaux au-delà de", "levels above", "طوابق فوق"],
  ["élévateur 2 niveaux", "home elevator, 2 levels", "مصعد منزلي، طابقان"],
  ["gaine et fosse", "shaft and pit", "البئر والحفرة"],
  ["puissance choisie", "chosen capacity", "القدرة المختارة"],
  ["√terrain", "√plot", "√الأرض"],
  ["regards de visite et de branchement", "inspection and connection chambers", "بالوعات التفتيش والربط"],
  ["linéaire saisi", "length entered", "الطول المدخل"],
  ["4 × √terrain × côtés non mitoyens − portail", "4 × √plot × non-party sides − gate", "4 × √الأرض × الجهات غير المشتركة − البوابة"],
  ["portail + portillon", "gate + pedestrian gate", "بوابة + باب صغير"],
  ["plan d'eau × 1,5 m + surlargeur", "water area × 1.5 m + extra width", "مساحة الماء × 1,5 م + عرض إضافي"],
  ["déblais foisonnés", "bulked spoil", "أتربة منتفشة"],
  ["surface du plan d'eau", "water area", "مساحة الماء"],
  ["filtration", "filtration", "التصفية"],
  ["surface du radier", "raft area", "مساحة اللبشة"],
  ["repris par le voile", "taken by the wall", "يحملها الجدار"],
  ["redans", "steps", "مدرجات"],
  ["purge", "removal", "إزالة"],
  ["emprise", "footprint", "مساحة البناء"],
  ["niv.", "lvl", "طابق"],
  [": fond ", ": base ", ": القاع "],
  [": semelle ", ": footing ", ": قاعدة "],
  ["1 point / 20 m²", "1 point / 20 m²", "نقطة لكل 20 م²"],
  ["1 prise / 25 m²", "1 socket / 25 m²", "مأخذ لكل 25 م²"],
  ["SdB", "bathrooms", "حمامات"],
  ["HSP/2,9", "ceiling height/2.9", "علو السقف/2,9"],
  [" ml", " lm", " م.ط"],
  ["niveaux", "levels", "طوابق"],
];
const FORMULES_TRIEES = [...FORMULES_CALC].sort((a, b) => b[0].length - a[0].length);

export type Libelles = ReturnType<typeof libelles>;

export function libelles(lang: Lang) {
  const nivNom = (n: number) => (n <= 1 ? (lang === "en" ? "G" : lang === "ar" ? "الأرضي" : "RDC") : lang === "en" ? `G+${n - 1}` : `R+${n - 1}`);
  const standing = (code: string, fr = code) => pick(lang, STANDINGS[code], fr);
  const formuleCalc = (fr: string): string => {
    if (lang === "fr" || !fr) return fr;
    let s = fr;
    // Libellés de soutènement injectés dans les formules (avant les fragments courts).
    for (const [code, tr] of Object.entries(SOUTENEMENTS)) {
      const frNom = SOUTENEMENTS_FR[code];
      if (frNom && s.includes(frNom)) s = s.split(frNom).join(lang === "en" ? tr[0] : tr[1]);
    }
    const i = lang === "en" ? 1 : 2;
    for (const f of FORMULES_TRIEES) if (s.includes(f[0])) s = s.split(f[0]).join(f[i]);
    return s;
  };
  const l = {
    lang,
    lot: (code: string, fr: string) => pick(lang, LOTS[code], fr),
    ouvrage: (code: string, fr: string) => pick(lang, OUVRAGES[code], fr),
    standing,
    regime: (code: string, fr: string) => pick(lang, REGIMES[code], fr),
    formule: (code: string, fr: string) => pick(lang, FORMULES[code]?.l, fr),
    formuleDesc: (code: string, fr: string) => pick(lang, FORMULES[code]?.d, fr),
    famille: (code: string, fr: string) => pick(lang, FAMILLES[code], fr),
    soutenement: (code: string, fr: string) => pick(lang, SOUTENEMENTS[code], fr),
    precision: (n: number, fr: string) => pick(lang, PRECISION[String(n)], fr),
    groupeHyp: (fr: string) => pick(lang, GROUPES_HYP[fr], fr),
    hypothese: (id: string, fr: string) => pick(lang, HYPOTHESES[id], fr),
    noteHyp: (id: string, fr: string) => (fr ? pick(lang, NOTES_HYP[id], fr) : ""),
    unite: (u: string) => pick(lang, UNITES[u], u),
    materiau: (id: string, fr: string) => pick(lang, MATERIAUX[id], fr),
    metier: (id: string, fr: string) => pick(lang, METIERS[id], fr),
    gammeLot: (lot: string, fr: string) => pick(lang, GAMMES[lot]?.lot, fr),
    gamme: (lot: string, i: number, fr: string) => pick(lang, GAMMES[lot]?.gammes[i], fr),
    niveau: nivNom,
    formuleCalc,
    /** Libellé d'un scénario de l'aide à la décision, par sa clé ("standing:STANDARD", "niveaux:-1"…). */
    scenario: (cle: string, fr: string, niveaux?: number): string => {
      if (lang === "fr") return fr;
      if (cle === "actuel") return lang === "en" ? "Your project" : "مشروعك";
      const [g, v] = cle.split(":");
      if (g === "standing") return standing(v, fr);
      if (g === "regime") return pick(lang, REGIMES_COURTS[v], fr);
      if (g === "conception") return pick(lang, FORMULES[v]?.l, fr);
      if (cle === "sousSol:sans") return lang === "en" ? "Without basement" : "بدون طابق تحت أرضي";
      if (cle === "sousSol:avec") return lang === "en" ? "With basement (3 m)" : "مع طابق تحت أرضي (3 م)";
      if (cle === "niveaux:-1" && niveaux) return lang === "en" ? `One level less (${nivNom(niveaux - 1)})` : `طابق أقل (${nivNom(niveaux - 1)})`;
      return fr;
    },
    /** Libellé d'un levier (le moteur ne donne pas de clé : correspondance sur le texte français). */
    levier: (fr: string): string => {
      if (lang === "fr") return fr;
      const en = lang === "en";
      const m = fr.match(/^Passer en (.+)$/);
      if (m) {
        const code = Object.keys(STANDINGS_FR).find((k) => STANDINGS_FR[k].toLowerCase() === m[1]);
        const nom = code ? standing(code, m[1]) : m[1];
        return en ? `Switch to ${nom.toLowerCase()}` : `الانتقال إلى ${nom}`;
      }
      if (fr.startsWith("Réaliser avec un tâcheron")) return en ? "Build with a labour-only contractor (tâcheron) (you buy the supplies)" : "البناء مع طاشرون / المعلم (أنت تشتري المواد)";
      if (fr === "Renoncer au sous-sol") return en ? "Drop the basement" : "التخلي عن الطابق تحت الأرضي";
      if (fr === "Choisir un plan type") return en ? "Choose a standard plan" : "اختيار تصميم نموذجي";
      if (fr === "Construire un niveau de moins") return en ? "Build one level less" : "بناء طابق أقل";
      return fr;
    },
  };
  return l;
}

/** Libellés français des standings et des soutènements (copie locale pour la correspondance texte → code). */
const STANDINGS_FR: Record<string, string> = { ULTRA_ECO: "Très économique", ECONOMIQUE: "Moyen standing", STANDARD: "Standing", STANDING: "Haut standing", PREMIUM: "Luxe" };
const SOUTENEMENTS_FR: Record<string, string> = {
  COUR_ANGLAISE: "Cour anglaise", JARDIN: "Mur de soutènement de jardin", TERRASSE: "Soutènement de terrasse extérieure", LIMITE: "Soutènement en limite de propriété",
};

/** Nombre de libellés métier traduits (pour le suivi). */
export const NB_LIBELLES = Object.keys(LOTS).length + Object.keys(OUVRAGES).length + Object.keys(STANDINGS).length + Object.keys(REGIMES).length * 2
  + Object.keys(FORMULES).length * 2 + Object.keys(FAMILLES).length + Object.keys(SOUTENEMENTS).length + Object.keys(PRECISION).length
  + Object.keys(GROUPES_HYP).length + Object.keys(HYPOTHESES).length + Object.keys(NOTES_HYP).length + Object.values(GAMMES).length * 6 + Object.keys(UNITES).length
  + Object.keys(MATERIAUX).length + Object.keys(METIERS).length + FORMULES_CALC.length;
