/**
 * RokhasDeadlineCountdown — compte à rebours sticky pour la deadline
 * principale (décision légale) ou pour une deadline custom (réserve…).
 *
 * Affichage adaptatif :
 *  - vert  : > 21j
 *  - orange : ≤ 21j
 *  - rouge : ≤ 7j ou OVERDUE
 */
import React from "react";
import type { DeadlineSeverity } from "./rokhas-tracker.api";

const C = {
  okBg: "#e7f5ec", okFg: "#0a7f3a",
  warnBg: "#fff5e6", warnFg: "#b76e00",
  critBg: "#fde8e8", critFg: "#b91c1c",
  inkMid: "#5a6573",
};

function palette(sev: DeadlineSeverity) {
  if (sev === "OVERDUE" || sev === "CRITICAL") return { bg: C.critBg, fg: C.critFg };
  if (sev === "WARN") return { bg: C.warnBg, fg: C.warnFg };
  return { bg: C.okBg, fg: C.okFg };
}

export default function RokhasDeadlineCountdown({
  label,
  deadline,
  joursRestants,
  severity,
  sticky = false,
}: {
  label: string;
  deadline: string;
  joursRestants: number | null;
  severity: DeadlineSeverity;
  sticky?: boolean;
}) {
  const p = palette(severity);
  const jr = joursRestants;
  let main: string;
  if (jr === null) main = "—";
  else if (jr < 0) main = `Dépassée de ${Math.abs(jr)}j`;
  else if (jr === 0) main = "Aujourd'hui";
  else main = `J−${jr}`;

  const dateStr = (() => {
    try { return new Date(deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); }
    catch { return deadline; }
  })();

  const containerStyle: React.CSSProperties = {
    background: p.bg,
    color: p.fg,
    borderRadius: 12,
    padding: "14px 16px",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    boxShadow: sticky ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
    ...(sticky ? { position: "sticky" as const, top: 8, zIndex: 5 } : {}),
  };

  return (
    <div style={containerStyle} role="status" aria-live="polite">
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.8 }}>
          {label}
        </div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>Échéance : {dateStr}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: "tabular-nums" as const, whiteSpace: "nowrap" }}>
        {main}
      </div>
    </div>
  );
}
