/**
 * i18n.tsx — Système de traduction global CITURBAREA
 *
 * Utilisation simple:
 *
 *   // 1. Wrapper l'app dans <I18nProvider>
 *   import { I18nProvider } from "./i18n/i18n";
 *   <I18nProvider><App /></I18nProvider>
 *
 *   // 2. Dans un composant, utiliser le hook useT()
 *   import { useT, useLang } from "./i18n/i18n";
 *   function MyComponent() {
 *     const t = useT();
 *     const { lang, setLang } = useLang();
 *     return <button>{t("login")}</button>;
 *   }
 *
 *   // 3. Pour les chaînes interpolées:
 *   t("greet", { name: "Yassine" })  // → "Bonjour Yassine"
 *
 * Ajout de nouvelles traductions: voir DICT ci-dessous, ajouter la clé
 * dans les 3 langues. Si une langue n'a pas la traduction, fallback FR.
 *
 * Persistance: la langue choisie est stockée dans localStorage
 * sous "citurbarea.lang" et restaurée au reload.
 *
 * RTL: l'arabe applique automatiquement `document.documentElement.dir = "rtl"`.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "fr" | "ar" | "en";

const LS_KEY = "citurbarea.lang";

const detectInitialLang = (): Lang => {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved === "fr" || saved === "ar" || saved === "en") return saved;
  } catch { /* ignore */ }
  // Détection navigateur
  if (typeof navigator !== "undefined") {
    const lang = (navigator.language || "fr").slice(0, 2).toLowerCase();
    if (lang === "ar") return "ar";
    if (lang === "en") return "en";
  }
  return "fr";
};

/**
 * Lecture stand-alone (hors composant React) — utile pour les soumissions
 * d'intake afin que l'API persiste la langue dans Dossier.payload.lang
 * et envoie les emails transactionnels dans la bonne langue.
 */
export const getStoredLang = (): Lang => detectInitialLang();

