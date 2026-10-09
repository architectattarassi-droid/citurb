/**
 * RoiCalculator.tsx
 *
 * Calculateur public ROI / coût projet ("Ma villa R+1 à Bouskoura coûte
 * combien clé en main ?").
 *
 * Étapes :
 *  1. Type projet (villa, R+1, R+2, immeuble, lotissement, commerce)
 *  2. Ville (Casa, Rabat, Marrakech, Tanger, Bouskoura, Salé, Témara, …)
 *  3. Surface (m²)
 *  4. Standing (économique, moyen, haut de gamme)
 *
 * Calcul fourchette MAD = surface × prix m² × coef ville × coef standing.
 *
 * CTA "Recevoir le détail par email" → LeadCaptureForm pré-rempli
 * (source = WEB_ROI_CALC, surface + budget remontés).
 *
 * Mobile-first, sans dépendance externe (graphique en SVG simple).
 */

import React, { useMemo, useState } from "react";
import { useT, useLang } from "../../i18n/i18n";
import LeadCaptureForm from "./LeadCaptureForm";
import { coefRegional, coutM2Median } from "../../domain/prix/grille2026";
import type { Standing as GrilleStanding, TypeProjet as GrilleType } from "../../command-center/modules/dossiers/costRangesMA";

type TypeProjet =
  | "villa_rdc"
  | "villa_r1"
  | "villa_r2"
  | "immeuble"
  | "lotissement"
  | "commerce";
type Standing = "eco" | "moyen" | "haut";

/**
 * Coût/m² (base Rabat-Salé-Kénitra, HT) tiré de la grille unique
 * (domain/prix/grille2026.ts) : même chiffre que l'estimatif par lots.
 * eco = très économique, moyen = entre moyen standing et standing, haut = haut standing.
 */
function coutM2(type: TypeProjet, standing: Standing): number {
  const m = (t: GrilleType, s: GrilleStanding) => coutM2Median(t, s) ?? 0;
  const parStanding = (t: GrilleType) => ({
    eco: m(t, "ULTRA_ECO"),
    moyen: Math.round((m(t, "ECONOMIQUE") + m(t, "STANDARD")) / 2),
    haut: m(t, "STANDING"),
  })[standing];
  switch (type) {
    // Plain-pied : plus de toiture et de fondations par m² ; R+2 : un peu plus de structure.
    case "villa_rdc": return Math.round(parStanding("VIL") * 1.05);
    case "villa_r1": return parStanding("VIL");
    case "villa_r2": return Math.round(parStanding("VIL") * 1.03);
    case "immeuble": return parStanding("IMM");
    case "commerce": return parStanding("MIX");
    // Lotissement : VRD + lots aménagés, hors bâtiment (non couvert par la grille).
    case "lotissement": return { eco: 1450, moyen: 1800, haut: 2600 }[standing];
  }
}

interface Result {
  min: number;
  estim: number;
  max: number;
  delaiMois: number;
}

const formatMad = (n: number): string =>
  `${Math.round(n).toLocaleString("fr-MA")} MAD`;

