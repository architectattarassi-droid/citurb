/**
 * PhaseCard — carte détaillée d'une phase du parcours.
 *
 * Affiche un résumé spécifique à chaque phase (lead/manage/permit/site/delivery)
 * + un badge status + d'éventuelles actions secondaires.
 *
 * Mobile-first : full-width, padding tactile.
 */

import React from "react";
import {
  PhaseStatus,
  PhaseSummary,
  PHASE_LABELS_FR,
  PHASE_STATUS_STYLE,
} from "./mon-parcours.api";

interface Props {
  phase: PhaseSummary;
}

function fmt(v: unknown, suffix = ""): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return `${v}${suffix}`;
  return String(v);
}

function fmtDate(v: unknown): string {
  if (!v) return "—";
  try {
    return new Date(String(v)).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(v);
  }
}

function statusBadge(s: PhaseStatus): { label: string; cls: string } {
  const map: Record<PhaseStatus, { label: string; cls: string }> = {
    DONE: { label: "Terminé", cls: "bg-emerald-100 text-emerald-800" },
    ACTIVE: { label: "En cours", cls: "bg-amber-100 text-amber-900" },
    PENDING: { label: "À venir", cls: "bg-slate-100 text-slate-600" },
    BLOCKED: { label: "Bloqué", cls: "bg-rose-100 text-rose-800" },
  };
  return map[s];
}

const PhaseCard: React.FC<Props> = ({ phase }) => {
  const sty = PHASE_STATUS_STYLE[phase.status];
  const badge = statusBadge(phase.status);
  const s = phase.summary as any;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className={["inline-flex h-2 w-2 rounded-full", sty.dot].join(" ")} />
          <h3 className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">
            {PHASE_LABELS_FR[phase.id]}
          </h3>
        </div>
        <span
          className={[
            "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
            badge.cls,
          ].join(" ")}
        >
          {badge.label}
        </span>
      </header>

      {/* Détails spécifiques par phase */}
      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {phase.id === "lead" && (
          <>
            <Row label="Score" value={fmt(s.leadScore, " / 100")} />
            <Row label="Source" value={fmt(s.source)} />
            <Row label="Premier contact" value={fmtDate(s.firstContactAt)} />
          </>
        )}
        {phase.id === "manage" && (
          <>
            <Row label="Architecte" value={fmt(s.architect)} />
            <Row label="Pack" value={fmt(s.pack)} />
            <Row
              label="Prix pack"
              value={
                s.packPriceMAD
                  ? `${Number(s.packPriceMAD).toLocaleString("fr-FR")} MAD`
                  : "—"
              }
            />
            <Row
              label="Mandat signé"
              value={s.signatures?.mandat ? "Oui ✓" : "Non"}
            />
          </>
        )}
        {phase.id === "permit" && (
          <>
            <Row label="Statut Rokhas" value={fmt(s.rokhasStatus)} />
            <Row label="Date dépôt" value={fmtDate(s.depositDate)} />
            <Row label="Échéance légale" value={fmtDate(s.legalDeadline)} />
            <Row label="Réserves" value={fmt(s.reservesCount)} />
            {s.numArrete && (
              <Row label="N° arrêté" value={fmt(s.numArrete)} />
            )}
          </>
        )}
        {phase.id === "site" && (
          <>
            <Row label="Avancement" value={fmt(s.progressPct, " %")} />
            <Row label="PV chantier" value={fmt(s.pvCount)} />
            <Row label="Dernière visite" value={fmtDate(s.lastVisit)} />
            <Row label="Photos récentes" value={fmt(s.photosRecentCount)} />
            {typeof s.progressPct === "number" && (
              <div className="sm:col-span-2">
                <ProgressBar value={s.progressPct} />
              </div>
            )}
          </>
        )}
        {phase.id === "delivery" && (
          <>
            <Row label="Statut PH" value={fmt(s.phStatus)} />
            <Row label="Date prévue" value={fmtDate(s.plannedDate)} />
            <Row
              label="Garanties"
              value={
                Array.isArray(s.garantiesActives) && s.garantiesActives.length
                  ? s.garantiesActives.join(", ")
                  : "—"
              }
            />
          </>
        )}
      </dl>
    </article>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between gap-3 border-b border-slate-50 py-1.5 last:border-0">
    <dt className="text-slate-500">{label}</dt>
    <dd className="font-medium text-slate-900">{value}</dd>
  </div>
);

const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
        style={{ width: `${v}%` }}
        role="progressbar"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
};

export default PhaseCard;