// ─────────────────────────────────────────────────────────────────
// DICTIONNAIRE — ajoute des clés ici, dans les 3 langues
// ─────────────────────────────────────────────────────────────────
const DICT: Record<string, Record<Lang, string>> = {
  // Header / Nav
  "nav.home":          { fr: "Accueil",         ar: "الرئيسية",      en: "Home" },
  "nav.login":         { fr: "Connexion",       ar: "تسجيل الدخول",   en: "Sign in" },
  "nav.signup":        { fr: "Créer un compte", ar: "إنشاء حساب",    en: "Sign up" },
  "nav.my_space":      { fr: "Mon espace",      ar: "فضائي",         en: "My space" },
  "nav.my_dossiers":   { fr: "Mes dossiers",    ar: "ملفاتي",         en: "My files" },
  "nav.logout":        { fr: "Déconnexion",     ar: "تسجيل الخروج",   en: "Logout" },
  "nav.media":         { fr: "Médias",          ar: "الإعلام",       en: "Media" },
  "nav.dashboard":     { fr: "Tableau de bord", ar: "لوحة التحكم",   en: "Dashboard" },

  // Common labels
  "common.connected":     { fr: "Connecté",       ar: "متصل",          en: "Connected" },
  "common.not_connected": { fr: "Non connecté",   ar: "غير متصل",       en: "Not connected" },
  "common.loading":       { fr: "Chargement…",    ar: "جارٍ التحميل…",  en: "Loading…" },
  "common.save":          { fr: "Enregistrer",    ar: "حفظ",           en: "Save" },
  "common.cancel":        { fr: "Annuler",        ar: "إلغاء",         en: "Cancel" },
  "common.confirm":       { fr: "Confirmer",      ar: "تأكيد",         en: "Confirm" },
  "common.back":          { fr: "Retour",         ar: "رجوع",          en: "Back" },
  "common.next":          { fr: "Suivant",        ar: "التالي",        en: "Next" },
  "common.search":        { fr: "Rechercher",     ar: "بحث",           en: "Search" },
  "common.error":         { fr: "Erreur",         ar: "خطأ",           en: "Error" },
  "common.success":       { fr: "Succès",         ar: "نجاح",          en: "Success" },

  // Portes (cards landing + nav)
  "porte.p1.title":  { fr: "Projet personnel / familial",       ar: "مشروع شخصي / عائلي",       en: "Personal / family project" },
  "porte.p2.title":  { fr: "Projet immobilier & équipements",   ar: "مشروع عقاري ومعدات",      en: "Real estate & facilities" },
  "porte.p3.title":  { fr: "Réalisation clé en main",           ar: "تنفيذ تسليم المفتاح",     en: "Turnkey delivery" },
  "porte.p4.title":  { fr: "Investisseur & foncier",            ar: "المستثمر والعقار",         en: "Investor & land" },
  "porte.p5.title":  { fr: "Rapports & expertises",             ar: "تقارير وخبرات",           en: "Reports & expertise" },
  "porte.p6.title":  { fr: "Entreprises partenaires",           ar: "شركات شريكة",             en: "Partner companies" },

  // Wizards / forms communes
  "form.firstname":     { fr: "Prénom",          ar: "الاسم",        en: "First name" },
  "form.lastname":      { fr: "Nom",             ar: "اللقب",        en: "Last name" },
  "form.full_name":     { fr: "Nom complet",     ar: "الاسم الكامل",  en: "Full name" },
  "form.phone":         { fr: "Téléphone",       ar: "الهاتف",       en: "Phone" },
  "form.email":         { fr: "Email",           ar: "البريد الإلكتروني", en: "Email" },
  "form.address":       { fr: "Adresse",         ar: "العنوان",      en: "Address" },
  "form.commune":       { fr: "Commune",         ar: "البلدية",      en: "Commune" },
  "form.required":      { fr: "Obligatoire",     ar: "إلزامي",       en: "Required" },

  // Pricing / Payment
  "pay.now":            { fr: "Payer maintenant",  ar: "ادفع الآن",          en: "Pay now" },
  "pay.amount":         { fr: "Montant",            ar: "المبلغ",            en: "Amount" },
  "pay.received":       { fr: "Paiement reçu",      ar: "تم استلام الدفع",   en: "Payment received" },
  "pay.processing":     { fr: "En attente de validation administrative", ar: "في انتظار التحقق الإداري", en: "Awaiting admin validation" },

  // Lang switcher labels (pour accessibilité)
  "lang.fr":            { fr: "Français",        ar: "الفرنسية",     en: "French" },
  "lang.ar":            { fr: "Arabe",           ar: "العربية",      en: "Arabic" },
  "lang.en":            { fr: "Anglais",         ar: "الإنجليزية",   en: "English" },

  // ─── Wizards portes ─────────────────────────────────────────────────
  "wizard.step":             { fr: "Étape",                  ar: "الخطوة",                en: "Step" },
  "wizard.choose_section":   { fr: "Quel type de projet ?",  ar: "ما نوع المشروع؟",        en: "What kind of project?" },
  "wizard.choose_category":  { fr: "Catégorie de projet",    ar: "فئة المشروع",           en: "Project category" },
  "wizard.dimensions":       { fr: "Dimensions du projet",   ar: "أبعاد المشروع",         en: "Project dimensions" },
  "wizard.surface_plancher": { fr: "Surface plancher (m²)",  ar: "المساحة الأرضية (م²)",   en: "Floor area (m²)" },
  "wizard.surface_terrain":  { fr: "Surface terrain (m²)",   ar: "مساحة الأرض (م²)",       en: "Land area (m²)" },
  "wizard.nb_batiments":     { fr: "Nombre de bâtiments",    ar: "عدد المباني",           en: "Number of buildings" },
  "wizard.follow_mode":      { fr: "Mode de suivi du chantier", ar: "وضع متابعة الورش",   en: "Site monitoring mode" },
  "wizard.follow_onsite":    { fr: "Suivi physique",         ar: "متابعة ميدانية",         en: "On-site monitoring" },
  "wizard.follow_photos":    { fr: "Suivi par photos",       ar: "متابعة بالصور",         en: "Photo monitoring" },
  "wizard.compute_quote":    { fr: "Calculer le devis",      ar: "احتساب العرض",          en: "Compute quote" },
  "wizard.quote_details":    { fr: "Devis détaillé",         ar: "تفاصيل العرض",          en: "Quote details" },
  "wizard.continue_id":      { fr: "Continuer : identité",   ar: "متابعة: الهوية",         en: "Continue: identity" },
  "wizard.client_id":        { fr: "Identification client",  ar: "تحديد هوية العميل",      en: "Client identification" },
  "wizard.submit":           { fr: "Soumettre la demande",   ar: "إرسال الطلب",           en: "Submit request" },
  "wizard.submitting":       { fr: "Envoi en cours…",        ar: "جارٍ الإرسال…",         en: "Submitting…" },
  "wizard.success":          { fr: "Demande enregistrée",    ar: "تم تسجيل الطلب",         en: "Request received" },
  "wizard.success_msg":      { fr: "Notre équipe vous recontacte sous 24h.", ar: "سيعود إليك فريقنا خلال 24 ساعة.", en: "Our team will get back to you within 24h." },
  "wizard.modify":            { fr: "Modifier",              ar: "تعديل",                 en: "Modify" },
  "wizard.return_home":      { fr: "Retour à l'accueil",     ar: "العودة إلى الرئيسية",    en: "Back to home" },

  // ─── Form fields ────────────────────────────────────────────────────
  "form.raison_sociale":  { fr: "Raison sociale",        ar: "اسم الشركة",            en: "Company name" },
  "form.representant":    { fr: "Représentant légal",    ar: "الممثل القانوني",        en: "Legal representative" },
  "form.rc":              { fr: "Registre de commerce",  ar: "السجل التجاري",         en: "Commercial register" },
  "form.ice":             { fr: "ICE",                   ar: "ICE",                  en: "Tax ID (ICE)" },
  "form.cin":             { fr: "CIN",                   ar: "بطاقة التعريف الوطنية",  en: "National ID" },
  "form.titre_foncier":   { fr: "Titre foncier",         ar: "الرسم العقاري",         en: "Land title" },
  "form.surface_terrain": { fr: "Surface terrain (m²)",  ar: "مساحة الأرض (م²)",       en: "Land area (m²)" },
  "form.budget":          { fr: "Budget estimé",         ar: "الميزانية المقدرة",      en: "Estimated budget" },
  "form.optional":        { fr: "(optionnel)",           ar: "(اختياري)",             en: "(optional)" },

  // ─── P2 sections ────────────────────────────────────────────────────
  "p2.section.imm":       { fr: "Immeuble",              ar: "عمارة",                en: "Building" },
  "p2.section.gr":        { fr: "Groupement résidentiel", ar: "تجمع سكني",           en: "Residential complex" },
  "p2.section.lot":       { fr: "Lotissement",           ar: "تجزئة",                en: "Subdivision" },
  "p2.section.epig":      { fr: "Équipement privé",      ar: "منشأة خاصة",           en: "Private facility" },
  "p2.section.amg":       { fr: "Aménagement",           ar: "تهيئة",                en: "Fit-out" },

  // ─── P3 MOD ─────────────────────────────────────────────────────────
  "p3.title":             { fr: "Maîtrise d'Ouvrage Déléguée", ar: "إدارة التفويض",      en: "Delegated Project Management" },
  "p3.tagline":           { fr: "Pilotage chantier complet",   ar: "إشراف ورش متكامل", en: "Complete site management" },
  "p3.corps_metiers":     { fr: "Corps de métiers à coordonner", ar: "الحرف اللازم تنسيقها", en: "Trades to coordinate" },
  "p3.escrow_notice":     { fr: "Paiements via escrow plateforme", ar: "المدفوعات عبر منصة الضمان", en: "Payments via platform escrow" },

  // ─── P4 Foncier ─────────────────────────────────────────────────────
  "p4.title":             { fr: "Analyse foncière",       ar: "تحليل عقاري",          en: "Land analysis" },
  "p4.pack_basique":      { fr: "Pack BASIQUE",           ar: "باقة أساسية",          en: "BASIC pack" },
  "p4.pack_moyen":        { fr: "Pack MOYEN",             ar: "باقة متوسطة",          en: "MEDIUM pack" },
  "p4.pack_rentabilite":  { fr: "Pack RENTABILITÉ",       ar: "باقة المردودية",        en: "PROFITABILITY pack" },
  "p4.watermark_notice":  { fr: "Rapport watermarqué — utilisable sur autorisation écrite", ar: "تقرير بعلامة مائية — استخدام بإذن مكتوب", en: "Watermarked report — use under written authorization" },

  // ─── P5 Rapports ────────────────────────────────────────────────────
  "p5.title":             { fr: "Rapports & expertises",  ar: "تقارير وخبرات",         en: "Reports & expertise" },
  "p5.report.estimation": { fr: "Estimation valeur vénale", ar: "تقدير القيمة السوقية",  en: "Market valuation" },
  "p5.report.conformite": { fr: "Conformité urbanistique", ar: "الامتثال العمراني",     en: "Urban compliance" },
  "p5.report.risque":     { fr: "Audit de risque",        ar: "تدقيق المخاطر",         en: "Risk audit" },
  "p5.report.expertise":  { fr: "Expertise technique",    ar: "خبرة تقنية",            en: "Technical expertise" },

  // ─── P6 Prestataires ────────────────────────────────────────────────
  "p6.title":             { fr: "Réseau prestataires & fournisseurs", ar: "شبكة مزودي الخدمات والموردين", en: "Service providers & suppliers network" },
  "p6.score":             { fr: "Score CITURBAREA L7",    ar: "نقاط CITURBAREA L7",    en: "CITURBAREA L7 score" },
  "p6.tier_gold":         { fr: "Tier OR",                ar: "المستوى الذهبي",        en: "GOLD tier" },
  "p6.tier_silver":       { fr: "Tier ARGENT",            ar: "المستوى الفضي",         en: "SILVER tier" },
  "p6.tier_bronze":       { fr: "Tier BRONZE",            ar: "المستوى البرونزي",      en: "BRONZE tier" },

  // ─── Login / Signup ─────────────────────────────────────────────────
  "auth.title_login":     { fr: "Connexion à votre compte", ar: "تسجيل الدخول إلى حسابك", en: "Sign in to your account" },
  "auth.title_signup":    { fr: "Créer un compte",        ar: "إنشاء حساب",            en: "Create an account" },
  "auth.password":        { fr: "Mot de passe",           ar: "كلمة المرور",           en: "Password" },
  "auth.forgot":          { fr: "Mot de passe oublié ?",  ar: "نسيت كلمة المرور؟",     en: "Forgot password?" },
  "auth.no_account":      { fr: "Pas de compte ?",        ar: "ليس لديك حساب؟",        en: "No account?" },
  "auth.have_account":    { fr: "Déjà un compte ?",       ar: "لديك حساب بالفعل؟",     en: "Already have an account?" },

  // ─── Documentation page ─────────────────────────────────────────────
  "docs.title":           { fr: "Documentation CITURBAREA", ar: "وثائق CITURBAREA",   en: "CITURBAREA Documentation" },
  "docs.intro":           { fr: "Guide d'utilisation et architecture de la plateforme.", ar: "دليل الاستخدام وهيكل المنصة.", en: "User guide and platform architecture." },
  "docs.section_overview": { fr: "Vue d'ensemble",        ar: "نظرة عامة",             en: "Overview" },
  "docs.section_portes":   { fr: "Les 6 portes",          ar: "البوابات الستة",         en: "The 6 portes" },
  "docs.section_workflow": { fr: "Workflow client",       ar: "سير عمل العميل",         en: "Client workflow" },
  "docs.section_admin":    { fr: "Backoffice admin",      ar: "الإدارة الخلفية",        en: "Admin backoffice" },
  "docs.section_support":  { fr: "Support",               ar: "الدعم",                en: "Support" },

  // ─── Calendrier projet (Gantt + CPM) ────────────────────────────────
  "cal.title":               { fr: "Calendrier projet",         ar: "تقويم المشروع",         en: "Project calendar" },
  "cal.view.gantt":          { fr: "Gantt",                     ar: "غانت",                  en: "Gantt" },
  "cal.view.kanban":         { fr: "Kanban",                    ar: "كانبان",                en: "Kanban" },
  "cal.view.calendar":       { fr: "Calendrier",                ar: "تقويم",                 en: "Calendar" },
  "cal.view.list":           { fr: "Liste",                     ar: "قائمة",                 en: "List" },
  "cal.task.new":            { fr: "Nouvelle tâche",            ar: "مهمة جديدة",            en: "New task" },
  "cal.task.title":          { fr: "Titre de la tâche",         ar: "عنوان المهمة",          en: "Task title" },
  "cal.task.duration_days":  { fr: "Durée (jours)",             ar: "المدة (أيام)",          en: "Duration (days)" },
  "cal.task.predecessors":   { fr: "Prédécesseurs",             ar: "السوابق",               en: "Predecessors" },
  "cal.task.assigned":       { fr: "Assignés",                  ar: "المعينون",              en: "Assigned to" },
  "cal.task.status":         { fr: "Statut",                    ar: "الحالة",                en: "Status" },
  "cal.status.pending":      { fr: "À faire",                   ar: "قيد الانتظار",          en: "To do" },
  "cal.status.in_progress":  { fr: "En cours",                  ar: "قيد التنفيذ",           en: "In progress" },
  "cal.status.completed":    { fr: "Terminé",                   ar: "مكتمل",                 en: "Completed" },
  "cal.status.blocked":      { fr: "Bloqué",                    ar: "محظور",                 en: "Blocked" },
  "cal.critical_path":       { fr: "Chemin critique",           ar: "المسار الحرج",          en: "Critical path" },
  "cal.milestone":           { fr: "Jalon",                     ar: "مرحلة فاصلة",           en: "Milestone" },
  "cal.phase.esq":           { fr: "Esquisse",                  ar: "تصور أولي",             en: "Sketch" },
  "cal.phase.aps":           { fr: "APS",                       ar: "دراسة أولية",           en: "Preliminary design" },
  "cal.phase.apd":           { fr: "APD",                       ar: "دراسة تفصيلية",         en: "Detailed design" },
  "cal.phase.dce":           { fr: "DCE",                       ar: "ملف استشارة المقاولات", en: "Tender documents" },
  "cal.phase.marche":        { fr: "Marché",                    ar: "العقد",                 en: "Contract award" },
  "cal.phase.exec":          { fr: "Exécution",                 ar: "التنفيذ",               en: "Execution" },
  "cal.phase.reception":     { fr: "Réception",                 ar: "التسلم",                en: "Handover" },

  // ─── PV Chantier ────────────────────────────────────────────────────
  "pv.chantier.title":       { fr: "PV de chantier",            ar: "محضر الورش",            en: "Site report" },
  "pv.chantier.new":         { fr: "Nouveau PV",                ar: "محضر جديد",             en: "New report" },
  "pv.type.initiale":        { fr: "Visite initiale",           ar: "زيارة أولية",           en: "Initial visit" },
  "pv.type.avancement":      { fr: "Visite d'avancement",       ar: "زيارة متابعة",          en: "Progress visit" },
  "pv.type.reception_prov":  { fr: "Réception provisoire",      ar: "تسلم مؤقت",             en: "Provisional handover" },
  "pv.type.reception_def":   { fr: "Réception définitive",      ar: "تسلم نهائي",            en: "Final handover" },
  "pv.type.leve_reserves":   { fr: "Levée de réserves",         ar: "رفع التحفظات",          en: "Reserves lifting" },
  "pv.weather":              { fr: "Météo",                     ar: "الطقس",                 en: "Weather" },
  "pv.presents":             { fr: "Présents",                  ar: "الحاضرون",              en: "Attendees" },
  "pv.observations":         { fr: "Observations",              ar: "الملاحظات",             en: "Observations" },
  "pv.decisions":            { fr: "Décisions",                 ar: "القرارات",              en: "Decisions" },
  "pv.next_visit":           { fr: "Prochaine visite",          ar: "الزيارة القادمة",       en: "Next visit" },
  "pv.sign":                 { fr: "Signer",                    ar: "توقيع",                 en: "Sign" },
  "pv.finalize":             { fr: "Finaliser",                 ar: "إنهاء",                 en: "Finalize" },
  "pv.severity.info":        { fr: "Info",                      ar: "معلومة",                en: "Info" },
  "pv.severity.avis":        { fr: "Avis",                      ar: "رأي",                   en: "Notice" },
  "pv.severity.reserve":     { fr: "Réserve",                   ar: "تحفظ",                  en: "Reserve" },
  "pv.severity.bloquant":    { fr: "Bloquant",                  ar: "عائق",                  en: "Blocking" },

  // ─── PV Commission Rokhas ───────────────────────────────────────────
  "pv.commission.title":     { fr: "PV de commission Rokhas",   ar: "محضر اللجنة (رخص)",     en: "Rokhas commission report" },
  "pv.commission.upload":    { fr: "Importer le PV (PDF)",      ar: "استيراد المحضر",        en: "Upload PV (PDF)" },
  "pv.commission.decision":  { fr: "Décision",                  ar: "القرار",                en: "Decision" },
  "pv.decision.favorable":   { fr: "Favorable",                 ar: "موافق",                 en: "Favorable" },
  "pv.decision.fav_reserve": { fr: "Favorable avec réserves",   ar: "موافق مع تحفظات",       en: "Favorable with reserves" },
  "pv.decision.defavorable": { fr: "Défavorable",               ar: "غير موافق",             en: "Unfavorable" },
  "pv.decision.ajourne":     { fr: "Ajourné",                   ar: "مؤجل",                  en: "Postponed" },
  "pv.reserves.tracker":     { fr: "Suivi des réserves",        ar: "متابعة التحفظات",       en: "Reserves tracker" },
  "pv.reserve.lever":        { fr: "Marquer comme levée",       ar: "تحديد كمرفوع",          en: "Mark as lifted" },
  "pv.reserve.preuve":       { fr: "Téléverser preuve",         ar: "رفع الإثبات",           en: "Upload proof" },

  // ─── Catalogue Matériaux ────────────────────────────────────────────
  "mat.catalog.title":       { fr: "Catalogue matériaux",       ar: "كتالوج المواد",         en: "Materials catalog" },
  "mat.category.ciment":     { fr: "Ciment",                    ar: "إسمنت",                 en: "Cement" },
  "mat.category.acier":      { fr: "Acier",                     ar: "حديد",                  en: "Steel" },
  "mat.category.granulats":  { fr: "Granulats",                 ar: "ركام",                  en: "Aggregates" },
  "mat.category.etancheite": { fr: "Étanchéité",                ar: "العزل",                 en: "Waterproofing" },
  "mat.category.menuiserie": { fr: "Menuiserie",                ar: "النجارة",               en: "Joinery" },
  "mat.category.peinture":   { fr: "Peinture",                  ar: "دهان",                  en: "Paint" },
  "mat.category.plomberie":  { fr: "Plomberie",                 ar: "السباكة",               en: "Plumbing" },
  "mat.category.electricite":{ fr: "Électricité",               ar: "الكهرباء",              en: "Electrical" },
  "mat.unit":                { fr: "Unité",                     ar: "وحدة",                  en: "Unit" },
  "mat.price.min":           { fr: "Prix min",                  ar: "أدنى سعر",              en: "Min price" },
  "mat.price.avg":           { fr: "Prix moyen",                ar: "متوسط السعر",           en: "Avg price" },
  "mat.price.max":           { fr: "Prix max",                  ar: "أقصى سعر",              en: "Max price" },
  "mat.compare.title":       { fr: "Comparer un prix",          ar: "مقارنة سعر",            en: "Compare a price" },
  "mat.compare.your_price":  { fr: "Votre prix (MAD/unité)",    ar: "سعرك (درهم/وحدة)",     en: "Your price (MAD/unit)" },

  // ─── Catalogue Matériaux — filtres, recherche, vues, détail ────────
  "mat.filter.title":              { fr: "Filtres",                       ar: "عوامل التصفية",            en: "Filters" },
  "mat.filter.price_range":        { fr: "Fourchette de prix",            ar: "نطاق السعر",              en: "Price range" },
  "mat.filter.region":             { fr: "Région",                        ar: "الجهة",                   en: "Region" },
  "mat.filter.with_observations":  { fr: "Avec observations terrain",     ar: "بمعطيات ميدانية",         en: "With field observations" },
  "mat.filter.variation":          { fr: "Variation prix",                ar: "تغير الأسعار",            en: "Price variation" },
  "mat.filter.variation.up":       { fr: "En hausse",                     ar: "ارتفاع",                  en: "Rising" },
  "mat.filter.variation.down":     { fr: "En baisse",                     ar: "انخفاض",                  en: "Falling" },
  "mat.filter.variation.stable":   { fr: "Stable",                        ar: "مستقر",                   en: "Stable" },
  "mat.filter.reset":              { fr: "Réinitialiser",                 ar: "إعادة الضبط",             en: "Reset" },
  "mat.filter.show_filters":       { fr: "Afficher les filtres",          ar: "عرض المرشحات",            en: "Show filters" },
  "mat.filter.hide_filters":       { fr: "Masquer les filtres",           ar: "إخفاء المرشحات",          en: "Hide filters" },
  "mat.filter.apply":              { fr: "Appliquer",                     ar: "تطبيق",                   en: "Apply" },
  "mat.filter.categories":         { fr: "Catégories",                    ar: "الأصناف",                 en: "Categories" },
  "mat.filter.all_categories":     { fr: "Toutes",                        ar: "الكل",                    en: "All" },

  "mat.sort.label":                { fr: "Trier par",                     ar: "ترتيب حسب",               en: "Sort by" },
  "mat.sort.relevance":            { fr: "Pertinence",                    ar: "الصلة",                   en: "Relevance" },
  "mat.sort.price_asc":            { fr: "Prix croissant",                ar: "السعر تصاعدي",            en: "Price ascending" },
  "mat.sort.price_desc":           { fr: "Prix décroissant",              ar: "السعر تنازلي",            en: "Price descending" },
  "mat.sort.variation":            { fr: "Variation la plus forte",       ar: "أكبر تغير",               en: "Highest variation" },
  "mat.sort.alpha":                { fr: "Alphabétique",                  ar: "أبجدي",                   en: "Alphabetical" },

  "mat.view.grid":                 { fr: "Grille",                        ar: "شبكة",                    en: "Grid" },
  "mat.view.table":                { fr: "Tableau",                       ar: "جدول",                    en: "Table" },

  "mat.no_results.exact":          { fr: "Pas de correspondance exacte pour « {q} »",   ar: "لا توجد نتيجة مطابقة لـ «{q}»",  en: "No exact match for \"{q}\"" },
  "mat.no_results.suggestion":     { fr: "Voici les plus proches :",      ar: "إليك الأقرب:",            en: "Here are the closest matches:" },
  "mat.no_results.see_all":        { fr: "Voir tout le catalogue",        ar: "عرض الكتالوج بأكمله",     en: "See all catalog" },

  "mat.search.placeholder":        { fr: "Rechercher (ciment, carrelage, acier 12…)", ar: "بحث (إسمنت، بلاط، فولاذ…)", en: "Search (cement, tile, steel 12…)" },
  "mat.search.suggestions":        { fr: "Suggestions",                   ar: "اقتراحات",                en: "Suggestions" },
  "mat.search.no_match":           { fr: "Aucun matériau trouvé",         ar: "لم يتم العثور على مادة",  en: "No material found" },

  "mat.detail.tab.price":          { fr: "Prix",                          ar: "السعر",                   en: "Price" },
  "mat.detail.tab.specs":          { fr: "Spécifications",                ar: "المواصفات",               en: "Specifications" },
  "mat.detail.tab.brands":         { fr: "Marques",                       ar: "العلامات التجارية",        en: "Brands" },
  "mat.detail.tab.compare":        { fr: "Comparateur",                   ar: "المقارن",                 en: "Compare" },
  "mat.detail.tab.buy":            { fr: "Achat",                         ar: "الشراء",                  en: "Buy" },
  "mat.detail.add_to_quote":       { fr: "Ajouter à mon devis",           ar: "إضافة إلى عرض السعر",     en: "Add to my quote" },
  "mat.detail.share_whatsapp":     { fr: "Partager sur WhatsApp",         ar: "مشاركة عبر واتساب",       en: "Share on WhatsApp" },
  "mat.detail.buy.soon":           { fr: "Achat en ligne — bientôt disponible", ar: "الشراء عبر الإنترنت — قريبا", en: "Online purchase — coming soon" },
  "mat.detail.chart_title":        { fr: "Évolution sur 12 mois",         ar: "التطور خلال 12 شهرا",     en: "12-month trend" },
  "mat.detail.month_axis":         { fr: "Mois",                          ar: "الشهر",                   en: "Month" },
  "mat.detail.price_axis":         { fr: "Prix (MAD)",                    ar: "السعر (درهم)",            en: "Price (MAD)" },

  "mat.compare.verdict.under":     { fr: "Sous-évalué",                   ar: "أقل من السوق",            en: "Underpriced" },
  "mat.compare.verdict.market":    { fr: "Prix de marché",                ar: "سعر السوق",               en: "Market price" },
  "mat.compare.verdict.over":      { fr: "Sur-évalué",                    ar: "أعلى من السوق",           en: "Overpriced" },
  "mat.compare.advice.under":      { fr: "Prix attractif — vérifiez qualité, conformité et délais.", ar: "سعر مغري — تحقق من الجودة والمطابقة.", en: "Attractive price — verify quality and compliance." },
  "mat.compare.advice.market":     { fr: "Prix conforme au marché. Cohérent avec les références régionales.", ar: "سعر مطابق للسوق ومتوافق مع المراجع الإقليمية.", en: "Aligned with market references in the region." },
  "mat.compare.advice.over":       { fr: "Prix élevé — une renégociation est conseillée.", ar: "سعر مرتفع — يُنصح بإعادة التفاوض.", en: "High price — renegotiation advised." },
  "mat.compare.send_observation":  { fr: "Partager mon observation",      ar: "مشاركة ملاحظتي",          en: "Share my observation" },

  "mat.ecolabel":                  { fr: "EcoLabel",                      ar: "إيكولابل",                en: "EcoLabel" },
  "mat.brands.title":              { fr: "Marques courantes au Maroc",    ar: "العلامات التجارية الشائعة بالمغرب", en: "Common brands in Morocco" },
  "mat.brands.top":                { fr: "Top marques",                   ar: "أبرز العلامات",           en: "Top brands" },

  "mat.table.category":            { fr: "Catégorie",                     ar: "الصنف",                   en: "Category" },
  "mat.table.code":                { fr: "Code",                          ar: "الرمز",                   en: "Code" },
  "mat.table.label":               { fr: "Désignation",                   ar: "التسمية",                 en: "Label" },
  "mat.table.unit":                { fr: "Unité",                         ar: "وحدة",                    en: "Unit" },
  "mat.table.variation":           { fr: "Variation",                     ar: "التغير",                  en: "Variation" },
  "mat.results.count":             { fr: "{n} résultats",                 ar: "{n} نتيجة",               en: "{n} results" },

  // ─── Tarifs prestataires contractuels ───────────────────────────────
  "tarif.title":             { fr: "Tarifs contractuels",       ar: "أسعار تعاقدية",         en: "Contractual rates" },
  "tarif.publie":            { fr: "Publié",                    ar: "منشور",                 en: "Published" },
  "tarif.brouillon":         { fr: "Brouillon",                 ar: "مسودة",                 en: "Draft" },
  "tarif.valide_citurbarea": { fr: "Validé CITURBAREA",         ar: "موثق CITURBAREA",       en: "CITURBAREA validated" },
  "tarif.demander":          { fr: "Demander intervention",     ar: "طلب التدخل",            en: "Request service" },
  "tarif.delai":             { fr: "Délai d'intervention",      ar: "أجل التدخل",            en: "Response time" },
  "tarif.garantie":          { fr: "Garantie",                  ar: "ضمان",                  en: "Warranty" },
  "tarif.zone":              { fr: "Zone d'intervention",       ar: "منطقة التدخل",          en: "Service area" },

  // ─── Dossier interactions ──────────────────────────────────────────
  "interact.timeline":       { fr: "Fil d'interactions",        ar: "خط التفاعلات",          en: "Activity feed" },
  "interact.comment":        { fr: "Commenter",                 ar: "علق",                   en: "Comment" },
  "interact.mention":        { fr: "Mentionner @",              ar: "إشارة @",               en: "Mention @" },
  "interact.attach":         { fr: "Joindre un fichier",        ar: "إرفاق ملف",             en: "Attach file" },
  "interact.audio_note":     { fr: "Note vocale",               ar: "ملاحظة صوتية",          en: "Voice note" },
  "interact.pin":            { fr: "Épingler",                  ar: "تثبيت",                 en: "Pin" },
  "interact.unread_mentions": { fr: "Mentions non lues",        ar: "إشارات غير مقروءة",     en: "Unread mentions" },

  // ─── Mobile / bottom-nav ───────────────────────────────────────────
  "nav.bottom.home":         { fr: "Accueil",                   ar: "الرئيسية",              en: "Home" },
  "nav.bottom.dossiers":     { fr: "Dossiers",                  ar: "ملفات",                 en: "Files" },
  "nav.bottom.new":          { fr: "Nouveau",                   ar: "جديد",                  en: "New" },
  "nav.bottom.cercles":      { fr: "Cercles",                   ar: "الدوائر",               en: "Cercles" },
  "nav.bottom.profile":      { fr: "Profil",                    ar: "الملف الشخصي",          en: "Profile" },

  // ─── Landing — Hero & sections (NEW) ──────────────────────────────
  "landing.title":               { fr: "Votre projet au Maroc, sécurisé de A à Z.",                                    ar: "مشروعك بالمغرب، آمن من الألف إلى الياء.",                                          en: "Your project in Morocco, secured end-to-end." },
  "landing.title_highlight":     { fr: "sécurisé de A à Z.",                                                            ar: "آمن من الألف إلى الياء.",                                                          en: "secured end-to-end." },
  "landing.hero_kicker":         { fr: "Architecture · Urbanisme · Investissement",                                    ar: "هندسة معمارية · تعمير · استثمار",                                                 en: "Architecture · Urban planning · Investment" },
  "landing.hero_subtitle":       { fr: "Permis bloqué, chantier qui dérape, terrain sans plan — nous traitons les projets complexes que les autres cabinets évitent. Diagnostic gratuit en 30 minutes.", ar: "رخصة بناء معلقة، ورش متعثر، أرض بدون تصميم — نتولى المشاريع المعقدة التي يتجنبها الآخرون. تشخيص مجاني في 30 دقيقة.", en: "Blocked permit, derailed site, plotless land — we handle complex projects that other firms avoid. Free 30-minute diagnostic." },
  "landing.cta_start":           { fr: "Démarrer mon diagnostic",                                                       ar: "ابدأ التشخيص",                                                                     en: "Start my diagnostic" },
  "landing.cta_explore":         { fr: "Voir les services",                                                             ar: "عرض الخدمات",                                                                      en: "View services" },
  "landing.cta_whatsapp":        { fr: "RDV WhatsApp",                                                                  ar: "موعد عبر واتساب",                                                                  en: "WhatsApp appointment" },
  "landing.cta_whatsapp_direct": { fr: "WhatsApp direct",                                                              ar: "واتساب مباشر",                                                                     en: "WhatsApp direct" },
  "landing.cta_platform":        { fr: "Accéder à la plateforme",                                                       ar: "الولوج إلى المنصة",                                                                en: "Access the platform" },
  "landing.feature.cabinet":     { fr: "Cabinet agréé Maroc",                                                           ar: "مكتب مرخص بالمغرب",                                                                en: "Licensed firm in Morocco" },
  "landing.feature.kenitra":     { fr: "Kénitra & national",                                                            ar: "القنيطرة وعلى الصعيد الوطني",                                                       en: "Kenitra & nationwide" },
  "landing.feature.mre":         { fr: "MRE — suivi à distance",                                                        ar: "مغاربة العالم — متابعة عن بُعد",                                                    en: "MRE — remote monitoring" },
  "landing.feature.proofs":      { fr: "Preuves opposables",                                                            ar: "أدلة قابلة للاحتجاج",                                                              en: "Enforceable evidence" },
  "landing.section.portes.kicker": { fr: "Ce que nous faisons",                                                         ar: "ما الذي نقوم به",                                                                  en: "What we do" },
  "landing.section.portes.title":  { fr: "6 domaines d'intervention",                                                  ar: "6 مجالات للتدخل",                                                                  en: "6 service areas" },
  "landing.section.portes.sub":    { fr: "Chaque projet est orienté vers le bon périmètre d'action. Nous ne prenons que ce que nous pouvons livrer.", ar: "كل مشروع يوجه إلى المجال المناسب. لا نقبل إلا ما يمكننا تسليمه.", en: "Each project is routed to the right scope. We only take what we can deliver." },
  "landing.cta.talk_project":      { fr: "Parler de mon projet",                                                        ar: "تحدث عن مشروعي",                                                                   en: "Discuss my project" },
  "landing.porte.available":       { fr: "Disponible",                                                                  ar: "متوفر",                                                                            en: "Available" },
  "landing.porte.soon":            { fr: "Bientôt",                                                                     ar: "قريبا",                                                                            en: "Soon" },
  "porte.p1.subtitle":             { fr: "Maison R+1 à R+3, villa individuelle, terrain nu. Conception, autorisation, orientation chantier.", ar: "منزل من طابق إلى ثلاثة طوابق، فيلا، أرض. تصميم، ترخيص، توجيه الورش.", en: "R+1 to R+3 house, villa, vacant land. Design, permitting, site guidance." },
  "porte.p1.result":               { fr: "Plan + dossier autorisable + permis",                                        ar: "تصميم + ملف قابل للترخيص + رخصة البناء",                                          en: "Plan + permittable file + building permit" },
  "porte.p2.subtitle":             { fr: "Immeuble, commerce, clinique, école. Faisabilité, scénarios réglementaires, conception optimisée.", ar: "عمارة، تجارة، عيادة، مدرسة. جدوى، سيناريوهات تنظيمية، تصميم محسّن.", en: "Building, retail, clinic, school. Feasibility, regulatory scenarios, optimized design." },
  "porte.p2.result":               { fr: "Dossier + scénarios + sécurisation",                                         ar: "ملف + سيناريوهات + تأمين",                                                         en: "File + scenarios + securing" },
  "porte.p3.subtitle":             { fr: "Pilotage chantier, sélection entreprises, contrôle qualité, suivi budget et délais.", ar: "إشراف على الورش، اختيار المقاولات، مراقبة الجودة، تتبع الميزانية والآجال.",   en: "Site management, contractor selection, quality control, budget & schedule tracking." },
  "porte.p3.result":               { fr: "Chantier piloté + budget maîtrisé",                                          ar: "ورش تحت الإشراف + ميزانية متحكم بها",                                              en: "Managed site + controlled budget" },
  "porte.p4.subtitle":             { fr: "Analyse foncière, potentiel réglementaire, scénarios de valorisation, risques identifiés.", ar: "تحليل عقاري، إمكانيات تنظيمية، سيناريوهات تثمين، مخاطر محددة.",                en: "Land analysis, regulatory potential, valuation scenarios, identified risks." },
  "porte.p4.result":               { fr: "Étude + potentiel + stratégie",                                              ar: "دراسة + إمكانيات + استراتيجية",                                                   en: "Study + potential + strategy" },
  "porte.p5.subtitle":             { fr: "Estimation immobilière, rapport conformité, avis technique. Document exploitable banque / décision.", ar: "تقدير عقاري، تقرير امتثال، رأي تقني. وثيقة قابلة للاستعمال البنكي / للقرار.",     en: "Real estate valuation, compliance report, technical opinion. Bank-ready / decision-ready document." },
  "porte.p5.result":               { fr: "Rapport premium opposable",                                                  ar: "تقرير ممتاز قابل للاحتجاج",                                                       en: "Enforceable premium report" },
  "porte.p6.subtitle":             { fr: "Accès à des dossiers qualifiés, collaboration structurée, méthode qualité imposée.", ar: "ولوج إلى ملفات مؤهلة، تعاون منظم، منهجية جودة مفروضة.",                       en: "Access to qualified files, structured collaboration, imposed quality method." },
  "porte.p6.result":               { fr: "Écosystème + dossiers qualifiés",                                            ar: "منظومة + ملفات مؤهلة",                                                            en: "Ecosystem + qualified files" },
  "landing.section.media.kicker":  { fr: "Journal premium",                                                             ar: "مجلة متخصصة",                                                                       en: "Premium journal" },
  "landing.section.media.title":   { fr: "Médias & Analyses",                                                           ar: "إعلام وتحليلات",                                                                   en: "Media & Analysis" },
  "landing.section.media.sub":     { fr: "Contenus éditoriaux vérifiés — immobilier, urbanisme, investissement, construction.", ar: "محتويات تحريرية محققة — عقار، تعمير، استثمار، بناء.",                            en: "Verified editorial content — real estate, urban planning, investment, construction." },
  "landing.media.read":            { fr: "Lire",                                                                        ar: "اقرأ",                                                                              en: "Read" },
  "landing.media.access_vip":      { fr: "Accès VIP",                                                                   ar: "ولوج VIP",                                                                          en: "VIP access" },
  "landing.media.tag_premium":     { fr: "Premium",                                                                     ar: "ممتاز",                                                                             en: "Premium" },
  "landing.media.tag_free":        { fr: "Libre",                                                                       ar: "حر",                                                                                en: "Free" },
  "landing.media.coming":          { fr: "Journal complet — Bientôt disponible",                                       ar: "المجلة الكاملة — قريبا",                                                            en: "Full journal — Coming soon" },
  "landing.media.coming_sub":      { fr: "Briefs d'analyse, études de marché, dossiers techniques — accès VIP & VVIP en cours de déploiement.", ar: "موجزات تحليلية، دراسات سوقية، ملفات تقنية — الولوج VIP و VVIP قيد النشر.",  en: "Analysis briefs, market studies, technical files — VIP & VVIP access being deployed." },
  "landing.media.in_progress":     { fr: "En cours",                                                                    ar: "قيد الإنجاز",                                                                       en: "In progress" },
  "landing.section.cta_final.title":     { fr: "Votre projet mérite",                                                  ar: "مشروعك يستحق",                                                                      en: "Your project deserves" },
  "landing.section.cta_final.highlight": { fr: "un diagnostic sérieux.",                                                ar: "تشخيصا جديا.",                                                                      en: "a serious diagnostic." },
  "landing.section.cta_final.sub":       { fr: "30 minutes. Gratuit. Sans engagement.",                                ar: "30 دقيقة. مجانا. بدون التزام.",                                                     en: "30 minutes. Free. No commitment." },
  "landing.section.cta_final.sub2":      { fr: "On vous dit exactement ce qu'on peut faire.",                          ar: "نخبرك بدقة بما يمكننا فعله.",                                                       en: "We tell you exactly what we can do." },
  "landing.method.kicker":         { fr: "Pourquoi CITURBAREA",                                                         ar: "لماذا CITURBAREA",                                                                 en: "Why CITURBAREA" },
  "landing.method.title":          { fr: "Un système, pas un cabinet comme les autres.",                              ar: "نظام، وليس مكتبا كغيره.",                                                          en: "A system, not just another firm." },
  "landing.method.sub":            { fr: "Chaque projet est cadré, documenté et suivi avec des preuves opposables. Pas de promesse floue — des livrables précis, des responsabilités claires.", ar: "كل مشروع يتم تأطيره وتوثيقه ومتابعته بأدلة قابلة للاحتجاج. لا وعود مبهمة — منتجات دقيقة، مسؤوليات واضحة.", en: "Each project is framed, documented and tracked with enforceable evidence. No vague promises — precise deliverables, clear responsibilities." },
  "landing.method.stat.subs":      { fr: "Abonnés suivent nos conseils",                                                ar: "مشترك يتابع نصائحنا",                                                              en: "Subscribers following our advice" },
  "landing.method.stat.areas":     { fr: "Domaines d'intervention",                                                     ar: "مجالات تدخل",                                                                       en: "Service areas" },
  "landing.method.stat.cities":    { fr: "Villes couvertes",                                                            ar: "مدن مغطاة",                                                                         en: "Cities covered" },
  "landing.method.stat.diag":      { fr: "Diagnostic gratuit",                                                          ar: "تشخيص مجاني",                                                                       en: "Free diagnostic" },
  "landing.method.step1.title":    { fr: "Entrée structurée",                                                           ar: "دخول مهيكل",                                                                       en: "Structured intake" },
  "landing.method.step1.desc":     { fr: "Vous décrivez votre projet. La plateforme collecte sans interpréter — zéro jugement prématuré.", ar: "تصف مشروعك. تجمع المنصة دون تأويل — لا حكم مسبق.",                          en: "You describe your project. The platform collects without interpreting — no premature judgment." },
  "landing.method.step2.title":    { fr: "Décision backend",                                                            ar: "قرار خلفي",                                                                         en: "Backend decision" },
  "landing.method.step2.desc":     { fr: "Le moteur applique les règles, qualifie votre dossier, et détermine le bon tunnel.", ar: "يطبق المحرك القواعد، يؤهل ملفك، ويحدد المسار المناسب.",                          en: "The engine applies the rules, qualifies your file, and determines the right tunnel." },
  "landing.method.step3.title":    { fr: "Affichage lisible",                                                           ar: "عرض واضح",                                                                          en: "Readable display" },
  "landing.method.step3.desc":     { fr: "Complexité, périmètre, pack recommandé — restitués clairement. Le front affiche, le moteur décide.", ar: "تعقيد، نطاق، باقة موصى بها — تعرض بوضوح. الواجهة تعرض، المحرك يقرر.",          en: "Complexity, scope, recommended pack — clearly displayed. Frontend shows, engine decides." },
  "landing.method.step4.title":    { fr: "Traçabilité totale",                                                          ar: "تتبع كامل",                                                                         en: "Full traceability" },
  "landing.method.step4.desc":     { fr: "Chaque action est horodatée, hashée, et attachée à des règles opposables. Preuves permanentes.", ar: "كل إجراء مؤرخ، مرمز، ومرتبط بقواعد قابلة للاحتجاج. أدلة دائمة.",                  en: "Each action is timestamped, hashed, and tied to enforceable rules. Permanent evidence." },
  "landing.contact.title":         { fr: "Diagnostic gratuit — 30 min",                                                ar: "تشخيص مجاني — 30 دقيقة",                                                            en: "Free diagnostic — 30 min" },
  "landing.contact.sub":           { fr: "Choisissez votre profil. On vous répond en moins de 2h.",                    ar: "اختر ملفك. نرد عليك في أقل من ساعتين.",                                             en: "Choose your profile. We reply in under 2 hours." },
  "landing.contact.situation":     { fr: "Votre situation",                                                             ar: "وضعيتك",                                                                            en: "Your situation" },
  "landing.contact.start_wa":      { fr: "Démarrer sur WhatsApp",                                                       ar: "ابدأ عبر واتساب",                                                                   en: "Start on WhatsApp" },
  "landing.contact.no_payment":    { fr: "Aucun paiement requis · Diagnostic 30 min gratuit",                          ar: "لا يستلزم أي دفع · تشخيص مجاني لمدة 30 دقيقة",                                     en: "No payment required · Free 30-min diagnostic" },
  "landing.contact.or_login":      { fr: "Ou accédez à votre espace plateforme",                                       ar: "أو ادخل إلى فضائك على المنصة",                                                      en: "Or access your platform space" },
  "landing.footer.tagline":        { fr: "Plateforme d'architecture, urbanisme & investissement au Maroc.",            ar: "منصة الهندسة المعمارية والتعمير والاستثمار بالمغرب.",                               en: "Architecture, urban planning & investment platform in Morocco." },
  "landing.footer.by":             { fr: "Par Yassine Attarassi — Arc Bati Architecture.",                            ar: "بقلم ياسين العطار السي — أرك باتي للهندسة المعمارية.",                              en: "By Yassine Attarassi — Arc Bati Architecture." },
  "landing.footer.services":       { fr: "Services",                                                                    ar: "الخدمات",                                                                            en: "Services" },
  "landing.footer.platform":       { fr: "Plateforme",                                                                  ar: "المنصة",                                                                           en: "Platform" },
  "landing.footer.contact":        { fr: "Contact",                                                                     ar: "اتصال",                                                                             en: "Contact" },
  "landing.footer.legal":          { fr: "Mentions légales",                                                            ar: "إشعارات قانونية",                                                                   en: "Legal notice" },
  "landing.footer.privacy":        { fr: "Confidentialité",                                                              ar: "الخصوصية",                                                                          en: "Privacy" },
  "landing.footer.terms":          { fr: "CGU",                                                                          ar: "شروط الاستخدام",                                                                    en: "Terms" },
  "landing.footer.rights":         { fr: "Tous droits réservés.",                                                       ar: "جميع الحقوق محفوظة.",                                                              en: "All rights reserved." },

  // ─── Auth — Login / Signup / OTP (NEW) ────────────────────────────
  "auth.login_title":              { fr: "Connexion",                                                                   ar: "تسجيل الدخول",                                                                      en: "Sign in" },
  "auth.login_subtitle":           { fr: "Accédez à votre espace CITURBAREA.",                                          ar: "ادخل إلى فضائك CITURBAREA.",                                                        en: "Access your CITURBAREA space." },
  "auth.signup_title":             { fr: "Créer un compte",                                                             ar: "إنشاء حساب",                                                                        en: "Create an account" },
  "auth.signup_subtitle":          { fr: "Quel profil correspond à votre situation ?",                                  ar: "ما الملف الذي يطابق وضعيتك؟",                                                       en: "Which profile matches your situation?" },
  "auth.email_label":              { fr: "Email",                                                                       ar: "البريد الإلكتروني",                                                                  en: "Email" },
  "auth.password_label":           { fr: "Mot de passe",                                                                ar: "كلمة المرور",                                                                       en: "Password" },
  "auth.password_placeholder":     { fr: "••••••••••••",                                                                ar: "••••••••••••",                                                                      en: "••••••••••••" },
  "auth.confirm_password":         { fr: "Confirmer le mot de passe",                                                  ar: "تأكيد كلمة المرور",                                                                 en: "Confirm password" },
  "auth.signing_in":               { fr: "Connexion...",                                                                ar: "جارٍ تسجيل الدخول...",                                                              en: "Signing in..." },
  "auth.sign_in_btn":              { fr: "Se connecter",                                                                ar: "تسجيل الدخول",                                                                      en: "Sign in" },
  "auth.forgot_password":          { fr: "Mot de passe oublié ?",                                                       ar: "نسيت كلمة المرور؟",                                                                  en: "Forgot your password?" },
  "auth.new_here":                 { fr: "Nouveau ici ?",                                                               ar: "جديد هنا؟",                                                                          en: "New here?" },
  "auth.create_account":           { fr: "Créer un compte",                                                             ar: "إنشاء حساب",                                                                        en: "Create an account" },
  "auth.back_home":                { fr: "Retour à l'accueil",                                                          ar: "العودة إلى الرئيسية",                                                              en: "Back to home" },
  "auth.back_login":               { fr: "Retour à la connexion",                                                       ar: "العودة إلى تسجيل الدخول",                                                          en: "Back to sign in" },
  "auth.firstname":                { fr: "Prénom",                                                                       ar: "الاسم",                                                                              en: "First name" },
  "auth.lastname":                 { fr: "Nom",                                                                          ar: "اللقب",                                                                              en: "Last name" },
  "auth.phone":                    { fr: "Téléphone",                                                                    ar: "الهاتف",                                                                             en: "Phone" },
  "auth.client_create_title":      { fr: "Créer mon espace client",                                                     ar: "إنشاء فضائي كزبون",                                                                 en: "Create my client space" },
  "auth.client_create_sub":        { fr: "Pour suivre votre projet et vos dossiers CITURBAREA.",                       ar: "لمتابعة مشروعك وملفاتك CITURBAREA.",                                                en: "To track your CITURBAREA project and files." },
  "auth.account_type_back":        { fr: "Type de compte",                                                              ar: "نوع الحساب",                                                                         en: "Account type" },
  "auth.modify_info":              { fr: "Modifier mes informations",                                                   ar: "تعديل معلوماتي",                                                                    en: "Modify my information" },
  "auth.verification_title":       { fr: "Vérification",                                                                ar: "التحقق",                                                                             en: "Verification" },
  "auth.verification_sub":         { fr: "Pour confirmer votre identité, saisissez les deux codes — un envoyé par email à {email}, un par SMS au {phone}.", ar: "للتأكد من هويتك، أدخل الرمزين — رمز عبر البريد إلى {email}، ورمز عبر رسالة قصيرة إلى {phone}.", en: "To confirm your identity, enter the two codes — one sent by email to {email}, one by SMS to {phone}." },
  "auth.email_code":               { fr: "Code reçu par email",                                                         ar: "الرمز عبر البريد الإلكتروني",                                                       en: "Code received by email" },
  "auth.sms_code":                 { fr: "Code reçu par SMS",                                                           ar: "الرمز عبر الرسالة القصيرة",                                                         en: "Code received by SMS" },
  "auth.otp_sent":                 { fr: "Code envoyé. Vérifiez votre boîte de réception.",                            ar: "تم إرسال الرمز. تحقق من علبة الوارد.",                                              en: "Code sent. Check your inbox." },
  "auth.otp_resend":               { fr: "Renvoyer les codes",                                                          ar: "إعادة إرسال الرموز",                                                                en: "Resend codes" },
  "auth.codes_not_received":       { fr: "Codes non reçus ?",                                                           ar: "لم تستلم الرموز؟",                                                                  en: "Codes not received?" },
  "auth.continue":                 { fr: "Continuer",                                                                   ar: "متابعة",                                                                             en: "Continue" },
  "auth.sending_codes":            { fr: "Envoi des codes…",                                                            ar: "جارٍ إرسال الرموز…",                                                                en: "Sending codes…" },
  "auth.verify_create":            { fr: "Vérifier et créer mon compte",                                                ar: "تحقق وأنشئ الحساب",                                                                 en: "Verify and create my account" },
  "auth.verifying":                { fr: "Vérification…",                                                                ar: "جارٍ التحقق…",                                                                       en: "Verifying…" },
  "auth.already_account":          { fr: "Déjà un compte ?",                                                            ar: "لديك حساب بالفعل؟",                                                                  en: "Already have an account?" },
  "auth.profile_pro":              { fr: "Professionnel du BTP",                                                        ar: "محترف البناء والأشغال العمومية",                                                    en: "Construction professional" },
  "auth.profile_pro_desc":         { fr: "Architecte, bureau d'études, topographe, laboratoire, entreprise ou fournisseur. Rejoignez le réseau CITURBAREA Cercles : annuaire pro, marketplace matériaux, visioconférences et messagerie entre pairs.", ar: "مهندس معماري، مكتب دراسات، طوبوغرافي، مختبر، مقاولة أو مورد. انضم إلى شبكة CITURBAREA Cercles: دليل مهني، سوق المواد، اجتماعات بالفيديو ورسائل بين الأقران.", en: "Architect, design office, surveyor, laboratory, company or supplier. Join the CITURBAREA Cercles network: professional directory, materials marketplace, video conferencing and peer messaging." },
  "auth.profile_pro_cta":          { fr: "Je suis un professionnel",                                                    ar: "أنا محترف",                                                                          en: "I am a professional" },
  "auth.profile_client":           { fr: "Particulier / Client",                                                        ar: "شخص / زبون",                                                                         en: "Individual / Client" },
  "auth.profile_client_desc":      { fr: "Vous avez un projet de construction, de rénovation, un terrain ou un bien à valoriser. Créez votre espace client et lancez votre dossier CITURBAREA en toute simplicité.", ar: "لديك مشروع بناء، تجديد، أرض أو ملك للتثمين. أنشئ فضاء الزبون وأطلق ملفك CITURBAREA بكل بساطة.", en: "You have a construction, renovation, land or property project. Create your client space and start your CITURBAREA file easily." },
  "auth.profile_client_cta":       { fr: "Je suis un particulier",                                                      ar: "أنا شخص",                                                                            en: "I am an individual" },
  "auth.forgot_title":             { fr: "Mot de passe oublié",                                                         ar: "نسيت كلمة المرور",                                                                  en: "Forgot password" },
  "auth.forgot_step_email":        { fr: "Saisis ton email — un code de réinitialisation te sera envoyé.",             ar: "أدخل بريدك — سيُرسل إليك رمز لإعادة التعيين.",                                       en: "Enter your email — a reset code will be sent to you." },
  "auth.forgot_step_code":         { fr: "Saisis le code reçu et choisis un nouveau mot de passe.",                    ar: "أدخل الرمز الذي وصلك واختر كلمة مرور جديدة.",                                       en: "Enter the code received and choose a new password." },
  "auth.forgot_step_done":         { fr: "Mot de passe réinitialisé avec succès.",                                     ar: "تمت إعادة تعيين كلمة المرور بنجاح.",                                                en: "Password reset successfully." },
  "auth.forgot_email_label":       { fr: "Email du compte",                                                             ar: "بريد الحساب",                                                                       en: "Account email" },
  "auth.forgot_receive_code":      { fr: "Recevoir le code",                                                            ar: "استلام الرمز",                                                                      en: "Receive the code" },
  "auth.forgot_sending":           { fr: "Envoi du code…",                                                              ar: "جارٍ إرسال الرمز…",                                                                  en: "Sending code…" },
  "auth.forgot_code_label":        { fr: "Code reçu (6 chiffres)",                                                      ar: "الرمز (6 أرقام)",                                                                    en: "Code received (6 digits)" },
  "auth.forgot_new_password":      { fr: "Nouveau mot de passe",                                                        ar: "كلمة مرور جديدة",                                                                   en: "New password" },
  "auth.forgot_confirm_password":  { fr: "Confirmer le mot de passe",                                                  ar: "تأكيد كلمة المرور",                                                                 en: "Confirm password" },
  "auth.forgot_reset_btn":         { fr: "Réinitialiser le mot de passe",                                              ar: "إعادة تعيين كلمة المرور",                                                          en: "Reset password" },
  "auth.forgot_validating":        { fr: "Validation…",                                                                  ar: "جارٍ التحقق…",                                                                       en: "Validating…" },
  "auth.forgot_resend":            { fr: "Renvoyer un code",                                                            ar: "إعادة إرسال رمز",                                                                   en: "Resend a code" },
  "auth.forgot_done_msg":          { fr: "Ton mot de passe a été modifié. Tu peux maintenant te connecter avec le nouveau.", ar: "تم تعديل كلمة مرورك. يمكنك الآن تسجيل الدخول بالكلمة الجديدة.",                       en: "Your password has been updated. You can now sign in with the new one." },
  "auth.forgot_go_login":          { fr: "Aller à la connexion",                                                        ar: "الذهاب إلى تسجيل الدخول",                                                          en: "Go to sign in" },
  "auth.phone_verify_title":       { fr: "Vérification du téléphone",                                                  ar: "التحقق من الهاتف",                                                                  en: "Phone verification" },
  "auth.phone_verify_sub":         { fr: "Accès aux packs uniquement après validation SMS.",                            ar: "الولوج إلى الباقات يتطلب التحقق عبر رسالة قصيرة.",                                  en: "Pack access requires SMS validation." },
  "auth.phone_number":             { fr: "Numéro",                                                                       ar: "الرقم",                                                                              en: "Number" },
  "auth.phone_send_code":          { fr: "Envoyer le code",                                                             ar: "إرسال الرمز",                                                                       en: "Send the code" },
  "auth.phone_code_label":         { fr: "Code SMS",                                                                    ar: "رمز الرسالة القصيرة",                                                              en: "SMS code" },
  "auth.phone_validate":           { fr: "Valider",                                                                     ar: "تأكيد",                                                                              en: "Validate" },
  "auth.phone_verified":           { fr: "Numéro vérifié.",                                                              ar: "تم التحقق من الرقم.",                                                                en: "Number verified." },
  "auth.success_redirect":         { fr: "Connecté avec succès — redirection…",                                         ar: "تم الاتصال بنجاح — جارٍ التحويل…",                                                  en: "Successfully signed in — redirecting…" },
  "auth.error_invalid_credentials":{ fr: "Identifiants incorrects.",                                                    ar: "بيانات الاعتماد غير صحيحة.",                                                        en: "Invalid credentials." },
  "auth.error_otp_expired":        { fr: "Code expiré. Renvoyez un nouveau code.",                                     ar: "انتهت صلاحية الرمز. أعد إرسال رمز جديد.",                                          en: "Code expired. Resend a new code." },
  "auth.error_required_firstlast": { fr: "Indiquez votre prénom et votre nom.",                                        ar: "أدخل اسمك ولقبك.",                                                                  en: "Enter your first and last name." },
  "auth.error_invalid_email":      { fr: "Adresse email invalide.",                                                    ar: "عنوان البريد غير صالح.",                                                            en: "Invalid email address." },
  "auth.error_invalid_phone":      { fr: "Numéro de téléphone invalide (format conseillé : +212…).",                  ar: "رقم الهاتف غير صالح (الصيغة المقترحة: +212…).",                                     en: "Invalid phone number (suggested format: +212…)." },
  "auth.error_password_min":       { fr: "Le mot de passe doit contenir au moins 8 caractères.",                       ar: "يجب أن تحتوي كلمة المرور على 8 محارف على الأقل.",                                  en: "Password must contain at least 8 characters." },
  "auth.error_password_mismatch":  { fr: "Les deux mots de passe ne correspondent pas.",                               ar: "كلمتا المرور غير متطابقتين.",                                                       en: "The two passwords do not match." },
  "auth.error_codes_required":     { fr: "Saisissez les deux codes reçus (email + SMS).",                              ar: "أدخل الرمزين المستلمين (بريد + رسالة قصيرة).",                                     en: "Enter the two codes received (email + SMS)." },

  // ─── Header / Footer (NEW) ────────────────────────────────────────
  "header.link_portail":           { fr: "Portail",                                                                     ar: "البوابة",                                                                            en: "Portal" },
  "header.link_dossiers":          { fr: "Mes dossiers",                                                                ar: "ملفاتي",                                                                             en: "My files" },
  "header.link_cercles":           { fr: "Cercles",                                                                     ar: "الدوائر",                                                                            en: "Cercles" },
  "header.link_sig":               { fr: "SIG",                                                                          ar: "نظام المعلومات الجغرافية",                                                          en: "GIS" },
  "header.link_docs":              { fr: "Documentation",                                                                ar: "الوثائق",                                                                            en: "Documentation" },
  "header.link_my_space":          { fr: "Mon espace",                                                                  ar: "فضائي",                                                                              en: "My space" },
  "header.link_login":             { fr: "Se connecter",                                                                ar: "تسجيل الدخول",                                                                      en: "Sign in" },
  "header.link_signup":            { fr: "Créer un compte",                                                             ar: "إنشاء حساب",                                                                        en: "Sign up" },
  "header.mobile_menu_open":       { fr: "Ouvrir le menu",                                                              ar: "فتح القائمة",                                                                       en: "Open menu" },
  "header.mobile_menu_close":      { fr: "Fermer le menu",                                                              ar: "إغلاق القائمة",                                                                     en: "Close menu" },
  "footer.copyright":              { fr: "Tous droits réservés.",                                                       ar: "جميع الحقوق محفوظة.",                                                              en: "All rights reserved." },
  "footer.contact":                { fr: "Contact",                                                                      ar: "اتصال",                                                                              en: "Contact" },
  "footer.terms":                  { fr: "Conditions d'utilisation",                                                   ar: "شروط الاستخدام",                                                                    en: "Terms of use" },
  "footer.privacy":                { fr: "Confidentialité",                                                              ar: "الخصوصية",                                                                          en: "Privacy" },
  "footer.made_in_morocco":        { fr: "Conçu au Maroc",                                                              ar: "صُمم بالمغرب",                                                                      en: "Made in Morocco" },
  "footer.version":                { fr: "Version",                                                                     ar: "النسخة",                                                                            en: "Version" },

  // ─── P1 (Particulier) (NEW) ───────────────────────────────────────
  "p1.home_title":                 { fr: "Projet personnel & familial",                                                ar: "مشروع شخصي وعائلي",                                                                en: "Personal & family project" },
  "p1.home_subtitle":              { fr: "Maison, villa, terrain : conception + dossier autorisable + permis de construire.", ar: "منزل، فيلا، أرض: تصميم + ملف قابل للترخيص + رخصة البناء.",                       en: "House, villa, land: design + permittable file + building permit." },
  "p1.packs.essentiel.name":       { fr: "Pack ESSENTIEL",                                                              ar: "باقة أساسية",                                                                       en: "ESSENTIAL pack" },
  "p1.packs.essentiel.price":      { fr: "3 % du budget travaux",                                                       ar: "3٪ من ميزانية الأشغال",                                                             en: "3% of works budget" },
  "p1.packs.essentiel.feature1":   { fr: "Étude de faisabilité urbanistique",                                          ar: "دراسة الجدوى التعميرية",                                                            en: "Urban feasibility study" },
  "p1.packs.essentiel.feature2":   { fr: "Avant-projet sommaire (APS)",                                                 ar: "دراسة أولية موجزة",                                                                  en: "Preliminary design (APS)" },
  "p1.packs.essentiel.feature3":   { fr: "Plans réglementaires d'autorisation",                                        ar: "تصاميم تنظيمية للترخيص",                                                            en: "Regulatory permit drawings" },
  "p1.packs.essentiel.feature4":   { fr: "Dépôt en commune Rokhas",                                                    ar: "إيداع في شباك الرخص",                                                               en: "Filing at Rokhas commune desk" },
  "p1.packs.essentiel.feature5":   { fr: "Suivi administratif jusqu'au permis",                                        ar: "متابعة إدارية حتى الرخصة",                                                          en: "Administrative follow-up until permit" },
  "p1.packs.avance.name":          { fr: "Pack AVANCÉ",                                                                  ar: "باقة متقدمة",                                                                       en: "ADVANCED pack" },
  "p1.packs.avance.price":         { fr: "4 % du budget travaux",                                                       ar: "4٪ من ميزانية الأشغال",                                                             en: "4% of works budget" },
  "p1.packs.avance.feature1":      { fr: "Tout le pack ESSENTIEL +",                                                    ar: "كل الباقة الأساسية +",                                                              en: "All of ESSENTIAL +" },
  "p1.packs.avance.feature2":      { fr: "Avant-projet détaillé (APD)",                                                 ar: "دراسة تفصيلية",                                                                     en: "Detailed design (APD)" },
  "p1.packs.avance.feature3":      { fr: "Dossier consultation entreprises (DCE)",                                     ar: "وثائق استشارة المقاولات",                                                            en: "Tender documents (DCE)" },
  "p1.packs.avance.feature4":      { fr: "Analyse des offres entreprises",                                              ar: "تحليل عروض المقاولات",                                                              en: "Tender analysis" },
  "p1.packs.avance.feature5":      { fr: "PV de chantier mensuels",                                                     ar: "محاضر ورش شهرية",                                                                   en: "Monthly site reports" },
  "p1.packs.complet.name":         { fr: "Pack COMPLET",                                                                ar: "باقة كاملة",                                                                        en: "COMPLETE pack" },
  "p1.packs.complet.price":        { fr: "5 % du budget travaux",                                                       ar: "5٪ من ميزانية الأشغال",                                                             en: "5% of works budget" },
  "p1.packs.complet.feature1":     { fr: "Tout le pack AVANCÉ +",                                                       ar: "كل الباقة المتقدمة +",                                                              en: "All of ADVANCED +" },
  "p1.packs.complet.feature2":     { fr: "Direction de chantier complète (DET)",                                       ar: "إدارة كاملة للورش",                                                                en: "Full site supervision (DET)" },
  "p1.packs.complet.feature3":     { fr: "Contrôle qualité hebdomadaire",                                              ar: "مراقبة الجودة الأسبوعية",                                                            en: "Weekly quality control" },
  "p1.packs.complet.feature4":     { fr: "OPR + réception travaux",                                                    ar: "تسلم الأشغال",                                                                       en: "Handover & reception" },
  "p1.packs.complet.feature5":     { fr: "Garantie parfait achèvement (1 an)",                                         ar: "ضمان إتمام تام (سنة)",                                                              en: "1-year completion warranty" },
  "p1.intake_form_title":          { fr: "Démarrer votre projet personnel",                                            ar: "ابدأ مشروعك الشخصي",                                                                en: "Start your personal project" },
  "p1.intake_form_sub":            { fr: "Quelques informations et nous vous proposons le pack adapté.",               ar: "بضع معلومات ونقترح عليك الباقة المناسبة.",                                          en: "A few details and we suggest the suitable pack." },
  "p1.project_type":               { fr: "Type de projet",                                                              ar: "نوع المشروع",                                                                       en: "Project type" },
  "p1.project_villa":              { fr: "Villa individuelle",                                                          ar: "فيلا فردية",                                                                         en: "Individual villa" },
  "p1.project_house":              { fr: "Maison R+1 / R+2",                                                            ar: "منزل من طابق إلى طابقين",                                                            en: "House R+1 / R+2" },
  "p1.project_extension":          { fr: "Extension / surélévation",                                                    ar: "توسعة / علو",                                                                       en: "Extension / addition" },
  "p1.project_renovation":         { fr: "Rénovation lourde",                                                           ar: "تجديد شامل",                                                                         en: "Major renovation" },
  "p1.budget_label":               { fr: "Budget travaux estimé (DH)",                                                  ar: "الميزانية المقدرة للأشغال (درهم)",                                                  en: "Estimated works budget (MAD)" },
  "p1.choose_pack":                { fr: "Choisir ce pack",                                                              ar: "اختر هذه الباقة",                                                                   en: "Choose this pack" },

  // ─── P2 (Promoteur) (NEW) ─────────────────────────────────────────
  "p2.home_title":                 { fr: "Projet immobilier & équipements",                                            ar: "مشروع عقاري ومعدات",                                                                en: "Real estate & facilities project" },
  "p2.home_subtitle":              { fr: "Immeuble, lotissement, groupement résidentiel, équipement. Barème CNOA officiel.", ar: "عمارة، تجزئة، تجمع سكني، منشأة. تعريفة CNOA الرسمية.",                              en: "Building, subdivision, residential complex, facility. Official CNOA scale." },
  "p2.sections.imm_title":         { fr: "Immeuble (R+2 et plus)",                                                      ar: "عمارة (طابقين فأكثر)",                                                              en: "Building (R+2 and above)" },
  "p2.sections.gr_title":          { fr: "Groupement résidentiel",                                                      ar: "تجمع سكني",                                                                         en: "Residential complex" },
  "p2.sections.lot_title":         { fr: "Lotissement",                                                                  ar: "تجزئة",                                                                              en: "Subdivision" },
  "p2.sections.epig_title":        { fr: "Équipement privé (hôtel, école, clinique…)",                                ar: "منشأة خاصة (فندق، مدرسة، عيادة…)",                                                  en: "Private facility (hotel, school, clinic…)" },
  "p2.sections.amg_title":         { fr: "Aménagement de local existant",                                              ar: "تهيئة محل قائم",                                                                    en: "Existing space fit-out" },
  "p2.quote_compute":              { fr: "Calculer mon devis",                                                          ar: "احتساب عرضي",                                                                       en: "Compute my quote" },
  "p2.quote_total_ttc":            { fr: "TTC honoraires architecte",                                                  ar: "بكامل الرسوم — أتعاب المهندس المعماري",                                              en: "Architect fees incl. VAT" },
  "p2.commune_label":              { fr: "Commune",                                                                     ar: "البلدية",                                                                            en: "Commune" },
  "p2.cnoa_visa":                  { fr: "Visa Ordre National des Architectes (CNOA)",                                 ar: "تأشيرة الهيئة الوطنية للمهندسين المعماريين",                                          en: "National Order of Architects visa (CNOA)" },
  "p2.honoraires_ht":              { fr: "Honoraires HT",                                                              ar: "أتعاب بدون رسوم",                                                                   en: "Fees excl. VAT" },
  "p2.tva_20":                     { fr: "TVA 20 %",                                                                    ar: "ضريبة القيمة المضافة 20٪",                                                          en: "VAT 20%" },

  // ─── P3 (MOD) (NEW) ───────────────────────────────────────────────
  "p3.home_title":                 { fr: "Maîtrise d'Ouvrage Déléguée",                                                ar: "إدارة المشروع المفوضة",                                                              en: "Delegated Project Management" },
  "p3.home_subtitle":              { fr: "CITURBAREA orchestre vos entreprises, BET, BC. Paiements via escrow plateforme. 10% du coût de réalisation.", ar: "CITURBAREA تنسق مع مقاولاتك ومكاتب الدراسات. مدفوعات عبر ضمان المنصة. 10٪ من تكلفة الإنجاز.", en: "CITURBAREA orchestrates your contractors, design offices, control bureau. Payments via platform escrow. 10% of construction cost." },
  "p3.corps_metiers_title":        { fr: "Corps de métiers à coordonner",                                              ar: "الحرف المراد تنسيقها",                                                               en: "Trades to coordinate" },
  "p3.corps_metiers_sub":          { fr: "Sélectionnez les corps d'état impliqués.",                                  ar: "اختر الحرف المعنية.",                                                                en: "Select the involved trades." },
  "p3.escrow_notice_full":         { fr: "Tous les paiements aux entreprises transitent par le compte séquestre CITURBAREA. Aucun paiement direct entre vous et les corps de métier — protection totale.", ar: "كل المدفوعات للمقاولات تمر عبر حساب الضمان CITURBAREA. لا دفع مباشر بينك وبين الحرف — حماية كاملة.", en: "All contractor payments go through CITURBAREA escrow. No direct payment between you and trades — total protection." },
  "p3.intervention_modes":         { fr: "Modes d'intervention",                                                       ar: "أنماط التدخل",                                                                       en: "Intervention modes" },
  "p3.mode_onsite":                { fr: "Suivi physique sur site",                                                    ar: "متابعة ميدانية بالموقع",                                                            en: "On-site physical monitoring" },
  "p3.mode_remote":                { fr: "Suivi à distance (MRE)",                                                     ar: "متابعة عن بُعد (مغاربة العالم)",                                                    en: "Remote monitoring (MRE)" },
  "p3.mode_hybrid":                { fr: "Hybride (visites + photos)",                                                 ar: "مختلط (زيارات + صور)",                                                              en: "Hybrid (visits + photos)" },
  "p3.coordination_count":         { fr: "{n} corps de métier sélectionnés pour coordination.",                       ar: "{n} حرف مختارة للتنسيق.",                                                            en: "{n} trades selected for coordination." },
  "p3.contract_mod":               { fr: "Contrat MOD à signer",                                                       ar: "عقد إدارة المشروع المفوضة للتوقيع",                                                  en: "DPM contract to sign" },
  "p3.acompte_demarrage":          { fr: "Acompte de démarrage",                                                        ar: "تسبيق الانطلاق",                                                                     en: "Startup down payment" },

  // ─── P4 (Foncier) (NEW) ───────────────────────────────────────────
  "p4.home_title":                 { fr: "Analyse foncière",                                                            ar: "تحليل عقاري",                                                                       en: "Land analysis" },
  "p4.home_subtitle":              { fr: "Rapport exclusif CITURBAREA · Décision Go/No-Go · 3 niveaux d'analyse",     ar: "تقرير حصري CITURBAREA · قرار قبول/رفض · 3 مستويات تحليل",                            en: "CITURBAREA exclusive report · Go/No-Go decision · 3 analysis levels" },
  "p4.packs.basique.label":        { fr: "Pack BASIQUE",                                                                ar: "باقة أساسية",                                                                       en: "BASIC pack" },
  "p4.packs.basique.short":        { fr: "Carte cadastrale, zonage urbanistique, surface et limites.",                ar: "خريطة عقارية، تقسيم تعميري، مساحة وحدود.",                                          en: "Cadastral map, urban zoning, area and boundaries." },
  "p4.packs.moyen.label":          { fr: "Pack MOYEN",                                                                  ar: "باقة متوسطة",                                                                       en: "MEDIUM pack" },
  "p4.packs.moyen.short":          { fr: "BASIQUE + simulation constructibilité + estimation prix marché.",            ar: "الأساسية + محاكاة قابلية البناء + تقدير سعر السوق.",                                 en: "BASIC + buildability simulation + market price estimate." },
  "p4.packs.rentabilite.label":    { fr: "Pack RENTABILITÉ",                                                            ar: "باقة المردودية",                                                                    en: "PROFITABILITY pack" },
  "p4.packs.rentabilite.short":    { fr: "MOYEN + scénarios de valorisation + ROI projet + recommandations.",         ar: "المتوسطة + سيناريوهات التثمين + مردودية المشروع + توصيات.",                          en: "MEDIUM + valuation scenarios + project ROI + recommendations." },
  "p4.watermark_notice_full":      { fr: "Le rapport vous sera livré en PDF watermarqué CITURBAREA après confirmation du paiement. Utilisation strictement sur autorisation écrite préalable.", ar: "سيُسلم التقرير في PDF بعلامة مائية CITURBAREA بعد تأكيد الدفع. الاستخدام حصرا بإذن مكتوب مسبق.", en: "Report delivered as CITURBAREA-watermarked PDF after payment confirmation. Use strictly subject to prior written authorization." },
  "p4.titre_foncier_label":        { fr: "Titre foncier (n°)",                                                          ar: "الرسم العقاري (رقم)",                                                               en: "Land title (no.)" },
  "p4.prix_vente_label":           { fr: "Prix de vente / acquisition cible (DH)",                                     ar: "سعر البيع / الاقتناء المستهدف (درهم)",                                              en: "Target sale / acquisition price (MAD)" },
  "p4.delivery_days":              { fr: "livraison {n} j",                                                             ar: "تسليم {n} يوم",                                                                      en: "delivery in {n} days" },

  // ─── P5 (Rapports) (NEW) ──────────────────────────────────────────
  "p5.home_title":                 { fr: "Rapports & expertises",                                                       ar: "تقارير وخبرات",                                                                      en: "Reports & expertise" },
  "p5.home_subtitle":              { fr: "Le rapport qui sécurise votre décision d'investissement.",                  ar: "التقرير الذي يؤمّن قرارك الاستثماري.",                                              en: "The report that secures your investment decision." },
  "p5.report.estimation_label":    { fr: "Estimation Express",                                                          ar: "تقدير سريع",                                                                         en: "Express valuation" },
  "p5.report.expertise_prix":      { fr: "Rapport Expertise Prix",                                                     ar: "تقرير خبرة الأسعار",                                                                en: "Price expertise report" },
  "p5.report.expertise_urba":      { fr: "Rapport Expertise Urbanistique",                                             ar: "تقرير الخبرة التعميرية",                                                            en: "Urban expertise report" },
  "p5.report.ready_to_invest":     { fr: "Rapport Complet Premium",                                                    ar: "تقرير كامل ممتاز",                                                                  en: "Complete premium report" },
  "p5.surface_label":              { fr: "Surface (m²)",                                                                ar: "المساحة (م²)",                                                                       en: "Area (m²)" },
  "p5.delay_label":                { fr: "Délai de livraison",                                                          ar: "أجل التسليم",                                                                       en: "Delivery time" },
  "p5.delay_express":              { fr: "Express — 5 jours ouvrables",                                                ar: "سريع — 5 أيام عمل",                                                                 en: "Express — 5 working days" },
  "p5.delay_standard":             { fr: "Standard — délai recommandé",                                                 ar: "عادي — الأجل الموصى به",                                                            en: "Standard — recommended" },
  "p5.delay_economique":           { fr: "Économique — 30 jours ouvrables",                                            ar: "اقتصادي — 30 يوم عمل",                                                              en: "Economy — 30 working days" },
  "p5.bankable_notice":            { fr: "Livrable PDF signé, opposable, prêt à présenter à votre banque ou investisseur.", ar: "PDF موقع، قابل للاحتجاج، جاهز للتقديم للبنك أو المستثمر.",                          en: "Signed PDF, enforceable, ready for bank or investor presentation." },
  "p5.start_qualification":        { fr: "Démarrer ma qualification",                                                  ar: "ابدأ تأهيل ملفي",                                                                   en: "Start my qualification" },
  "p5.who_are_you":                { fr: "Qui êtes-vous ?",                                                              ar: "من أنت؟",                                                                            en: "Who are you?" },
  "p5.moa_physique":               { fr: "Personne physique",                                                          ar: "شخص ذاتي",                                                                          en: "Individual" },
  "p5.moa_morale":                 { fr: "Personne morale",                                                            ar: "شخص اعتباري",                                                                       en: "Legal entity" },
  "p5.location_bien":              { fr: "Localisation du bien",                                                       ar: "موقع الملك",                                                                         en: "Property location" },
  "p5.address_detail":             { fr: "Adresse précise du bien (optionnel)",                                        ar: "العنوان الدقيق للملك (اختياري)",                                                    en: "Precise property address (optional)" },

  // ─── P6 (Prestataires) (NEW) ──────────────────────────────────────
  "p6.home_title":                 { fr: "Réseau prestataires & fournisseurs",                                         ar: "شبكة مزودي الخدمات والموردين",                                                       en: "Service providers & suppliers network" },
  "p6.home_subtitle":              { fr: "Annuaire professionnels BTP qualifiés par CITURBAREA L7.",                  ar: "دليل محترفي البناء المؤهلين عبر CITURBAREA L7.",                                    en: "Construction professionals directory, qualified by CITURBAREA L7." },
  "p6.score_l7":                   { fr: "Score CITURBAREA L7 (0-100)",                                                ar: "نقاط CITURBAREA L7 (0-100)",                                                         en: "CITURBAREA L7 score (0-100)" },
  "p6.catalog_search":             { fr: "Rechercher dans le catalogue",                                                ar: "البحث في الكتالوج",                                                                  en: "Search the catalog" },
  "p6.badge_verified":             { fr: "Vérifié CITURBAREA",                                                          ar: "موثق CITURBAREA",                                                                   en: "CITURBAREA verified" },
  "p6.badge_qualified":            { fr: "Qualifié",                                                                    ar: "مؤهل",                                                                              en: "Qualified" },
  "p6.badge_blacklisted":          { fr: "Blacklisté",                                                                  ar: "محظور",                                                                              en: "Blacklisted" },
  "p6.classes_btp":                { fr: "Classifications BTP",                                                         ar: "تصنيفات البناء والأشغال العمومية",                                                  en: "Construction classifications" },
  "p6.categories_agrement":        { fr: "Catégories d'agrément",                                                       ar: "فئات الاعتماد",                                                                     en: "Approval categories" },
  "p6.request_intervention":       { fr: "Demander une intervention",                                                  ar: "طلب التدخل",                                                                        en: "Request intervention" },

  // ─── Cercles (NEW) ────────────────────────────────────────────────
  "cercles.home_title":            { fr: "Réseau CITURBAREA Cercles",                                                  ar: "شبكة CITURBAREA Cercles",                                                            en: "CITURBAREA Cercles Network" },
  "cercles.home_subtitle":         { fr: "Le réseau social professionnel du BTP au Maroc.",                            ar: "الشبكة الاجتماعية المهنية لقطاع البناء بالمغرب.",                                   en: "Morocco's construction professional social network." },
  "cercles.feed_compose_placeholder": { fr: "Partager une mise à jour, une opportunité ou une question technique…",   ar: "شارك تحديثا أو فرصة أو سؤالا تقنيا…",                                              en: "Share an update, opportunity or technical question…" },
  "cercles.feed_publish":          { fr: "Publier",                                                                     ar: "نشر",                                                                                en: "Post" },
  "cercles.marketplace_title":     { fr: "Marketplace matériaux",                                                       ar: "سوق المواد",                                                                         en: "Materials marketplace" },
  "cercles.marketplace_sub":       { fr: "Catalogues fournisseurs + comparateur de prix régionaux.",                  ar: "كتالوجات الموردين + مقارن أسعار جهوي.",                                              en: "Supplier catalogs + regional price comparator." },
  "cercles.annuaire_title":        { fr: "Annuaire pro",                                                                ar: "الدليل المهني",                                                                      en: "Pro directory" },
  "cercles.annuaire_sub":          { fr: "Architectes, bureaux d'études, topographes, laboratoires, fournisseurs.",   ar: "مهندسون معماريون، مكاتب دراسات، طوبوغرافيون، مختبرات، موردون.",                       en: "Architects, design offices, surveyors, laboratories, suppliers." },
  "cercles.profile_edit":          { fr: "Modifier mon profil",                                                         ar: "تعديل ملفي",                                                                         en: "Edit my profile" },
  "cercles.dm_send":                { fr: "Envoyer un message",                                                         ar: "إرسال رسالة",                                                                       en: "Send a message" },
  "cercles.dm_new":                { fr: "Nouveau message",                                                             ar: "رسالة جديدة",                                                                       en: "New message" },
  "cercles.visio_join":            { fr: "Rejoindre la visio",                                                          ar: "الانضمام إلى الاجتماع المرئي",                                                       en: "Join video call" },
  "cercles.visio_start":           { fr: "Démarrer une visioconférence",                                                ar: "بدء اجتماع مرئي",                                                                   en: "Start a video conference" },
  "cercles.search_pros":           { fr: "Rechercher un professionnel",                                                ar: "البحث عن محترف",                                                                    en: "Search a professional" },
  "cercles.filter_region":         { fr: "Filtrer par région",                                                          ar: "تصفية حسب الجهة",                                                                    en: "Filter by region" },
  "cercles.filter_specialty":      { fr: "Filtrer par spécialité",                                                     ar: "تصفية حسب التخصص",                                                                 en: "Filter by specialty" },
  "cercles.post_like":             { fr: "J'aime",                                                                      ar: "إعجاب",                                                                              en: "Like" },
  "cercles.post_comment":          { fr: "Commenter",                                                                   ar: "تعليق",                                                                              en: "Comment" },
  "cercles.post_share":            { fr: "Partager",                                                                    ar: "مشاركة",                                                                            en: "Share" },
  "cercles.notifications":         { fr: "Notifications",                                                               ar: "الإشعارات",                                                                         en: "Notifications" },
  "cercles.empty_feed":            { fr: "Aucune publication dans votre fil pour le moment.",                          ar: "لا توجد منشورات في خطك حاليا.",                                                     en: "No posts in your feed yet." },
  "cercles.empty_dms":             { fr: "Aucun message — démarrez une conversation.",                                ar: "لا رسائل — ابدأ محادثة.",                                                            en: "No messages — start a conversation." },
  "cercles.empty_directory":       { fr: "Aucun professionnel ne correspond à vos critères.",                          ar: "لا يوجد محترف يطابق معاييرك.",                                                       en: "No professional matches your criteria." },
  "cercles.profile_specialty":     { fr: "Spécialité",                                                                  ar: "التخصص",                                                                             en: "Specialty" },
  "cercles.profile_company":       { fr: "Société",                                                                     ar: "الشركة",                                                                             en: "Company" },
  "cercles.profile_city":          { fr: "Ville",                                                                       ar: "المدينة",                                                                            en: "City" },
  "cercles.profile_bio":           { fr: "Bio professionnelle",                                                         ar: "السيرة المهنية",                                                                     en: "Professional bio" },
  "cercles.profile_save":          { fr: "Enregistrer mon profil",                                                     ar: "حفظ ملفي",                                                                          en: "Save my profile" },
  "cercles.marketplace_add":       { fr: "Ajouter un produit",                                                          ar: "إضافة منتج",                                                                         en: "Add a product" },
  "cercles.marketplace_stock":     { fr: "Stock disponible",                                                            ar: "المخزون المتوفر",                                                                   en: "Available stock" },
  "cercles.marketplace_contact":   { fr: "Contacter le fournisseur",                                                    ar: "الاتصال بالمورد",                                                                   en: "Contact supplier" },

  // ─── CC (Command Center) (NEW) ────────────────────────────────────
  "cc.dashboard":                  { fr: "Tableau de bord",                                                              ar: "لوحة التحكم",                                                                       en: "Dashboard" },
  "cc.leads.table.col_name":       { fr: "Nom",                                                                          ar: "الاسم",                                                                              en: "Name" },
  "cc.leads.table.col_phone":      { fr: "Téléphone",                                                                    ar: "الهاتف",                                                                             en: "Phone" },
  "cc.leads.table.col_porte":      { fr: "Porte",                                                                        ar: "البوابة",                                                                            en: "Porte" },
  "cc.leads.table.col_status":     { fr: "Statut",                                                                        ar: "الحالة",                                                                             en: "Status" },
  "cc.leads.table.col_created":    { fr: "Créé le",                                                                      ar: "تاريخ الإنشاء",                                                                      en: "Created" },
  "cc.leads.status.new":           { fr: "Nouveau",                                                                       ar: "جديد",                                                                               en: "New" },
  "cc.leads.status.qualified":     { fr: "Qualifié",                                                                     ar: "مؤهل",                                                                              en: "Qualified" },
  "cc.leads.status.contacted":     { fr: "Contacté",                                                                     ar: "تم الاتصال",                                                                        en: "Contacted" },
  "cc.leads.status.converted":     { fr: "Converti",                                                                     ar: "محوّل",                                                                              en: "Converted" },
  "cc.leads.status.lost":          { fr: "Perdu",                                                                        ar: "ضائع",                                                                              en: "Lost" },
  "cc.dossiers.action.force_status": { fr: "Forcer le statut",                                                          ar: "فرض الحالة",                                                                        en: "Force status" },
  "cc.dossiers.action.unblock":    { fr: "Débloquer",                                                                    ar: "إزالة الحجب",                                                                       en: "Unblock" },
  "cc.dossiers.action.note_ops":   { fr: "Note OPS",                                                                     ar: "ملاحظة OPS",                                                                        en: "OPS note" },
  "cc.dossiers.action.shadow":     { fr: "Vue Shadow",                                                                   ar: "عرض الظل",                                                                          en: "Shadow view" },
  "cc.validations.pack_pending":   { fr: "Packs en attente de validation",                                              ar: "باقات في انتظار التحقق",                                                            en: "Packs pending validation" },
  "cc.validations.p6_pending":     { fr: "Prestataires P6 en attente",                                                   ar: "مزودو P6 في الانتظار",                                                              en: "P6 providers pending" },
  "cc.validations.mark_paid":      { fr: "Marquer payé",                                                                 ar: "تأشير كمدفوع",                                                                      en: "Mark paid" },
  "cc.validations.activate":       { fr: "Activer",                                                                      ar: "تفعيل",                                                                              en: "Activate" },
  "cc.validations.revoke":         { fr: "Révoquer",                                                                     ar: "إبطال",                                                                              en: "Revoke" },
  "cc.validations.verify":         { fr: "Vérifier",                                                                     ar: "تحقق",                                                                              en: "Verify" },
  "cc.validations.blacklist":      { fr: "Blacklister",                                                                  ar: "حظر",                                                                                en: "Blacklist" },
  "cc.validations.needs_docs":     { fr: "Documents manquants",                                                          ar: "وثائق ناقصة",                                                                       en: "Missing documents" },
  "cc.contracts.cnoa_visa":        { fr: "Visa CROA",                                                                    ar: "تأشيرة CROA",                                                                       en: "CROA visa" },
  "cc.contracts.universal":        { fr: "Contrat universel",                                                            ar: "عقد شامل",                                                                          en: "Universal contract" },
  "cc.report.watermarked":         { fr: "Rapport watermarqué",                                                          ar: "تقرير بعلامة مائية",                                                                en: "Watermarked report" },
  "cc.report.generate":            { fr: "Générer le rapport",                                                            ar: "إنشاء التقرير",                                                                      en: "Generate report" },

  // ─── Materiaux extensions (NEW) ───────────────────────────────────
  "materiaux.catalog_subtitle":    { fr: "Prix de référence par région et par catégorie — observations terrain mises à jour quotidiennement.", ar: "أسعار مرجعية حسب الجهة والصنف — ملاحظات ميدانية تحدث يوميا.",                       en: "Reference prices by region and category — field observations updated daily." },
  "materiaux.region_select":       { fr: "Sélectionner une région",                                                     ar: "اختر جهة",                                                                          en: "Select a region" },
  "materiaux.search_placeholder_advanced": { fr: "Rechercher par catégorie, marque, code (ciment Lafarge, acier TOR HA12…)", ar: "البحث حسب الصنف، العلامة، الرمز (إسمنت لافارج، فولاذ TOR HA12…)",                en: "Search by category, brand, code (Lafarge cement, HA12 rebar…)" },
  "materiaux.compare_button":      { fr: "Comparer ce prix",                                                              ar: "مقارنة هذا السعر",                                                                  en: "Compare this price" },
  "materiaux.observe_button":      { fr: "Saisir une observation terrain",                                              ar: "إدخال ملاحظة ميدانية",                                                              en: "Submit a field observation" },

  // ─── Prestataire tarifs (NEW) ─────────────────────────────────────
  "prestataire.tarifs_list_title":  { fr: "Liste des tarifs contractuels",                                              ar: "قائمة الأسعار التعاقدية",                                                            en: "Contractual rates list" },
  "prestataire.tarifs_no_results":  { fr: "Aucun tarif ne correspond à votre filtre.",                                  ar: "لا توجد تعريفة تطابق معاييرك.",                                                     en: "No rates match your filter." },
  "prestataire.tarifs_filter_zone": { fr: "Filtrer par zone d'intervention",                                            ar: "تصفية حسب منطقة التدخل",                                                            en: "Filter by service area" },
  "prestataire.tarifs_validated":   { fr: "Validé par CITURBAREA",                                                       ar: "موثق من طرف CITURBAREA",                                                            en: "Validated by CITURBAREA" },
  "prestataire.tarifs_warranty":    { fr: "Garantie {months} mois",                                                     ar: "ضمان {months} شهرا",                                                                en: "{months}-month warranty" },
  "prestataire.tarifs_delay":       { fr: "Délai d'intervention : {days} jours",                                       ar: "أجل التدخل: {days} يوما",                                                            en: "Service delay: {days} days" },
  "prestataire.request_quote":      { fr: "Demander un devis",                                                          ar: "طلب عرض سعر",                                                                       en: "Request a quote" },
  "prestataire.view_profile":       { fr: "Voir le profil",                                                              ar: "عرض الملف",                                                                          en: "View profile" },

  // ─── Calendar extension (NEW) ─────────────────────────────────────
  "cal.milestone_label":            { fr: "Jalon clé",                                                                   ar: "مرحلة فاصلة رئيسية",                                                                 en: "Key milestone" },
  "cal.dependencies_label":         { fr: "Dépendances",                                                                 ar: "التبعيات",                                                                           en: "Dependencies" },
  "cal.start_date":                 { fr: "Date de début",                                                               ar: "تاريخ البدء",                                                                       en: "Start date" },
  "cal.end_date":                   { fr: "Date de fin",                                                                 ar: "تاريخ الانتهاء",                                                                    en: "End date" },
  "cal.duration_total":             { fr: "Durée totale du projet",                                                     ar: "المدة الإجمالية للمشروع",                                                            en: "Total project duration" },
  "cal.progress":                   { fr: "Avancement",                                                                  ar: "التقدم",                                                                             en: "Progress" },
  "cal.assign_member":              { fr: "Assigner un membre",                                                          ar: "تعيين عضو",                                                                          en: "Assign a member" },
  "cal.add_dependency":             { fr: "Ajouter une dépendance",                                                     ar: "إضافة تبعية",                                                                       en: "Add a dependency" },
  "cal.export_pdf":                 { fr: "Exporter en PDF",                                                              ar: "تصدير PDF",                                                                          en: "Export as PDF" },

  // ─── PV extension (NEW) ───────────────────────────────────────────
  "pv.composer_observation_placeholder": { fr: "Décrire l'observation — préciser le lot, la zone, la conformité…",     ar: "وصف الملاحظة — حدد القسم، المنطقة، المطابقة…",                                       en: "Describe the observation — lot, zone, compliance…" },
  "pv.decision_pending":            { fr: "Décision en attente",                                                         ar: "القرار قيد الانتظار",                                                                en: "Decision pending" },
  "pv.upload_photo":                { fr: "Téléverser photo",                                                            ar: "رفع صورة",                                                                          en: "Upload photo" },
  "pv.add_reserve":                 { fr: "Ajouter une réserve",                                                          ar: "إضافة تحفظ",                                                                        en: "Add a reserve" },
  "pv.lot_label":                   { fr: "Lot",                                                                          ar: "القسم",                                                                              en: "Lot" },
  "pv.attendees_role":              { fr: "Rôle du participant",                                                          ar: "دور المشارك",                                                                       en: "Attendee role" },
  "pv.weather_sunny":               { fr: "Ensoleillé",                                                                  ar: "مشمس",                                                                              en: "Sunny" },
  "pv.weather_cloudy":              { fr: "Nuageux",                                                                     ar: "غائم",                                                                              en: "Cloudy" },
  "pv.weather_rainy":               { fr: "Pluvieux",                                                                    ar: "ممطر",                                                                              en: "Rainy" },
  "pv.weather_windy":               { fr: "Venteux",                                                                     ar: "عاصف",                                                                              en: "Windy" },

  // ─── Interact extension (NEW) ─────────────────────────────────────
  "interact.audio_recording":       { fr: "Enregistrement en cours…",                                                    ar: "جارٍ التسجيل…",                                                                      en: "Recording…" },
  "interact.audio_send":            { fr: "Envoyer la note vocale",                                                     ar: "إرسال الملاحظة الصوتية",                                                            en: "Send voice note" },
  "interact.audio_cancel":          { fr: "Annuler l'enregistrement",                                                   ar: "إلغاء التسجيل",                                                                      en: "Cancel recording" },
  "interact.mentions_search_placeholder": { fr: "Rechercher un membre à mentionner…",                                  ar: "البحث عن عضو للإشارة إليه…",                                                       en: "Search for a member to mention…" },
  "interact.attach_size_max":       { fr: "Taille maximale 20 Mo",                                                       ar: "الحجم الأقصى 20 ميغابايت",                                                          en: "Maximum size 20 MB" },
  "interact.attach_uploading":      { fr: "Téléversement…",                                                              ar: "جارٍ الرفع…",                                                                        en: "Uploading…" },
  "interact.pin_action":            { fr: "Épingler à l'en-tête du dossier",                                            ar: "تثبيت في أعلى الملف",                                                                en: "Pin to file header" },
  "interact.delete_confirm":        { fr: "Supprimer ce message ?",                                                     ar: "هل تريد حذف هذه الرسالة؟",                                                          en: "Delete this message?" },

  // ─── Payment (NEW) ────────────────────────────────────────────────
  "payment.start_title":            { fr: "Paiement sécurisé",                                                           ar: "دفع آمن",                                                                            en: "Secure payment" },
  "payment.start_subtitle":         { fr: "Vous allez être redirigé vers Stripe pour finaliser votre paiement.",        ar: "ستتم إعادة توجيهك إلى Stripe لإتمام الدفع.",                                        en: "You will be redirected to Stripe to complete your payment." },
  "payment.success_title":          { fr: "Paiement reçu",                                                                ar: "تم استلام الدفع",                                                                    en: "Payment received" },
  "payment.success_sub":            { fr: "Votre paiement a été confirmé. Vous recevrez une notification dès activation du pack.", ar: "تم تأكيد الدفع. ستصلك إشعار بمجرد تفعيل الباقة.",                                    en: "Your payment is confirmed. You'll be notified once the pack is activated." },
  "payment.cancel_title":           { fr: "Paiement annulé",                                                              ar: "تم إلغاء الدفع",                                                                    en: "Payment cancelled" },
  "payment.cancel_sub":             { fr: "Vous pouvez réessayer le paiement depuis votre espace dossier.",             ar: "يمكنك إعادة المحاولة من فضاء ملفك.",                                                en: "You may retry the payment from your file space." },
  "payment.processing":             { fr: "Traitement en cours…",                                                       ar: "قيد المعالجة…",                                                                      en: "Processing…" },
  "payment.amount_due":             { fr: "Montant à régler",                                                             ar: "المبلغ الواجب دفعه",                                                                en: "Amount due" },
  "payment.back_dossier":           { fr: "Retour au dossier",                                                            ar: "العودة إلى الملف",                                                                  en: "Back to file" },
  "payment.error_generic":          { fr: "Erreur lors du paiement. Réessayez ou contactez le support.",                ar: "خطأ في الدفع. أعد المحاولة أو اتصل بالدعم.",                                        en: "Payment error. Try again or contact support." },

  // ─── Common buttons / labels (NEW) ────────────────────────────────
  "common.continue":                { fr: "Continuer",                                                                    ar: "متابعة",                                                                             en: "Continue" },
  "common.submit":                  { fr: "Soumettre",                                                                    ar: "إرسال",                                                                              en: "Submit" },
  "common.delete":                  { fr: "Supprimer",                                                                    ar: "حذف",                                                                                en: "Delete" },
  "common.edit":                    { fr: "Modifier",                                                                     ar: "تعديل",                                                                              en: "Edit" },
  "common.view":                    { fr: "Voir",                                                                         ar: "عرض",                                                                                en: "View" },
  "common.close":                   { fr: "Fermer",                                                                       ar: "إغلاق",                                                                              en: "Close" },
  "common.open":                    { fr: "Ouvrir",                                                                       ar: "فتح",                                                                                en: "Open" },
  "common.yes":                     { fr: "Oui",                                                                          ar: "نعم",                                                                                en: "Yes" },
  "common.no":                      { fr: "Non",                                                                          ar: "لا",                                                                                 en: "No" },
  "common.optional":                { fr: "Optionnel",                                                                    ar: "اختياري",                                                                            en: "Optional" },
  "common.required_short":          { fr: "*",                                                                            ar: "*",                                                                                  en: "*" },
  "common.placeholder_phone":       { fr: "+212 6XX XXX XXX",                                                            ar: "+212 6XX XXX XXX",                                                                  en: "+212 6XX XXX XXX" },
  "common.placeholder_email":       { fr: "vous@exemple.ma",                                                              ar: "you@example.ma",                                                                    en: "you@example.com" },
  "common.placeholder_name":        { fr: "Prénom Nom",                                                                   ar: "الاسم اللقب",                                                                       en: "First Last" },
  "common.welcome":                 { fr: "Bienvenue",                                                                    ar: "مرحبا",                                                                              en: "Welcome" },
  "common.see_more":                { fr: "Voir plus",                                                                    ar: "عرض المزيد",                                                                         en: "See more" },
  "common.see_all":                 { fr: "Tout voir",                                                                    ar: "عرض الكل",                                                                          en: "See all" },
  "common.coming_soon":             { fr: "Bientôt disponible",                                                          ar: "قريبا",                                                                              en: "Coming soon" },
};

