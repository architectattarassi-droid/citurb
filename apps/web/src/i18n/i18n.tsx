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
 * Persistance: la langue choisie est stockée dans localStorage
 * sous "citurbarea.lang" et restaurée au reload.
 *
 * RTL: l'arabe applique automatiquement `document.documentElement.dir = "rtl"`.
 *
 * Refactor 2026-05 : le dictionnaire monolithique a été externalisé dans
 * `../locales/{fr,ar,en}/<namespace>.json` (16 namespaces). Pour ajouter ou
 * modifier une clé, éditez le JSON correspondant — ne touchez plus à ce
 * fichier. L'API publique (useT, useLang, I18nProvider, Lang) reste IDENTIQUE.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { buildDict } from "../locales";

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

/**
 * Nom de l'event broadcast à chaque changement de langue. Les composants
 * impératifs (useEffect manipulant .textContent) doivent s'y abonner pour
 * resynchroniser leurs labels sans attendre un re-render React.
 */
export const LANG_CHANGE_EVENT = "citurbarea:lang-change";

// ─────────────────────────────────────────────────────────────────
// DICTIONNAIRE — externalisé dans ../locales/{fr,ar,en}/*.json
// L'aplatissement préserve la signature historique
// Record<Key, Record<Lang, string>> pour ne casser AUCUN consommateur.
// ─────────────────────────────────────────────────────────────────
const DICT: Record<string, Record<Lang, string>> = buildDict();

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
    // Notifie les consommateurs impératifs (useEffect manipulant le DOM en
    // mode .textContent) qui ne peuvent pas réagir au re-render React.
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(LANG_CHANGE_EVENT, { detail: { lang: l } }));
      }
    } catch { /* ignore */ }
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

/**
 * tVanilla — équivalent vanilla de useT(), utilisable hors render React.
 *
 * À privilégier dans les useEffect impératifs qui mutent .textContent /
 * .innerHTML : useT() est lié au cycle de rendu et ne se met pas à jour
 * dans un closure capturé par addEventListener.
 *
 * @param key   Clé du dictionnaire (préfixée par son namespace, ex: "p1.lp.…")
 * @param vars  Variables à interpoler ({name} → value)
 * @param lang  Langue à utiliser. Omis = lit le localStorage (getStoredLang()).
 */
export function tVanilla(
  key: string,
  vars?: Record<string, string | number>,
  lang?: Lang,
): string {
  const l: Lang = lang ?? getStoredLang();
  const entry = DICT[key];
  if (!entry) return key;
  let str = entry[l] || entry.fr || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}
