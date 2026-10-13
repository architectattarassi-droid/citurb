/**
 * Fiches société prédisposées par métier (Cercles). Un gabarit = les champs
 * pertinents pour un type de société, rangés en sections, plus les documents
 * attendus. Les valeurs sont stockées dans "Fournisseur"."fiche" (JSONB) ;
 * les documents dans "Fournisseur"."documents".
 *
 * Partagé par le front (formulaire, affichage) et les Pages Functions
 * (validation, score, vue publique). Sources des listes : registre P6
 * (apps/api/src/tomes/tome-7/p6/registry.ts : classes BTP du décret
 * 2-94-223, catégories d'agrément, documents requis).
 *
 * Score de complétude / confiance (inspiré du scoring L7), 0 à 100 :
 *   complétude 50 (champs du gabarit renseignés, pondérés)
 * + confiance 35 (documents obligatoires vérifiés 30, profil validé 5)
 * + activité 15 (offre approuvée 10, offre à jour < 120 jours 5).
 * Visible par l'admin ; le public ne voit que le badge « vérifié ».
 */
import type { L3 } from "./libelles";
import { LOTS_L3 } from "./libelles";

const l = (fr: string, ar: string, en: string): L3 => ({ fr, ar, en });

export type Section = "IDENTITE" | "CAPACITES" | "OFFRE" | "REFERENCES" | "PRATIQUE";
export const SECTIONS: Record<Section, L3> = {
  IDENTITE: l("Identité", "الهوية", "Identity"),
  CAPACITES: l("Capacités et garanties", "القدرات والضمانات", "Capabilities & insurance"),
  OFFRE: l("Offre", "العرض", "Offer"),
  REFERENCES: l("Références de chantiers", "مراجع الأوراش", "Project references"),
  PRATIQUE: l("Horaires, délais et conditions", "الأوقات والآجال والشروط", "Hours, lead times & terms"),
};

export type TypeChamp = "texte" | "nombre" | "choix" | "multi" | "liste" | "oui_non";
export interface ChampFiche {
  cle: string;
  section: Section;
  type: TypeChamp;
  libelle: L3;
  aide?: L3;
  options?: [string, L3][];
  /** Poids dans la complétude (défaut 1). */
  poids?: number;
  /** Jamais exposé au public (vue propriétaire et admin seulement). */
  prive?: boolean;
  max?: number;
}

// ───────────────────────── types de société ─────────────────────────

export type GroupeMetier = "MATERIAUX" | "TRAVAUX" | "ETUDES" | "SERVICES";
export interface TypeSociete {
  libelle: L3;
  groupe: GroupeMetier;
  /** Peut lister des produits (matériaux, équipements). */
  produits: boolean;
  /** Natures de services proposées par défaut. */
  natures: string[];
  champs: string[];
  documents: string[];
  documentsObligatoires: string[];
  /** Libellé du champ des zones (livraison ou intervention). */
  zones: "livraison" | "intervention";
}

const BASE = ["formeJuridique", "rc", "anneeCreation", "effectif", "horaires", "delaiDevisJours", "paiement", "langues", "references"];
const MAT = [...BASE, "marques", "surfaceDepot", "delaiLivraisonJours", "minimumCommandeDH", "livraisonConditions", "certifications", "garantie"];
const TRAV = [...BASE, "classeBTP", "agrements", "certifications", "decennale", "assureurDecennale", "rcPro", "parcMateriel", "corpsEtat", "delaiInterventionJours", "acomptePct", "garantie"];
const ETU = [...BASE, "agrements", "inscriptionOrdre", "missions", "rcPro", "logiciels", "delaiInterventionJours", "acomptePct"];
const DOCS_SOC = ["RC", "ICE", "PATENTE", "ATTESTATION_FISCALE"];