type I18nContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectInitialLang());

  const applyLang = useCallback((l: Lang) => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
      document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    }
    try { localStorage.setItem(LS_KEY, l); } catch { /* ignore */ }
  }, []);

  // Apply on mount + on each change
  useEffect(() => {
    applyLang(lang);
  }, [lang, applyLang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    applyLang(l);
  }, [applyLang]);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    const entry = DICT[key];
    if (!entry) {
      // Si la clé n'existe pas, retourne la clé elle-même (visible pendant dev)
      return key;
    }
    let str = entry[lang] || entry.fr || key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return str;
  }, [lang]);

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLang(): { lang: Lang; setLang: (l: Lang) => void } {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback non-throwing pour composants en dehors du Provider
    return { lang: "fr", setLang: () => {} };
  }
  return { lang: ctx.lang, setLang: ctx.setLang };
}

export function useT(): (key: string, vars?: Record<string, string | number>) => string {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return (key: string) => {
      const entry = DICT[key];
      return entry?.fr ?? key;
    };
  }
  return ctx.t;
}

// Helper standalone (utilisable dans des contextes non-React, ex: inline scripts)
export function getCurrentLang(): Lang {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved === "fr" || saved === "ar" || saved === "en") return saved;
  } catch { /* ignore */ }
  return "fr";
}
