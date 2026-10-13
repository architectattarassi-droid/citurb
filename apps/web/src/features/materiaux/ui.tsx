/** Composants communs de la matériauthèque (mobile d'abord, RTL : propriétés logiques uniquement). */
import React from "react";
import { UNITES_REF, type MaterialRef } from "../../domain/materiaux/types";
import { prixReference, prixTTC, type FiabilitePublique } from "../../domain/materiaux/reference";
import type { Marche } from "../../domain/materiaux/marche";
import type { T } from "./textes";

export const fmtDH = (n: number, lang = "fr") =>
  `${n.toLocaleString(lang === "ar" ? "fr-MA" : lang === "en" ? "en-US" : "fr-FR", { maximumFractionDigits: n >= 100 ? 0 : 2, minimumFractionDigits: n < 100 && n % 1 ? 2 : 0 })} DH`;

/** Libellé court de l'unité de référence (m³, m², ml, kg…). */
export const uniteCourte = (u: string) => ({ m3: "m³", m2: "m²", l: "L", ens: "ens." } as Record<string, string>)[u] || u;
export const uniteLongue = (u: string) => (UNITES_REF as Record<string, string>)[u] || u;

const COULEUR: Record<FiabilitePublique, string> = {
  A: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  B: "bg-sky-100 text-sky-800 ring-sky-300",
  C: "bg-amber-100 text-amber-900 ring-amber-300",
};

export function BadgeFiabilite({ f, t, court }: { f: FiabilitePublique; t: T; court?: boolean }) {
  return (
    <span title={t("fiabAide")} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${COULEUR[f]}`}>
      {court ? f : t(`fiab_${f}` as Parameters<T>[0])}
    </span>
  );
}

/** Prix affiché d'un matériau : mise à jour manuelle du back-office si présente, sinon référence. */
export function prixAffiche(code: string, manuel?: { min: number; ref: number; max: number } | null, coef = 1) {
  const p = prixReference(code)!;
  const b = manuel || p;
  const r = (x: number) => (x * coef >= 100 ? Math.round(x * coef) : Math.round(x * coef * 100) / 100);
  return { min: r(b.min), ref: r(b.ref), max: r(b.max), fiabilite: (manuel ? "B" : p.fiabilite) as FiabilitePublique, date: p.date };
}

/** Bloc prix : référence HT/TTC par uniteRef, équivalent en unité de vente principale, médiane fournisseurs. */
export function BlocPrix({ r, prix, marche, t, lang, grand }: {
  r: MaterialRef; prix: ReturnType<typeof prixAffiche>; marche?: Marche | null; t: T; lang: string; grand?: boolean;
}) {
  const vente = r.ventes[0];
  return (
    <div>
      <p className={`${grand ? "text-3xl" : "text-xl"} font-bold text-[#0B1B3A]`}>
        {fmtDH(prix.ref, lang)} <span className="text-sm font-semibold text-slate-500">{t("ht")} / {uniteCourte(r.uniteRef)}</span>
      </p>
      <p className="text-xs text-slate-500">
        {fmtDH(prixTTC(prix.ref), lang)} {t("ttc")} · {t("fourchette")} {fmtDH(prix.min, lang)} – {fmtDH(prix.max, lang)}
      </p>
      {vente && (
        <p className="mt-0.5 text-sm text-slate-700">
          {t("soit")} <strong>{fmtDH(Math.round(prix.ref * vente.facteur * 100) / 100, lang)}</strong> {t("ht")} / {vente.libelle.toLowerCase()}
        </p>
      )}
      {marche?.fiabilite === "A" && marche.mediane != null ? (
        <p className="mt-1 rounded-md bg-emerald-50 px-2 py-1 text-sm text-emerald-900">
          <strong>{fmtDH(marche.mediane, lang)}</strong> {t("ht")} / {uniteCourte(r.uniteRef)} · {t("medianeFournisseurs", { n: marche.nbFournisseurs })}
        </p>
      ) : (
        <p className="mt-1 text-xs font-medium text-slate-500">{t("indicatif")}</p>
      )}
    </div>
  );
}

export function Bientot({ t }: { t: T }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
      <p className="font-semibold text-[#0B1B3A]">🛒 {t("commanderBientot")}</p>
      <p className="mt-1">{t("commanderBientotAide")}</p>
    </div>
  );
}
