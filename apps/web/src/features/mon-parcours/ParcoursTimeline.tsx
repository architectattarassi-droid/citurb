/**
 * ParcoursTimeline — visualisation des 5 phases du parcours.
 *
 * Desktop : horizontale (rail + 5 nœuds + connecteurs).
 * Mobile  : verticale (stack).
 *
 * Phase courante en gradient or (CITURBAREA gold), DONE en navy,
 * PENDING en gris clair.
 */

import React from "react";
import {
  ParcoursPhaseId,
  PhaseStatus,
  PhaseSummary,
  PHASE_LABELS_FR,
  PHASE_STATUS_STYLE,
} from "./mon-parcours.api";

interface Props {
  phases: PhaseSummary[];
  currentPhase: ParcoursPhaseId;
  /** Callback optionnel : clic sur un nœud. */
  onPhaseClick?: (id: ParcoursPhaseId) => void;
}

function relativeDays(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.round(ms / 86_400_000);
  if (days === 0) return "Aujourd'hui";
  if (days > 0) return `J-${days}`;
  return `J+${Math.abs(days)}`;
}

function statusLabel(s: PhaseStatus): string {
  switch (s) {
    case "DONE":
      return "Terminé";
    case "ACTIVE":
      return "En cours";
    case "BLOCKED":
      return "Bloqué";
    default:
      return "À venir";
  }
}

const ParcoursTimeline: React.FC<Props> = ({ phases, currentPhase, onPhaseClick }) => {
  return (
    <section aria-label="Timeline du parcours">
      {/* Desktop : horizontale */}
      <ol className="hidden md:flex md:items-start md:gap-2">
        {phases.map((p, idx) => {
          const style = PHASE_STATUS_STYLE[p.status];
          const isCurrent = p.id === currentPhase;
          return (
            <React.Fragment key={p.id}>
              <li className="flex flex-1 flex-col items-center text-center">
                <button
                  type="button"
                  onClick={() => onPhaseClick?.(p.id)}
                  className={[
                    "flex h-12 w-12 items-center justify-center rounded-full font-bold shadow-md ring-2 transition",
                    style.bg,
                    style.text,
                    isCurrent ? "ring-amber-300 ring-offset-2 ring-offset-white" : "ring-transparent",
                    "hover:scale-105 focus:outline-none focus:ring-amber-500",
                  ].join(" ")}
                  aria-label={`${PHASE_LABELS_FR[p.id]} — ${statusLabel(p.status)}`}
                >
                  {p.status === "DONE" ? "✓" : String(idx + 1)}
                </button>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  {PHASE_LABELS_FR[p.id]}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {statusLabel(p.status)}
                </p>
                <p className="text-[11px] text-slate-400">
                  {relativeDays(p.completedAt)}
                </p>
              </li>
              {idx < phases.length - 1 && (
                <li aria-hidden className="flex flex-1 items-center pt-6">
                  <span
                    className={[
                      "h-1 w-full rounded-full",
                      p.status === "DONE" ? "bg-slate-700" : "bg-slate-200",
                    ].join(" ")}
                  />
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>

      {/* Mobile : verticale */}
      <ol className="flex flex-col gap-3 md:hidden" aria-label="Timeline mobile">
        {phases.map((p, idx) => {
          const style = PHASE_STATUS_STYLE[p.status];
          const isCurrent = p.id === currentPhase;
          return (
            <li key={p.id} className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => onPhaseClick?.(p.id)}
                className={[
                  "mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold shadow-md ring-2 transition",
                  style.bg,
                  style.text,
                  isCurrent ? "ring-amber-300 ring-offset-2 ring-offset-white" : "ring-transparent",
                ].join(" ")}
                aria-label={`${PHASE_LABELS_FR[p.id]} — ${statusLabel(p.status)}`}
              >
                {p.status === "DONE" ? "✓" : String(idx + 1)}
              </button>
              <div className="flex-1 border-b border-slate-100 pb-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-800">
                  {PHASE_LABELS_FR[p.id]}
                </p>
                <p className="text-xs text-slate-500">
                  {statusLabel(p.status)} · {relativeDays(p.completedAt)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default ParcoursTimeline;
