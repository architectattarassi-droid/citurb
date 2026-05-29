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

type Props = {
  dossierId: string;
  /** État préchargé (sinon fetch interne). */
  data?: PvCompliance | null;
  /** Affiche un bandeau vert discret quand tout est OK. */
  showOk?: boolean;
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function PvComplianceBanner({ dossierId, data, showOk = false }: Props) {
  const [state, setState] = useState<PvCompliance | null>(data ?? null);

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
    return (
      <div style={{ ...S.box, background: "#fef2f2", borderColor: "#fecaca" }}>
        <div style={{ ...S.icon, background: "#ef4444" }}>⛔</div>
        <div style={S.body}>
          <div style={{ ...S.title, color: "#991b1b" }}>Chantier bloqué — PV obligatoire</div>
          <div style={S.text}>
            Aucun PV de visite depuis plus de {state.intervalDays} jours
            {state.lastPvDate ? ` (dernier : ${fmt(state.lastPvDate)})` : ""}. Les commandes
            matériaux et l'affectation de sous-traitants sont suspendues jusqu'au dépôt d'un nouveau PV.
          </div>
        </div>
        <Link to={newPvLink} style={{ ...S.cta, background: "#ef4444" }}>
          Déposer un PV
        </Link>
      </div>
    );
  }

  // WARNING
  return (
    <div style={{ ...S.box, background: "#fffbeb", borderColor: "#fde68a" }}>
      <div style={{ ...S.icon, background: "#f59e0b" }}>⏳</div>
      <div style={S.body}>
        <div style={{ ...S.title, color: "#92400e" }}>PV de chantier attendu</div>
        <div style={S.text}>
          Prochain PV attendu avant le <strong>{fmt(state.nextPvDueDate)}</strong> (
          {Math.max(0, state.daysUntilDue)} jour{state.daysUntilDue > 1 ? "s" : ""}). Sans PV, le
          chantier sera automatiquement bloqué.
        </div>
      </div>
      <Link to={newPvLink} style={{ ...S.cta, background: "#f59e0b" }}>
        Créer un PV
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
