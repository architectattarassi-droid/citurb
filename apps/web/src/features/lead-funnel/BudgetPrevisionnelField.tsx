import React from "react";
import { useLang, useT } from "../../i18n/i18n";
import { tranchesBudget } from "./budgetPrevisionnel";

/**
 * BudgetPrevisionnelField — budget prévisionnel de construction, FACULTATIF,
 * pour les wizards P2–P5. Même formulation et mêmes tranches que P1
 * (budgetPrevisionnel.ts) : avec une surface de plancher, liste de tranches
 * globales ; sans surface, montant libre. Valeur = borne haute de la tranche
 * (comme P1). Non renseigné → null, jamais de valeur de repli.
 */
export interface BudgetPrevisionnelFieldProps {
  surfaceM2?: number | null;
  value: number | null;
  onChange: (v: number | null) => void;
  labelClassName?: string;
  labelStyle?: React.CSSProperties;
  controlClassName?: string;
  controlStyle?: React.CSSProperties;
  helpStyle?: React.CSSProperties;
}

const LOCALE: Record<string, string> = { fr: "fr-FR", ar: "ar-MA", en: "en-US" };

export default function BudgetPrevisionnelField({
  surfaceM2, value, onChange, labelClassName, labelStyle, controlClassName, controlStyle, helpStyle,
}: BudgetPrevisionnelFieldProps) {
  const t = useT();
  const { lang } = useLang();
  const surface = Number(surfaceM2);
  const avecTranches = Number.isFinite(surface) && surface > 0;

  return (
    <div>
      <label className={labelClassName} style={labelStyle}>
        {t("p1.lp.f.budget")} <span style={{ fontWeight: 400, opacity: 0.7 }}>({t("lead.porte.optional")})</span>
      </label>
      {avecTranches ? (
        <select
          className={controlClassName}
          style={controlStyle}
          value={value != null ? String(value) : ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">{t("p1.lp.imperative.budget_choose")}</option>
          {tranchesBudget(surface).map((b) => (
            <option key={b.id} value={b.maxMAD}>
              {t("p1.lp.imperative.budget_range", {
                min: b.minMAD.toLocaleString(LOCALE[lang] || "fr-FR"),
                max: b.maxMAD.toLocaleString(LOCALE[lang] || "fr-FR"),
              })}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={controlClassName}
          style={controlStyle}
          type="number"
          min={0}
          step={10000}
          value={value != null ? String(value) : ""}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(e.target.value && Number.isFinite(n) && n > 0 ? n : null);
          }}
          placeholder={t("lead.porte.budget_libre_ph")}
        />
      )}
      <p style={{ marginTop: 6, fontSize: 12, opacity: 0.75, ...helpStyle }}>{t("p1.lp.f.budget_help")}</p>
    </div>
  );
}