export const TYPES_SOCIETE: Record<string, TypeSociete> = {
  FOURNISSEUR_MATERIAUX: {
    libelle: l("Négociant / distributeur de matériaux", "تاجر / موزع مواد البناء", "Building materials merchant / distributor"),
    groupe: "MATERIAUX", produits: true, natures: ["TRANSPORT", "POSE"], zones: "livraison",
    champs: MAT, documents: [...DOCS_SOC, "FICHES_TECHNIQUES", "CERTIFICATION_QUALITE", "AUTRE"], documentsObligatoires: ["RC", "ICE"],
  },
  FABRICANT: {
    libelle: l("Fabricant", "مُصنِّع", "Manufacturer"),
    groupe: "MATERIAUX", produits: true, natures: ["TRANSPORT"], zones: "livraison",
    champs: [...MAT, "capaciteProduction", "usines"], documents: [...DOCS_SOC, "FICHES_TECHNIQUES", "CERTIFICATION_QUALITE", "AUTRE"],
    documentsObligatoires: ["RC", "ICE", "FICHES_TECHNIQUES"],
  },
  IMPORTATEUR: {
    libelle: l("Importateur", "مستورد", "Importer"),
    groupe: "MATERIAUX", produits: true, natures: ["TRANSPORT"], zones: "livraison",
    champs: [...MAT, "paysOrigine"], documents: [...DOCS_SOC, "FICHES_TECHNIQUES", "CERTIFICATION_QUALITE", "AUTRE"],
    documentsObligatoires: ["RC", "ICE", "FICHES_TECHNIQUES"],
  },
  ENTREPRISE_GENERALE: {
    libelle: l("Entreprise générale (tous corps d'état)", "مقاولة عامة (جميع الحرف)", "General contractor"),
    groupe: "TRAVAUX", produits: true, natures: ["FOURNI_POSE", "POSE"], zones: "intervention",
    champs: TRAV, documents: [...DOCS_SOC, "CNSS", "DECENNALE", "RC_PRO", "CERTIFICAT_QUALIFICATION", "AUTRE"],
    documentsObligatoires: ["RC", "ICE", "CNSS", "DECENNALE"],
  },
  ENTREPRISE_GO: {
    libelle: l("Entreprise de gros œuvre", "مقاولة الأشغال الكبرى", "Structural works contractor"),
    groupe: "TRAVAUX", produits: true, natures: ["FOURNI_POSE", "POSE"], zones: "intervention",
    champs: TRAV, documents: [...DOCS_SOC, "CNSS", "DECENNALE", "RC_PRO", "CERTIFICAT_QUALIFICATION", "AUTRE"],
    documentsObligatoires: ["RC", "ICE", "CNSS", "DECENNALE"],
  },
  ENTREPRISE_SECOND_OEUVRE: {
    libelle: l("Entreprise de second œuvre", "مقاولة أشغال التشطيب", "Finishing works contractor"),
    groupe: "TRAVAUX", produits: true, natures: ["FOURNI_POSE", "POSE"], zones: "intervention",
    champs: [...TRAV, "marques"], documents: [...DOCS_SOC, "CNSS", "DECENNALE", "RC_PRO", "CERTIFICAT_QUALIFICATION", "AUTRE"],
    documentsObligatoires: ["RC", "ICE", "CNSS"],
  },
  ARTISAN_QUALIFIE: {
    libelle: l("Artisan qualifié", "حرفي مؤهل (معلم)", "Skilled craftsman"),
    groupe: "TRAVAUX", produits: true, natures: ["POSE", "FOURNI_POSE"], zones: "intervention",
    champs: ["anneeCreation", "effectif", "corpsEtat", "rcPro", "parcMateriel", "horaires", "delaiDevisJours", "delaiInterventionJours", "acomptePct", "paiement", "langues", "garantie", "references"],
    documents: ["PATENTE", "ICE", "RC_PRO", "ATTESTATION_ARTISAN", "AUTRE"], documentsObligatoires: [],
  },
  BET_STRUCTURE: {
    libelle: l("Bureau d'études (structure)", "مكتب الدراسات التقنية (الهياكل)", "Structural engineering firm"),
    groupe: "ETUDES", produits: false, natures: ["ETUDE"], zones: "intervention",
    champs: ETU, documents: [...DOCS_SOC, "AGREMENT", "INSCRIPTION_ORDRE", "RC_PRO", "AUTRE"], documentsObligatoires: ["RC", "ICE", "RC_PRO"],
  },
  BET_FLUIDES: {
    libelle: l("Bureau d'études (fluides)", "مكتب الدراسات التقنية (الموائع)", "MEP engineering firm"),
    groupe: "ETUDES", produits: false, natures: ["ETUDE"], zones: "intervention",
    champs: ETU, documents: [...DOCS_SOC, "AGREMENT", "INSCRIPTION_ORDRE", "RC_PRO", "AUTRE"], documentsObligatoires: ["RC", "ICE", "RC_PRO"],
  },
  BET_VRD: {
    libelle: l("Bureau d'études (VRD)", "مكتب الدراسات التقنية (الطرق والشبكات)", "Civil works engineering firm"),
    groupe: "ETUDES", produits: false, natures: ["ETUDE"], zones: "intervention",
    champs: ETU, documents: [...DOCS_SOC, "AGREMENT", "INSCRIPTION_ORDRE", "RC_PRO", "AUTRE"], documentsObligatoires: ["RC", "ICE", "RC_PRO"],
  },
  LABORATOIRE: {
    libelle: l("Laboratoire d'essais", "مختبر التجارب والاختبارات", "Testing laboratory"),
    groupe: "ETUDES", produits: false, natures: ["ESSAI", "ETUDE"], zones: "intervention",
    champs: [...ETU, "essais", "certifications"], documents: [...DOCS_SOC, "AGREMENT", "CERTIFICATION_QUALITE", "RC_PRO", "AUTRE"],
    documentsObligatoires: ["RC", "ICE", "AGREMENT"],
  },
  TOPOGRAPHE: {
    libelle: l("Topographe", "طوبوغرافي", "Surveyor"),
    groupe: "ETUDES", produits: false, natures: ["TOPO"], zones: "intervention",
    champs: [...ETU, "equipementTopo"], documents: [...DOCS_SOC, "INSCRIPTION_ORDRE", "RC_PRO", "AUTRE"], documentsObligatoires: ["INSCRIPTION_ORDRE"],
  },
  GEOMETRE: {
    libelle: l("Géomètre-topographe", "مهندس مساح طوبوغرافي", "Chartered land surveyor"),
    groupe: "ETUDES", produits: false, natures: ["TOPO"], zones: "intervention",
    champs: [...ETU, "equipementTopo"], documents: [...DOCS_SOC, "INSCRIPTION_ORDRE", "RC_PRO", "AUTRE"], documentsObligatoires: ["INSCRIPTION_ORDRE"],
  },
  CONTROLE_TECHNIQUE: {
    libelle: l("Bureau de contrôle", "مكتب المراقبة التقنية", "Technical inspection body"),
    groupe: "ETUDES", produits: false, natures: ["CONTROLE"], zones: "intervention",
    champs: ETU, documents: [...DOCS_SOC, "AGREMENT", "RC_PRO", "AUTRE"], documentsObligatoires: ["RC", "ICE", "AGREMENT"],
  },
  LOUEUR_MATERIEL: {
    libelle: l("Loueur de matériel", "كراء المعدات والآليات", "Equipment rental"),
    groupe: "SERVICES", produits: false, natures: ["LOCATION", "TRANSPORT"], zones: "intervention",
    champs: [...BASE, "parcMateriel", "rcPro", "delaiInterventionJours", "acomptePct", "garantie"],
    documents: [...DOCS_SOC, "RC_PRO", "AUTRE"], documentsObligatoires: ["RC", "ICE"],
  },
  TRANSPORTEUR: {
    libelle: l("Transporteur / livraison", "النقل والتوصيل", "Haulage & delivery"),
    groupe: "SERVICES", produits: false, natures: ["TRANSPORT"], zones: "intervention",
    champs: [...BASE, "flotte", "capaciteTransportT", "rcPro", "delaiInterventionJours"],
    documents: [...DOCS_SOC, "RC_PRO", "AUTRE"], documentsObligatoires: ["RC", "ICE"],
  },
};
export const METIERS = Object.keys(TYPES_SOCIETE);
export const libelleMetier = (m: string): L3 => TYPES_SOCIETE[m]?.libelle || { fr: m, ar: m, en: m };