const RoiCalculator: React.FC<{ className?: string }> = ({ className }) => {
  const t = useT();
  const { lang } = useLang();

  const [typeProjet, setTypeProjet] = useState<TypeProjet>("villa_r1");
  const [ville, setVille] = useState<string>("Bouskoura");
  const [surface, setSurface] = useState<number>(180);
  const [standing, setStanding] = useState<Standing>("moyen");
  const [showCapture, setShowCapture] = useState(false);

  const villes = useMemo(
    () => [
      "Casablanca",
      "Rabat",
      "Marrakech",
      "Tanger",
      "Bouskoura",
      "Salé",
      "Témara",
      "Agadir",
      "Fès",
      "Meknès",
      "Oujda",
      "Kénitra",
    ],
    [],
  );

  const result: Result = useMemo(() => {
    const estim = coutM2(typeProjet, standing) * coefRegional(ville) * Math.max(1, surface);
    const min = estim * 0.85;
    const max = estim * 1.18;
    // Délais indicatifs :
    const delaiMois =
      typeProjet === "lotissement"
        ? 18
        : typeProjet === "immeuble"
          ? 22
          : typeProjet === "commerce"
            ? 14
            : 12;
    return { min, estim, max, delaiMois };
  }, [typeProjet, ville, surface, standing]);

  /** Bar SVG simple : visualise fourchette min / estim / max. */
  const Bar = () => {
    const w = 320;
    const h = 60;
    const rng = result.max - result.min || 1;
    const posEstim = ((result.estim - result.min) / rng) * w;
    return (
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        role="img"
        aria-label={t("lead.calc.chart_alt")}
      >
        <rect x="0" y="22" width={w} height="16" rx="8" fill="#dbeafe" />
        <rect
          x="0"
          y="22"
          width={posEstim}
          height="16"
          rx="8"
          fill="url(#g1)"
        />
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <circle cx={posEstim} cy="30" r="9" fill="#1e3a8a" />
        <text x="0" y="56" fontSize="11" fill="#475569">
          {formatMad(result.min)}
        </text>
        <text x={w - 90} y="56" fontSize="11" fill="#475569">
          {formatMad(result.max)}
        </text>
      </svg>
    );
  };

  return (
    <section
      className={
        "mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 " +
        (className || "")
      }
      aria-labelledby="roi-calc-title"
    >
      <header className="mb-5">
        <h2 id="roi-calc-title" className="text-2xl font-bold text-slate-900">
          {t("lead.calc.title")}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{t("lead.calc.subtitle")}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("lead.calc.type")}
          </label>
          <select
            value={typeProjet}
            onChange={(e) => setTypeProjet(e.target.value as TypeProjet)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="villa_rdc">{t("lead.calc.t.villa_rdc")}</option>
            <option value="villa_r1">{t("lead.calc.t.villa_r1")}</option>
            <option value="villa_r2">{t("lead.calc.t.villa_r2")}</option>
            <option value="immeuble">{t("lead.calc.t.immeuble")}</option>
            <option value="lotissement">{t("lead.calc.t.lotissement")}</option>
            <option value="commerce">{t("lead.calc.t.commerce")}</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("lead.calc.ville")}
          </label>
          <select
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {villes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("lead.calc.surface")} (m²)
          </label>
          <input
            type="number"
            min={20}
            max={50000}
            step={5}
            value={surface}
            onChange={(e) => setSurface(Number(e.target.value) || 0)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("lead.calc.standing")}
          </label>
          <div className="flex gap-2">
            {(["eco", "moyen", "haut"] as Standing[]).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setStanding(s)}
                className={
                  "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition " +
                  (standing === s
                    ? "border-blue-600 bg-blue-50 text-blue-800"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400")
                }
                aria-pressed={standing === s}
              >
                {t("lead.calc.standing." + s)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-5">
        <div className="text-xs uppercase tracking-wide text-blue-700">
          {t("lead.calc.result")}
        </div>
        <div
          className="mt-1 text-3xl font-bold text-slate-900"
          aria-live="polite"
        >
          {formatMad(result.estim)}
        </div>
        <div className="mt-1 text-sm text-slate-600">
          {t("lead.calc.range", {
            min: formatMad(result.min),
            max: formatMad(result.max),
          })}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {t("lead.calc.delai")} : ~{result.delaiMois} {t("lead.calc.mois")}
        </div>
        <div className="mt-3">
          <Bar />
        </div>
        <p className="mt-2 text-[11px] italic text-slate-500">
          {t("lead.calc.disclaimer")}
        </p>
        <a
          href={`/chiffrage?type=${typeProjet === "immeuble" ? "immeuble" : typeProjet === "commerce" ? "mixte" : "villa"}&surface=${Math.round(surface)}&niveaux=${({ villa_rdc: 1, villa_r1: 2, villa_r2: 3, immeuble: 5, commerce: 5, lotissement: 2 } as Record<TypeProjet, number>)[typeProjet]}&standing=${{ eco: "ULTRA_ECO", moyen: "ECONOMIQUE", haut: "STANDING" }[standing]}&ville=${encodeURIComponent(ville)}`}
          className="mt-3 inline-block text-sm font-semibold text-blue-800 underline"
        >
          {t("lead.calc.detaille")}
        </a>
      </div>

      {!showCapture ? (
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCapture(true)}
            className="rounded-md bg-blue-700 px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {t("lead.calc.cta")}
          </button>
          <p className="text-xs text-slate-500" dir={lang === "ar" ? "rtl" : "ltr"}>
            {t("lead.calc.cta_sub")}
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <h3 className="mb-3 text-lg font-semibold text-slate-900">
            {t("lead.calc.form_title")}
          </h3>
          <LeadCaptureForm
            source="WEB_ROI_CALC"
            withEmail
            compact={false}
            porteType={typeProjet === "immeuble" || typeProjet === "lotissement" ? "P2" : "P1"}
          />
        </div>
      )}
    </section>
  );
};

export default RoiCalculator;
