import React, { useCallback, useMemo } from "react";
import { fmtMad } from "./materials.api";

/**
 * PriceRangeSlider — dual `<input type=range>` superposés.
 *
 * Technique CSS-only standard : deux range overlay sur un track gris,
 * un fill bleu entre les deux thumbs. Snap aux paliers définis.
 * Zones tactiles >= 44px sur les handles (accessibilité touch).
 */
export type PriceRangeSliderProps = {
  /** valeur min courante */
  min: number;
  /** valeur max courante */
  max: number;
  /** appelée à chaque déplacement (min, max) */
  onChange: (min: number, max: number) => void;
  /** paliers de snap (triés ascendants). Défaut: 0..50000. */
  steps?: number[];
  /** label optionnel au-dessus du slider */
  label?: string;
};

const DEFAULT_STEPS = [0, 100, 500, 1000, 2500, 5000, 10000, 25000, 50000];

function snapToStep(v: number, steps: number[]): number {
  // Renvoie la valeur du palier le plus proche.
  let best = steps[0];
  let bestDist = Math.abs(v - best);
  for (let i = 1; i < steps.length; i++) {
    const d = Math.abs(v - steps[i]);
    if (d < bestDist) {
      best = steps[i];
      bestDist = d;
    }
  }
  return best;
}

function indexOfStep(v: number, steps: number[]): number {
  // Trouve l'index du palier le plus proche (utile pour input range discret).
  let bestIdx = 0;
  let bestDist = Math.abs(v - steps[0]);
  for (let i = 1; i < steps.length; i++) {
    const d = Math.abs(v - steps[i]);
    if (d < bestDist) {
      bestIdx = i;
      bestDist = d;
    }
  }
  return bestIdx;
}

export default function PriceRangeSlider({
  min,
  max,
  onChange,
  steps = DEFAULT_STEPS,
  label,
}: PriceRangeSliderProps) {
  const lastIdx = steps.length - 1;

  // Indexes courants
  const minIdx = useMemo(() => indexOfStep(min, steps), [min, steps]);
  const maxIdx = useMemo(() => indexOfStep(max, steps), [max, steps]);

  const minPct = (minIdx / lastIdx) * 100;
  const maxPct = (maxIdx / lastIdx) * 100;

  const handleMin = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const idx = Number(e.target.value);
      const snapped = snapToStep(steps[idx], steps);
      // Empêche le min de dépasser le max
      if (snapped >= max) {
        onChange(snapToStep(steps[Math.max(0, maxIdx - 1)], steps), max);
      } else {
        onChange(snapped, max);
      }
    },
    [steps, max, maxIdx, onChange],
  );

  const handleMax = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const idx = Number(e.target.value);
      const snapped = snapToStep(steps[idx], steps);
      if (snapped <= min) {
        onChange(min, snapToStep(steps[Math.min(lastIdx, minIdx + 1)], steps));
      } else {
        onChange(min, snapped);
      }
    },
    [steps, min, minIdx, lastIdx, onChange],
  );

  return (
    <div style={{ width: "100%" }}>
      {label && (
        <div style={{ fontSize: 12, color: "#374151", fontWeight: 600, marginBottom: 8 }}>
          {label}
        </div>
      )}

      <div style={{ position: "relative", height: 44, marginTop: 6, marginBottom: 6 }}>
        {/* Track gris */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 21,
            left: 0,
            right: 0,
            height: 4,
            background: "#e5e7eb",
            borderRadius: 999,
          }}
        />
        {/* Fill bleu entre les thumbs */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 21,
            left: `${minPct}%`,
            right: `${100 - maxPct}%`,
            height: 4,
            background: "#2563eb",
            borderRadius: 999,
          }}
        />

        {/* Input min */}
        <input
          type="range"
          min={0}
          max={lastIdx}
          step={1}
          value={minIdx}
          onChange={handleMin}
          aria-label="Prix minimum"
          className="citurb-range-slider"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            width: "100%",
            height: 44,
            background: "transparent",
            appearance: "none",
            WebkitAppearance: "none",
            pointerEvents: "none",
            zIndex: 2,
            outline: "none",
            margin: 0,
            padding: 0,
          }}
        />
        {/* Input max */}
        <input
          type="range"
          min={0}
          max={lastIdx}
          step={1}
          value={maxIdx}
          onChange={handleMax}
          aria-label="Prix maximum"
          className="citurb-range-slider"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            width: "100%",
            height: 44,
            background: "transparent",
            appearance: "none",
            WebkitAppearance: "none",
            pointerEvents: "none",
            zIndex: 3,
            outline: "none",
            margin: 0,
            padding: 0,
          }}
        />

        {/* Styles inline injectés pour les thumbs (44px tap-target) */}
        <style>{`
          .citurb-range-slider {
            -webkit-appearance: none;
            appearance: none;
            background: transparent;
          }
          .citurb-range-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            pointer-events: auto;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: transparent;
            cursor: grab;
            position: relative;
          }
          .citurb-range-slider::-webkit-slider-thumb::after {
            content: "";
            display: block;
            width: 20px;
            height: 20px;
            margin: 12px auto;
            border-radius: 50%;
            background: #ffffff;
            border: 2px solid #2563eb;
            box-shadow: 0 1px 4px rgba(0,0,0,0.15);
          }
          .citurb-range-slider::-moz-range-thumb {
            pointer-events: auto;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #ffffff;
            border: 2px solid #2563eb;
            box-shadow: 0 1px 4px rgba(0,0,0,0.15);
            cursor: grab;
          }
          .citurb-range-slider::-webkit-slider-thumb:active {
            cursor: grabbing;
          }
          .citurb-range-slider::-moz-range-thumb:active {
            cursor: grabbing;
          }
          .citurb-range-slider::-webkit-slider-runnable-track {
            background: transparent;
            border: none;
            height: 4px;
          }
          .citurb-range-slider::-moz-range-track {
            background: transparent;
            border: none;
            height: 4px;
          }
        `}</style>

        {/* Thumbs visuels par-dessus (zones tactiles élargies invisibles via les input) */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 12,
            left: `calc(${minPct}% - 11px)`,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#fff",
            border: "2px solid #2563eb",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 12,
            left: `calc(${maxPct}% - 11px)`,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#fff",
            border: "2px solid #2563eb",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          color: "#374151",
          fontWeight: 600,
          marginTop: 6,
        }}
      >
        <span>{fmtMad(min, false)}</span>
        <span style={{ opacity: 0.5 }}>—</span>
        <span>{fmtMad(max, false)} MAD</span>
      </div>
    </div>
  );
}