// ───────────────────────── champs ─────────────────────────

const o = (code: string, fr: string, ar: string, en: string): [string, L3] => [code, l(fr, ar, en)];

export const CLASSES_BTP: [string, L3][] = [1, 2, 3, 4, 5, 6, 7].map((n) => [String(n), l(`Classe ${n}`, `الصنف ${n}`, `Class ${n}`)]);

export const AGREMENTS: [string, L3][] = [
  o("A.1", "A.1 Bâtiment — gros œuvre", "A.1 البناء — الأشغال الكبرى", "A.1 Building — structural works"),
  o("A.2", "A.2 Bâtiment — second œuvre", "A.2 البناء — أشغال التشطيب", "A.2 Building — finishing works"),
  o("A.3", "A.3 Bâtiment tous corps d'état", "A.3 البناء — جميع الحرف", "A.3 Building — all trades"),
  o("B.1", "B.1 Routes", "B.1 الطرق", "B.1 Roads"),
  o("B.2", "B.2 Ouvrages d'art", "B.2 المنشآت الفنية", "B.2 Bridges & structures"),
  o("B.3", "B.3 Terrassement et VRD", "B.3 الحفر والطرق والشبكات", "B.3 Earthworks & utilities"),
  o("C.1", "C.1 Électricité", "C.1 الكهرباء", "C.1 Electrical"),
  o("C.2", "C.2 Plomberie sanitaire", "C.2 الترصيص الصحي", "C.2 Plumbing"),
  o("C.3", "C.3 CVC", "C.3 التكييف والتهوية", "C.3 HVAC"),
  o("C.4", "C.4 Étanchéité", "C.4 العزل المائي", "C.4 Waterproofing"),
  o("C.5", "C.5 Ascenseurs", "C.5 المصاعد", "C.5 Lifts"),
  o("C.6", "C.6 Sécurité incendie", "C.6 السلامة من الحرائق", "C.6 Fire safety"),
  o("C.7", "C.7 Photovoltaïque", "C.7 الطاقة الشمسية الكهروضوئية", "C.7 Photovoltaics"),
  o("D.1", "D.1 BET structure", "D.1 دراسات الهياكل", "D.1 Structural design"),
  o("D.2", "D.2 BET fluides", "D.2 دراسات الموائع", "D.2 MEP design"),
  o("D.3", "D.3 BET thermique (RTCM)", "D.3 الدراسات الحرارية", "D.3 Thermal design"),
  o("E.1", "E.1 Contrôle bâtiment", "E.1 مراقبة البنايات", "E.1 Building inspection"),
  o("L.1", "Laboratoire agréé (BTP)", "مختبر معتمد (البناء والأشغال العمومية)", "Approved laboratory (construction)"),
];

