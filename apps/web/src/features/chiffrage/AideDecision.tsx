/**
 * Aide à la décision : budget du client, formule d'architecte, comparaison
 * des scénarios (standing, réalisation, sous-sol, niveaux, conception) et
 * leviers pour revenir dans le budget — tous types de projets.
 */
import React, { useDeferredValue, useMemo, useState } from "react";
import { FORMULES_CONCEPTION, aideDecision, type FormuleConception, type ProjetInput } from "../../domain/chiffrage";
import type { texte } from "./textes";
import { evenement } from "../../lib/marketing";

const dh = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/\s/g, " ")} DH`;
const signe = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${dh(Math.abs(n))}`;
const BUDGET_CLE = "citurbarea:chiffrage:budget";

function lireBudget(): number {
  try { return Number(localStorage.getItem(BUDGET_CLE)) || 0; } catch { return 0; }
}

type Props = { projet: ProjetInput; onChange: (p: Partial<ProjetInput>) => void; t: ReturnType<typeof texte> };

export default function AideDecision({ projet, onChange, t }: Props) {
  const [budget, setBudget] = useState<number>(lireBudget);
  const p = useDeferredValue(projet);
  const b = useDeferredValue(budget);
  const a = useMemo(() => {
    try { return aideDecision(p, b > 0 ? b : undefined); } catch { return null; }
  }, [p, b]);

  const majBudget = (v: string) => {
    evenement("decision_aid_used", {}, true);
    const n = Number(v.replace(/[^\d]/g, ""));
    setBudget(n);
    try { localStorage.setItem(BUDGET_CLE, String(n)); } catch { /* stockage indisponible */ }
  };
  const conception = (projet.conception ?? "COMPLET") as FormuleConception;
  if (!a) return null;
  const depasse = a.budget ? a.actuel.budgetTTC - a.budget : 0;

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          {t("decisionBudget")}
          <input inputMode="numeric" value={budget ? budget.toLocaleString("fr-FR").replace(/\s/g, " ") : ""} onChange={(e) => majBudget(e.target.value)}
            placeholder="ex. 1 200 000" className="min-h-[48px] rounded-lg border border-slate-300 px-3 text-base font-normal" />
          <span className="text-xs font-normal text-slate-500">{t("decisionBudgetAide")}</span>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          {t("decisionFormule")}
          <select value={conception} onChange={(e) => onChange({ conception: e.target.value as FormuleConception })}
            className="min-h-[48px] rounded-lg border border-slate-300 bg-white px-3 text-base font-normal">
            {(Object.keys(FORMULES_CONCEPTION) as FormuleConception[]).map((f) => <option key={f} value={f}>{FORMULES_CONCEPTION[f].libelle}</option>)}
          </select>
          <span className="text-xs font-normal text-slate-500">{FORMULES_CONCEPTION[conception].description}.</span>
        </label>
      </div>

      {a.budget ? (
        <div className={`rounded-xl border p-4 text-sm ${depasse > 0 ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
          <p className="font-bold text-[#0B1B3A]">
            {depasse > 0 ? t("decisionDepasse", { montant: dh(depasse) }) : t("decisionDansBudget", { montant: dh(-depasse) })}
          </p>
          {a.meilleurStanding && !a.meilleurStanding.actuel && (
            <p className="mt-1 text-slate-700">{t("decisionMeilleur", { standing: a.meilleurStanding.libelle.toLowerCase(), montant: dh(a.meilleurStanding.budgetTTC) })}</p>
          )}
          {a.leviers.length > 0 && (
            <>
              <p className="mt-3 font-semibold text-[#0B1B3A]">{t("decisionLeviers")}</p>
              <ol className="mt-1 list-decimal pl-5 text-slate-700">
                {a.leviers.map((l) => <li key={l.libelle}>{l.libelle} : <b>{signe(-l.economie)}</b></li>)}
              </ol>
              {a.projetAjuste && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="text-slate-700">{t("decisionResultat", { montant: dh(a.projetAjuste.budgetTTC) })}{a.projetAjuste.dansBudget ? " ✓" : ` — ${t("decisionInsuffisant")}`}</span>
                  <button type="button" onClick={() => onChange(a.projetAjuste!.projet)}
                    className="min-h-[44px] rounded-lg bg-[#0B1B3A] px-4 text-sm font-semibold text-white">{t("decisionAppliquer")}</button>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-3 py-2">{t("decisionScenario")}</th><th className="px-3 py-2 text-right">{t("decisionBudgetTotal")}</th><th className="px-3 py-2 text-right">{t("decisionEcart")}</th><th className="px-3 py-2" /></tr>
          </thead>
          <tbody>
            {[a.actuel, ...a.scenarios].map((s) => {
              const ok = a.budget ? s.budgetTTC <= a.budget : null;
              return (
                <tr key={s.cle} className={`border-t border-slate-100 ${s.actuel ? "bg-[#FFF8E1] font-semibold" : ""}`}>
                  <td className="px-3 py-2">{s.libelle}{ok != null && <span className={`ml-2 text-xs ${ok ? "text-emerald-700" : "text-amber-700"}`}>{ok ? t("decisionOk") : t("decisionHors")}</span>}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{dh(s.budgetTTC)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${s.ecart < 0 ? "text-emerald-700" : s.ecart > 0 ? "text-amber-700" : ""}`}>{s.actuel ? "—" : signe(s.ecart)}</td>
                  <td className="px-3 py-2 text-right">
                    {!s.actuel && <button type="button" onClick={() => onChange(s.projet)} className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700">{t("decisionChoisir")}</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">{t("decisionNote")}</p>
    </div>
  );
}
