/**
 * locales/index.ts — Aggregator des namespaces i18n
 *
 * Ce module importe tous les fichiers JSON (16 namespaces × 3 langues = 48 fichiers)
 * et reconstruit le DICT aplati Record<Key, Record<Lang, string>> attendu par
 * `i18n.tsx`. L'API publique de i18n (useT, useLang, I18nProvider) reste
 * inchangée — les consommateurs continuent d'appeler `t("nav.home")` avec la
 * clé complète (incluant le préfixe de namespace).
 *
 * Pour ajouter une clé : créer/éditer le fichier JSON correspondant dans
 * `locales/{fr,ar,en}/<namespace>.json`. Aucune modification de i18n.tsx
 * nécessaire.
 *
 * Pour ajouter un namespace : créer 3 fichiers JSON (fr/ar/en) + ajouter
 * 3 imports + 3 spreads ci-dessous.
 */

// ── FR ──────────────────────────────────────────────────────────────────
import frCommon from "./fr/common.json";
import frNav from "./fr/nav.json";
import frAuth from "./fr/auth.json";
import frLanding from "./fr/landing.json";
import frPortes from "./fr/portes.json";
import frCercles from "./fr/cercles.json";
import frCabinet from "./fr/cabinet.json";
import frWizard from "./fr/wizard.json";
import frForm from "./fr/form.json";
import frCc from "./fr/cc.json";
import frMateriaux from "./fr/materiaux.json";
import frPrestataire from "./fr/prestataire.json";
import frCal from "./fr/cal.json";
import frPv from "./fr/pv.json";
import frLiv from "./fr/liv.json";
import frDocs from "./fr/docs.json";
import frChantier from "./fr/chantier.json";
import frDocuments from "./fr/documents.json";
import frPermis from "./fr/permis.json";
import frRokhas from "./fr/rokhas.json";

// ── AR ──────────────────────────────────────────────────────────────────
import arCommon from "./ar/common.json";
import arNav from "./ar/nav.json";
import arAuth from "./ar/auth.json";
import arLanding from "./ar/landing.json";
import arPortes from "./ar/portes.json";
import arCercles from "./ar/cercles.json";
import arCabinet from "./ar/cabinet.json";
import arWizard from "./ar/wizard.json";
import arForm from "./ar/form.json";
import arCc from "./ar/cc.json";
import arMateriaux from "./ar/materiaux.json";
import arPrestataire from "./ar/prestataire.json";
import arCal from "./ar/cal.json";
import arPv from "./ar/pv.json";
import arLiv from "./ar/liv.json";
import arDocs from "./ar/docs.json";
import arChantier from "./ar/chantier.json";
import arDocuments from "./ar/documents.json";
import arPermis from "./ar/permis.json";
import arRokhas from "./ar/rokhas.json";

// ── EN ──────────────────────────────────────────────────────────────────
import enCommon from "./en/common.json";
import enNav from "./en/nav.json";
import enAuth from "./en/auth.json";
import enLanding from "./en/landing.json";
import enPortes from "./en/portes.json";
import enCercles from "./en/cercles.json";
import enCabinet from "./en/cabinet.json";
import enWizard from "./en/wizard.json";
import enForm from "./en/form.json";
import enCc from "./en/cc.json";
import enMateriaux from "./en/materiaux.json";
import enPrestataire from "./en/prestataire.json";
import enCal from "./en/cal.json";
import enPv from "./en/pv.json";
import enLiv from "./en/liv.json";
import enDocs from "./en/docs.json";
import enChantier from "./en/chantier.json";
import enDocuments from "./en/documents.json";
import enPermis from "./en/permis.json";
import enRokhas from "./en/rokhas.json";

export type Lang = "fr" | "ar" | "en";

type FlatNs = Record<string, string>;

const FR: FlatNs = {
  ...frCommon,
  ...frNav,
  ...frAuth,
  ...frLanding,
  ...frPortes,
  ...frCercles,
  ...frCabinet,
  ...frWizard,
  ...frForm,
  ...frCc,
  ...frMateriaux,
  ...frPrestataire,
  ...frCal,
  ...frPv,
  ...frLiv,
  ...frDocs,
  ...frChantier,
  ...frDocuments,
  ...frPermis,
  ...frRokhas,
};

const AR: FlatNs = {
  ...arCommon,
  ...arNav,
  ...arAuth,
  ...arLanding,
  ...arPortes,
  ...arCercles,
  ...arCabinet,
  ...arWizard,
  ...arForm,
  ...arCc,
  ...arMateriaux,
  ...arPrestataire,
  ...arCal,
  ...arPv,
  ...arLiv,
  ...arDocs,
  ...arChantier,
  ...arDocuments,
  ...arPermis,
  ...arRokhas,
};

const EN: FlatNs = {
  ...enCommon,
  ...enNav,
  ...enAuth,
  ...enLanding,
  ...enPortes,
  ...enCercles,
  ...enCabinet,
  ...enWizard,
  ...enForm,
  ...enCc,
  ...enMateriaux,
  ...enPrestataire,
  ...enCal,
  ...enPv,
  ...enLiv,
  ...enDocs,
  ...enChantier,
  ...enDocuments,
  ...enPermis,
  ...enRokhas,
};

/**
 * buildDict — reconstruit la structure aplie historique
 *   Record<Key, Record<Lang, string>>
 *
 * Toutes les clés de FR sont considérées comme l'ensemble canonique. Pour
 * chaque clé, AR et EN sont remplis si présents, sinon fallback FR.
 */
export function buildDict(): Record<string, Record<Lang, string>> {
  const dict: Record<string, Record<Lang, string>> = {};
  // Union des clés des trois langues (au cas où AR/EN ajoutent une clé absente
  // de FR — robustesse, ne devrait pas arriver en pratique).
  const allKeys = new Set<string>([
    ...Object.keys(FR),
    ...Object.keys(AR),
    ...Object.keys(EN),
  ]);
  for (const k of allKeys) {
    const fr = FR[k] ?? k;
    dict[k] = {
      fr,
      ar: AR[k] ?? fr,
      en: EN[k] ?? fr,
    };
  }
  return dict;
}