const CERTIFS: [string, L3][] = [
  o("ISO_9001", "ISO 9001 (qualité)", "ISO 9001 (الجودة)", "ISO 9001 (quality)"),
  o("ISO_14001", "ISO 14001 (environnement)", "ISO 14001 (البيئة)", "ISO 14001 (environment)"),
  o("ISO_45001", "ISO 45001 (santé-sécurité)", "ISO 45001 (الصحة والسلامة)", "ISO 45001 (health & safety)"),
  o("ISO_17025", "ISO 17025 (laboratoire)", "ISO 17025 (المختبرات)", "ISO 17025 (laboratory)"),
  o("MARQUE_NM", "Marque NM (IMANOR)", "علامة NM (إيمانور)", "NM mark (IMANOR)"),
  o("CE", "Marquage CE", "علامة CE", "CE marking"),
];

export const CHAMPS_FICHE: Record<string, ChampFiche> = Object.fromEntries(([
  { cle: "formeJuridique", section: "IDENTITE", type: "choix", libelle: l("Forme juridique", "الشكل القانوني", "Legal form"), options: [
    o("SARL", "SARL", "ش.م.م", "LLC (SARL)"), o("SARLAU", "SARL AU", "ش.م.م بشريك وحيد", "Single-member LLC"), o("SA", "SA", "شركة مساهمة", "PLC (SA)"),
    o("SNC", "SNC", "شركة التضامن", "General partnership"), o("AUTO_ENTREPRENEUR", "Auto-entrepreneur", "مقاول ذاتي", "Self-employed"),
    o("PERSONNE_PHYSIQUE", "Personne physique (patente)", "شخص ذاتي (ضريبة مهنية)", "Sole trader"), o("AUTRE", "Autre", "أخرى", "Other")] },
  { cle: "rc", section: "IDENTITE", type: "texte", libelle: l("N° de registre du commerce", "رقم السجل التجاري", "Trade register no."), prive: true, max: 30,
    aide: l("Facultatif, non publié", "اختياري، لا يُنشر", "Optional, not published") },
  { cle: "anneeCreation", section: "IDENTITE", type: "nombre", libelle: l("Année de création", "سنة التأسيس", "Year founded") },
  { cle: "effectif", section: "CAPACITES", type: "choix", libelle: l("Effectif", "عدد المستخدمين", "Headcount"), options: [
    o("1-5", "1 à 5", "من 1 إلى 5", "1–5"), o("6-20", "6 à 20", "من 6 إلى 20", "6–20"), o("21-50", "21 à 50", "من 21 إلى 50", "21–50"),
    o("51-200", "51 à 200", "من 51 إلى 200", "51–200"), o("200+", "Plus de 200", "أكثر من 200", "200+")] },
  { cle: "classeBTP", section: "CAPACITES", type: "choix", libelle: l("Classe de qualification BTP", "صنف التأهيل والتصنيف", "Contractor classification"), options: CLASSES_BTP, poids: 2,
    aide: l("Décret 2-94-223", "المرسوم 2-94-223", "Decree 2-94-223") },
  { cle: "agrements", section: "CAPACITES", type: "multi", libelle: l("Qualifications et agréments", "التأهيلات والاعتمادات", "Qualifications & approvals"), options: AGREMENTS, poids: 2 },
  { cle: "certifications", section: "CAPACITES", type: "multi", libelle: l("Certifications", "الشهادات", "Certifications"), options: CERTIFS },
  { cle: "decennale", section: "CAPACITES", type: "oui_non", libelle: l("Assurance décennale en cours", "تأمين عشري ساري المفعول", "Valid 10-year liability insurance"), poids: 2 },
  { cle: "assureurDecennale", section: "CAPACITES", type: "texte", libelle: l("Assureur (décennale)", "شركة التأمين (العشري)", "Insurer (10-year)"), max: 80 },
  { cle: "rcPro", section: "CAPACITES", type: "oui_non", libelle: l("Responsabilité civile professionnelle", "تأمين المسؤولية المدنية المهنية", "Professional liability insurance"), poids: 2 },
  { cle: "inscriptionOrdre", section: "CAPACITES", type: "texte", libelle: l("Inscription à l'Ordre (n°)", "التسجيل في الهيئة (رقم)", "Professional body registration no."), max: 60, poids: 2 },
  { cle: "missions", section: "CAPACITES", type: "multi", libelle: l("Missions", "المهام", "Assignments"), options: [
    o("CONCEPTION", "Conception", "التصميم", "Design"), o("EXECUTION", "Plans d'exécution", "تصاميم التنفيذ", "Construction drawings"),
    o("SUIVI", "Suivi de chantier", "تتبع الورش", "Site supervision"), o("VISA", "Visa / contrôle", "التأشير / المراقبة", "Approval / inspection"),
    o("DIAGNOSTIC", "Diagnostic", "التشخيص", "Survey / diagnosis"), o("EXPERTISE", "Expertise", "الخبرة", "Expert appraisal")] },
  { cle: "essais", section: "CAPACITES", type: "multi", libelle: l("Essais réalisés", "التجارب المنجزة", "Tests performed"), options: [
    o("BETON", "Béton (compression, affaissement)", "الخرسانة (الضغط، الهبوط)", "Concrete (compression, slump)"),
    o("SOLS", "Sols (Proctor, plaque, granulométrie)", "التربة (بروكتور، الصفيحة، التحليل الحبيبي)", "Soils (Proctor, plate, grading)"),
    o("GEOTECHNIQUE", "Étude géotechnique, sondages", "الدراسة الجيوتقنية والأسبار", "Geotechnical study, boreholes"),
    o("CAROTTAGE", "Carottage", "أخذ العينات الأسطوانية", "Core sampling"), o("ACIER", "Aciers (traction)", "الفولاذ (الشد)", "Steel (tensile)"),
    o("GRANULATS", "Granulats", "الحصى والرمال", "Aggregates")] },
  { cle: "logiciels", section: "CAPACITES", type: "liste", libelle: l("Logiciels", "البرامج المعلوماتية", "Software"), max: 10 },
  { cle: "equipementTopo", section: "CAPACITES", type: "liste", libelle: l("Équipement (station totale, GPS RTK, drone…)", "المعدات (محطة شاملة، GPS RTK، طائرة مسيرة…)", "Equipment (total station, RTK GPS, drone…)"), max: 10 },
  { cle: "parcMateriel", section: "CAPACITES", type: "liste", libelle: l("Parc de matériel", "المعدات المتوفرة", "Equipment fleet"), max: 20 },
  { cle: "flotte", section: "CAPACITES", type: "liste", libelle: l("Véhicules (camion 10 t, plateau grue…)", "المركبات (شاحنة 10 طن، شاحنة برافعة…)", "Vehicles (10 t truck, crane truck…)"), max: 20, poids: 2 },
  { cle: "capaciteTransportT", section: "CAPACITES", type: "nombre", libelle: l("Charge utile maximale (t)", "الحمولة القصوى (طن)", "Max payload (t)") },
  { cle: "capaciteProduction", section: "CAPACITES", type: "texte", libelle: l("Capacité de production", "الطاقة الإنتاجية", "Production capacity"), max: 120 },
  { cle: "usines", section: "CAPACITES", type: "liste", libelle: l("Sites de production (villes)", "مواقع الإنتاج (المدن)", "Production sites (cities)"), max: 10 },
  { cle: "paysOrigine", section: "OFFRE", type: "liste", libelle: l("Pays d'origine des produits", "بلدان منشأ المنتجات", "Countries of origin"), max: 10 },
  { cle: "surfaceDepot", section: "CAPACITES", type: "nombre", libelle: l("Surface du dépôt / showroom (m²)", "مساحة المستودع / المعرض (م²)", "Warehouse / showroom area (m²)") },
  { cle: "corpsEtat", section: "OFFRE", type: "multi", libelle: l("Corps d'état", "الحرف", "Trades"), options: Object.entries(LOTS_L3), poids: 2 },
  { cle: "marques", section: "OFFRE", type: "liste", libelle: l("Marques distribuées ou posées", "العلامات التجارية الموزعة أو المركبة", "Brands distributed or installed"), max: 30, poids: 2 },
  { cle: "references", section: "REFERENCES", type: "liste", libelle: l("Références de chantiers", "مراجع الأوراش", "Project references"), poids: 3 },
  { cle: "horaires", section: "PRATIQUE", type: "texte", libelle: l("Horaires", "أوقات العمل", "Opening hours"), max: 120,
    aide: l("Ex. lundi–samedi 8 h–18 h", "مثال: الإثنين–السبت 8–18", "E.g. Mon–Sat 8am–6pm") },
  { cle: "delaiDevisJours", section: "PRATIQUE", type: "nombre", libelle: l("Délai de réponse à un devis (jours)", "أجل الرد على طلب عرض الأسعار (أيام)", "Quote turnaround (days)") },
  { cle: "delaiLivraisonJours", section: "PRATIQUE", type: "nombre", libelle: l("Délai de livraison habituel (jours)", "أجل التسليم المعتاد (أيام)", "Usual delivery time (days)") },
  { cle: "delaiInterventionJours", section: "PRATIQUE", type: "nombre", libelle: l("Délai d'intervention (jours)", "أجل التدخل (أيام)", "Lead time to start (days)") },
  { cle: "minimumCommandeDH", section: "PRATIQUE", type: "nombre", libelle: l("Minimum de commande (DH HT)", "الحد الأدنى للطلب (درهم دون رسوم)", "Minimum order (MAD excl. VAT)") },
  { cle: "livraisonConditions", section: "PRATIQUE", type: "texte", libelle: l("Conditions de livraison", "شروط التسليم", "Delivery terms"), max: 300 },
  { cle: "paiement", section: "PRATIQUE", type: "multi", libelle: l("Moyens de paiement", "وسائل الأداء", "Payment methods"), options: [
    o("VIREMENT", "Virement", "تحويل بنكي", "Bank transfer"), o("CHEQUE", "Chèque", "شيك", "Cheque"), o("EFFET", "Effet / LCN", "كمبيالة", "Bill of exchange"),
    o("TPE", "Carte bancaire", "بطاقة بنكية", "Card"), o("ESPECES", "Espèces", "نقداً", "Cash"), o("A_TERME", "Paiement à terme", "أداء مؤجل", "Credit terms")] },
  { cle: "acomptePct", section: "PRATIQUE", type: "nombre", libelle: l("Acompte demandé (%)", "التسبيق المطلوب (%)", "Deposit required (%)") },
  { cle: "garantie", section: "PRATIQUE", type: "texte", libelle: l("Garantie et service après-vente", "الضمان وخدمة ما بعد البيع", "Warranty & after-sales"), max: 300 },
  { cle: "langues", section: "PRATIQUE", type: "multi", libelle: l("Langues parlées", "اللغات المتحدث بها", "Languages spoken"), options: [
    o("ar", "Arabe / darija", "العربية / الدارجة", "Arabic / Darija"), o("fr", "Français", "الفرنسية", "French"), o("amz", "Amazigh", "الأمازيغية", "Amazigh"),
    o("en", "Anglais", "الإنجليزية", "English"), o("es", "Espagnol", "الإسبانية", "Spanish")] },
] as ChampFiche[]).map((c) => [c.cle, c]));

