/**
 * MonParcoursPage — Dashboard client "Mon Parcours".
 *
 * Route : /mon-parcours/:dossierId
 *
 * Sections :
 *  1. Header sticky (titre + architecte + bouton WhatsApp)
 *  2. NextActionPanel (action prioritaire)
 *  3. ParcoursTimeline (5 phases : Lead/Manage/Permit/Site/Delivery)
 *  4. PhaseCards (détail par phase)
 *  5. PaymentSummary
 *  6. DocumentsQuickAccess
 *
 * Mobile-first : timeline verticale, cards full-width, bouton contact sticky bas.
 *
 * Cf. INTEGRATION.md pour le branchement route + i18n.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  DossierOverview,
  ExpertContact,
  ParcoursPhaseId,
  monParcoursApi,
} from "./mon-parcours.api";
import NextActionPanel from "./NextActionPanel";
import ParcoursTimeline from "./ParcoursTimeline";
import PhaseCard from "./PhaseCard";
import PaymentSummary from "./PaymentSummary";
import DocumentsQuickAccess from "./DocumentsQuickAccess";

/** Construit un deep-link WhatsApp à partir d'un téléphone E.164. */
function whatsappLink(phone: string | null, message: string): string | null {
  if (!phone) return null;
  const clean = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function ExpertButton({
  expert,
  projectTitle,
  className,
}: {
  expert: ExpertContact | null;
  projectTitle: string;
  className?: string;
}) {
  if (!expert) return null;
  const msg = `Bonjour ${expert.name}, je vous contacte au sujet de mon projet « ${projectTitle} ».`;
  const wa = whatsappLink(expert.phone, msg);
  const href = wa ?? (expert.email ? `mailto:${expert.email}` : "#");
  return (
    <a
      href={href}
      target={wa ? "_blank" : undefined}
      rel="noreferrer"
      className={[
        "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-600 active:scale-[0.98]",
        className ?? "",
      ].join(" ")}
    >
      <span aria-hidden>💬</span>
      <span>Contacter mon expert</span>
    </a>
  );
}

const MonParcoursPage: React.FC = () => {
  const { dossierId = "" } = useParams<{ dossierId: string }>();
  const [data, setData] = useState<DossierOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /** Pull-to-refresh (mobile) — geste simple sans dépendance. */
  const startYRef = useRef<number | null>(null);
  const [pullDelta, setPullDelta] = useState<number>(0);

  const load = useCallback(async () => {
    if (!dossierId) return;
    setLoading(true);
    setError(null);
    try {
      const overview = await monParcoursApi.get(dossierId);
      setData(overview);
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement du parcours");
    } finally {
      setLoading(false);
    }
  }, [dossierId]);

  useEffect(() => {
    load();
  }, [load]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0) startYRef.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current == null) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0 && window.scrollY <= 0) setPullDelta(Math.min(80, delta));
  };
  const onTouchEnd = () => {
    if (pullDelta >= 60) load();
    startYRef.current = null;
    setPullDelta(0);
  };

  const expert = useMemo<ExpertContact | null>(() => {
    if (!data || data.experts.length === 0) return null;
    return data.experts.find((e) => e.role === "ARCHITECT") ?? data.experts[0];
  }, [data]);

  const onPhaseClick = (id: ParcoursPhaseId) => {
    const el = document.getElementById(`phase-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Loading
  if (loading && !data) {
    return (
      <main className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-16 rounded-2xl bg-slate-200" />
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="h-32 rounded-2xl bg-slate-200" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="h-40 rounded-2xl bg-slate-200" />
            <div className="h-40 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </main>
    );
  }

  // ── Error
  if (error && !data) {
    return (
      <main className="mx-auto w-full max-w-3xl px-3 py-10 text-center sm:px-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h2 className="text-lg font-semibold text-rose-900">
            Impossible de charger votre parcours
          </h2>
          <p className="mt-1 text-sm text-rose-700">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white"
          >
            Réessayer
          </button>
        </div>
      </main>
    );
  }

  if (!data) return null;

  return (
    <main
      className="min-h-screen bg-slate-50 pb-28"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullDelta > 0 && (
        <div
          className="flex items-center justify-center bg-slate-100 text-xs text-slate-500"
          style={{ height: pullDelta }}
        >
          {pullDelta >= 60 ? "Relâchez pour actualiser" : "Tirez pour actualiser"}
        </div>
      )}

      {/* Header sticky */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">
              {data.porteType} · Mon Parcours
            </p>
            <h1 className="truncate text-base font-bold text-slate-900 sm:text-xl">
              {data.projectTitle}
            </h1>
            {expert && (
              <p className="mt-0.5 text-xs text-slate-500">
                Architecte : <span className="font-medium">{expert.name}</span>
              </p>
            )}
          </div>
          <ExpertButton
            expert={expert}
            projectTitle={data.projectTitle}
            className="hidden sm:inline-flex"
          />
        </div>

        {/* Barre de progression globale */}
        <div className="h-1.5 w-full bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
            style={{ width: `${data.progressGlobalPct}%` }}
            role="progressbar"
            aria-valuenow={data.progressGlobalPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progression globale du projet"
          />
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl space-y-5 px-3 py-4 sm:px-6 sm:py-6">
        {/* Section 1 — Next action */}
        <NextActionPanel action={data.nextAction} />

        {/* Section 2 — Timeline */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              Mon parcours en 5 étapes
            </h2>
            <span className="text-xs font-medium text-slate-500">
              {data.progressGlobalPct}% global
            </span>
          </div>
          <ParcoursTimeline
            phases={data.phases}
            currentPhase={data.currentPhase}
            onPhaseClick={onPhaseClick}
          />
        </section>

        {/* Section 3 — Phase cards */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.phases.map((p) => (
            <div id={`phase-${p.id}`} key={p.id}>
              <PhaseCard phase={p} />
            </div>
          ))}
        </section>

        {/* Section 4 — Paiements */}
        <PaymentSummary payments={data.payments} />

        {/* Section 5 — Documents */}
        <DocumentsQuickAccess documents={data.documents} />

        {/* Footer note */}
        <p className="text-center text-[11px] text-slate-400">
          Dernière mise à jour : {new Date(data.generatedAt).toLocaleString("fr-FR")}
        </p>
      </div>

      {/* Bouton contact sticky bas — mobile uniquement */}
      <div className="fixed bottom-3 left-3 right-3 z-30 sm:hidden">
        <ExpertButton
          expert={expert}
          projectTitle={data.projectTitle}
          className="w-full shadow-2xl"
        />
      </div>
    </main>
  );
};

export default MonParcoursPage;
