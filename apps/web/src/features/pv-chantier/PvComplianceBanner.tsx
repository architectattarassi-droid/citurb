/**
 * PvComplianceBanner — bandeau cadence PV obligatoire (1 PV / 15 jours).
 *
 * Affiche l'état de conformité d'un chantier :
 *   - BLOCKED : chantier bloqué (rouge) — opérations suspendues
 *   - WARNING : PV attendu sous quelques jours (orange)
 *   - OK      : rien (ou pastille discrète si `showOk`)
 *
 * Réutilisable dans Mon Parcours, la page chantier, le copilote, etc.
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PvCompliance, pvChantierApi } from "./pv-chantier.api";
import { useT, useLang } from "../../i18n/i18n";

type Props = {
  dossierId: string;
  /** État préchargé (sinon fetch interne). */
  data?: PvCompliance | null;
  /** Affiche un bandeau vert discret quand tout est OK. */
  showOk?: boolean;
};

function fmt(iso: string | null, lang: string): string {
  if (!iso) return "—";
  const localeMap: Record<string, string> = { fr: "fr-MA", ar: "ar-MA", en: "en-GB" };
  try {
    return new Date(iso).toLocaleDateString(localeMap[lang] || "fr-MA", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function PvComplianceBanner({ dossierId, data, showOk = false }: Props) {
  const [state, setState] = useState<PvCompliance | null>(data ?? null);
  const t = useT();
  const { lang } = useLang();

  useEffect(() => {
    if (data) {
      setState(data);
      return;
    }
    let alive = true;
    pvChantierApi
      .compliance(dossierId)
      .then((r) => alive && setState(r))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [dossierId, data]);

  if (!state || !state.active) return null;
  if (state.status === "OK" && !showOk) return null;

  const newPvLink = `/pv-chantier/dossier/${dossierId}/new`;

  if (state.status === "BLOCKED") {
    const lastFragment = state.lastPvDate ? t("pv.compliance.blocked_last", { date: fmt(state.lastPvDate, lang) }) : "";
    return (
      <div style={{ ...S.box, background: "#fef2f2", borderColor: "#fecaca" }}>
        <div style={{ ...S.icon, background: "#ef4444" }}>⛔</div>
        <div style={S.body}>
          <div style={{ ...S.title, color: "#991b1b" }}>{t("pv.compliance.blocked_title")}</div>
          <div style={S.text}>
            {t("pv.compliance.blocked_text", { days: state.intervalDays, last: lastFragment })}
          </div>
        </div>
        <Link to={newPvLink} style={{ ...S.cta, background: "#ef4444" }}>
          {t("pv.compliance.blocked_cta")}
        </Link>
      </div>
    );
  }

  // WARNING
  return (
    <div style={{ ...S.box, background: "#fffbeb", borderColor: "#fde68a" }}>
      <div style={{ ...S.icon, background: "#f59e0b" }}>⏳</div>
      <div style={S.body}>
        <div style={{ ...S.title, color: "#92400e" }}>{t("pv.compliance.warning_title")}</div>
        <div style={S.text}>
          {t("pv.compliance.warning_text", {
            date: fmt(state.nextPvDueDate, lang),
            days: Math.max(0, state.daysUntilDue),
          })}
        </div>
      </div>
      <Link to={newPvLink} style={{ ...S.cta, background: "#f59e0b" }}>
        {t("pv.compliance.warning_cta")}
      </Link>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  box: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "1px solid",
    borderRadius: 12,
    padding: 14,
    margin: "0 0 14px",
    flexWrap: "wrap",
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    flexShrink: 0,
  },
  body: { flex: 1, minWidth: 200 },
  title: { fontWeight: 800, fontSize: 15, marginBottom: 2 },
  text: { fontSize: 13, color: "#475569", lineHeight: 1.5 },
  cta: {
    color: "#fff",
    fontWeight: 700,
    fontSize: 13.5,
    padding: "10px 16px",
    borderRadius: 9,
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
};
