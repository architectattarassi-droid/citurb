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