/** Champs d'un type de société, dans l'ordre des sections. */
export function champsDuType(metier: string): ChampFiche[] {
  const t = TYPES_SOCIETE[metier];
  if (!t) return [];
  const ordre: Section[] = ["IDENTITE", "CAPACITES", "OFFRE", "REFERENCES", "PRATIQUE"];
  const cs = t.champs.map((c) => CHAMPS_FICHE[c]).filter(Boolean);
  return ordre.flatMap((s) => cs.filter((c) => c.section === s));
}

// ───────────────────────── références ─────────────────────────

export interface ReferenceChantier { titre: string; ville: string; annee: number | null; client: string | null; description: string | null; photos: string[] }
export const REFERENCES_MAX = 12;
export const PHOTOS_PAR_REFERENCE = 6;

// ───────────────────────── documents ─────────────────────────

export const DOCUMENTS: Record<string, L3> = {
  RC: l("Registre du commerce (modèle J)", "شهادة السجل التجاري (نموذج ج)", "Trade register extract"),
  ICE: l("Attestation ICE", "شهادة التعريف الموحد للمقاولة", "ICE certificate"),
  PATENTE: l("Taxe professionnelle (patente)", "الضريبة المهنية (الباتانت)", "Business tax certificate"),
  ATTESTATION_FISCALE: l("Attestation de régularité fiscale", "شهادة الوضعية الجبائية", "Tax compliance certificate"),
  CNSS: l("Attestation CNSS", "شهادة الضمان الاجتماعي", "Social security certificate"),
  DECENNALE: l("Attestation d'assurance décennale", "شهادة التأمين العشري", "10-year liability insurance certificate"),
  RC_PRO: l("Attestation de RC professionnelle", "شهادة تأمين المسؤولية المدنية المهنية", "Professional liability certificate"),
  CERTIFICAT_QUALIFICATION: l("Certificat de qualification et classification", "شهادة التأهيل والتصنيف", "Qualification & classification certificate"),
  AGREMENT: l("Agrément (ministère)", "الاعتماد (الوزارة)", "Ministry approval"),
  INSCRIPTION_ORDRE: l("Attestation d'inscription à l'Ordre", "شهادة التسجيل في الهيئة", "Professional body registration"),
  CERTIFICATION_QUALITE: l("Certificat ISO / marque NM", "شهادة ISO / علامة NM", "ISO / NM certificate"),
  FICHES_TECHNIQUES: l("Fiches techniques des produits", "البطاقات التقنية للمنتجات", "Product data sheets"),
  ATTESTATION_ARTISAN: l("Carte ou attestation d'artisan", "بطاقة أو شهادة الحرفي", "Craftsman card"),
  AUTRE: l("Autre document", "وثيقة أخرى", "Other document"),
};
export const STATUTS_DOCUMENT = ["DEPOSE", "VERIFIE", "REFUSE"] as const;
export type StatutDocument = (typeof STATUTS_DOCUMENT)[number];
export interface DocumentPro { id: string; type: string; url: string | null; note: string | null; expireLe: string | null; statut: StatutDocument; deposeLe: string; verifieLe: string | null; verifiePar: string | null; motif: string | null }

