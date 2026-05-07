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
