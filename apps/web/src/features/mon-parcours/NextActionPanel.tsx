/**
 * NextActionPanel — encart "Prochaine action" visible en tête de page.
 *
 * Doctrine UX :
 *  - Une seule action visible (impossible à manquer).
 *  - Couleur or sur navy pour les actions urgentes.
 *  - Bouton CTA tactile (min 48px).
 *  - Mobile-first : full-width.
 */

import React from "react";
import { NextAction, SEVERITY_STYLE } from "./mon-parcours.api";

interface Props {
  action: NextAction | null;
}

function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const NextActionPanel: React.FC<Props> = ({ action }) => {
  if (!action) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-900 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
          <span aria-hidden>✓</span>
          <p className="text-sm font-medium sm:text-base">
            Tout est en ordre — votre projet avance comme prévu.
          </p>
        </div>
      </div>
    );
  }

  const style = SEVERITY_STYLE[action.severity];
  const deadline = formatDeadline(action.deadline);

  return (
    <article
      className={[
        "rounded-2xl border-2 px-4 py-4 shadow-md sm:px-6 sm:py-5",
        style.bg,
        style.text,
        style.border,
      ].join(" ")}
      role="region"
      aria-label="Prochaine action requise"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wide opacity-80">
            Prochaine action
          </p>
          <h2 className="mt-1 text-base font-semibold sm:text-lg">{action.title}</h2>
          <p className="mt-1 text-sm opacity-90">{action.description}</p>
          {deadline && (
            <p className="mt-2 text-xs font-medium opacity-80">
              Échéance : {deadline}
            </p>
          )}
        </div>
        <a
          href={action.ctaUrl}
          className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-amber-300 transition hover:bg-slate-800 active:scale-[0.98] sm:h-12 sm:text-base"
        >
          {action.ctaLabel}
        </a>
      </div>
    </article>
  );
};

export default NextActionPanel;