// ───────────────────────── score ─────────────────────────

export interface Score { total: number; completude: number; confiance: number; activite: number; manquants: string[]; documentsManquants: string[] }

const rempli = (v: unknown): boolean =>
  v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length) && !(typeof v === "number" && !Number.isFinite(v));

/**
 * Score 0-100 d'un profil. `profil` : colonnes du Fournisseur (description,
 * logoUrl, zonesLivraison, categories…), `fiche` : JSON du gabarit,
 * `activite` : nombre d'offres approuvées et date de la plus récente.
 */
export function scoreProfil(
  profil: { metier: string; statut: string; description?: string | null; descriptionAr?: string | null; logoUrl?: string | null; zonesLivraison?: string[]; categories?: string[]; fiche?: Record<string, unknown>; documents?: DocumentPro[] },
  activite: { offresApprouvees: number; plusRecente: string | null },
  maintenant = Date.now(),
): Score {
  const t = TYPES_SOCIETE[profil.metier];
  const fiche = profil.fiche || {};
  const manquants: string[] = [];
  let pts = 0, max = 0;
  const compter = (cle: string, ok: boolean, poids = 1) => { max += poids; if (ok) pts += poids; else manquants.push(cle); };
  compter("description", rempli(profil.description) || rempli(profil.descriptionAr), 2);
  compter("logoUrl", rempli(profil.logoUrl));
  compter("zonesLivraison", rempli(profil.zonesLivraison));
  if (t?.groupe === "MATERIAUX" || t?.groupe === "TRAVAUX") compter("categories", rempli(profil.categories));
  for (const c of t ? champsDuType(profil.metier) : []) {
    if (c.cle === "assureurDecennale" && fiche.decennale !== true) continue;
    // Une case « non » est une réponse : seul l'absence de réponse compte comme manquante.
    compter(c.cle, c.type === "oui_non" ? typeof fiche[c.cle] === "boolean" : rempli(fiche[c.cle]), c.poids ?? 1);
  }
  const completude = max ? Math.round((50 * pts) / max) : 0;

  const docs = profil.documents || [];
  const obligatoires = t?.documentsObligatoires || [];
  const valide = (d: DocumentPro) => d.statut === "VERIFIE" && (!d.expireLe || Date.parse(d.expireLe) >= maintenant);
  const documentsManquants = obligatoires.filter((ty) => !docs.some((d) => d.type === ty && valide(d)));
  const partDocs = obligatoires.length ? (obligatoires.length - documentsManquants.length) / obligatoires.length : docs.some(valide) ? 1 : 0.5;
  const confiance = Math.round(30 * partDocs) + (profil.statut === "APPROVED" ? 5 : 0);

  const recent = activite.plusRecente ? maintenant - Date.parse(activite.plusRecente) < 120 * 86400_000 : false;
  const act = (activite.offresApprouvees > 0 ? 10 : 0) + (activite.offresApprouvees > 0 && recent ? 5 : 0);
  return { total: Math.min(100, completude + confiance + act), completude, confiance, activite: act, manquants, documentsManquants };
}

/** Badge « documents vérifiés » : tous les documents obligatoires du type vérifiés et non expirés. */
export function documentsVerifies(metier: string, docs: DocumentPro[], maintenant = Date.now()): boolean {
  const ob = TYPES_SOCIETE[metier]?.documentsObligatoires || [];
  if (!ob.length) return docs.some((d) => d.statut === "VERIFIE");
  return ob.every((ty) => docs.some((d) => d.type === ty && d.statut === "VERIFIE" && (!d.expireLe || Date.parse(d.expireLe) >= maintenant)));
}
