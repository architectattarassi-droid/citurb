/**
 * PcStatusTracker — Progress bar 5 étapes (sticky top).
 *
 * - Mobile-first : pictos + numéros, labels masqués < 480 px.
 * - Click sur step déjà visité = navigation arrière.
 * - États : DONE (vert), CURRENT (bleu), TODO (gris).
 */

import React from "react";
import type { StepId } from "./permis-construire.api";

interface Props {
  current: StepId;
  onSelect?: (s: StepId) => void;
  /** Étapes verrouillées (ex: review tant que pièces incomplètes). */
  disabled?: StepId[];
}

const STEPS: Array<{ id: StepId; label: string; icon: string }> = [
  { id: "identification", label: "Identification", icon: "1" },
  { id: "pieces",          label: "Pièces",         icon: "2" },
  { id: "formulaires",     label: "Formulaires",    icon: "3" },
  { id: "review",          label: "Vérification",   icon: "4" },
  { id: "soumission",      label: "Soumission",     icon: "5" },
];

export default function PcStatusTracker({ current, onSelect, disabled = [] }: Props) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);

  return (
    <nav
      aria-label="Étapes du dossier PC"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        padding: "10px 12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <ol
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 4,
          margin: 0,
          padding: 0,
          listStyle: "none",
          maxWidth: 720,
          marginInline: "auto",
        }}
      >
        {STEPS.map((s, i) => {
          const state = i < currentIdx ? "DONE" : i === currentIdx ? "CURRENT" : "TODO";
          const isDisabled = disabled.includes(s.id) || (state === "TODO" && !onSelect);
          const clickable = !isDisabled && state !== "CURRENT" && !!onSelect;

          const bg =
            state === "DONE"
              ? "#16a34a"
              : state === "CURRENT"
                ? "#2563eb"
                : "#e5e7eb";
          const fg = state === "TODO" ? "#6b7280" : "#fff";

          return (
            <li
              key={s.id}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
              }}
            >
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => clickable && onSelect?.(s.id)}
                aria-current={state === "CURRENT" ? "step" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  border: "none",
                  background: "transparent",
                  cursor: clickable ? "pointer" : "default",
                  padding: 0,
                  minWidth: 0,
                  flex: 1,
                }}
                title={s.label}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: bg,
                    color: fg,
                    fontWeight: 800,
                    fontSize: 13,
                    flexShrink: 0,
                    boxShadow:
                      state === "CURRENT" ? "0 0 0 4px rgba(37,99,235,0.18)" : "none",
                  }}
                  aria-hidden
                >
                  {state === "DONE" ? "✓" : s.icon}
                </span>
                <span
                  className="pc-step-label"
                  style={{
                    fontSize: 12,
                    fontWeight: state === "CURRENT" ? 700 : 500,
                    color: state === "TODO" ? "#9ca3af" : "#111827",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span
                  style={{
                    flex: 0.6,
                    height: 2,
                    background: i < currentIdx ? "#16a34a" : "#e5e7eb",
                    borderRadius: 1,
                  }}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
      <style>{`
        @media (max-width: 480px) {
          .pc-step-label { display: none; }
        }
      `}</style>
    </nav>
  );
}
