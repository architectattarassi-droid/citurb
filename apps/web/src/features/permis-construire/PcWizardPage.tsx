/**
 * PcWizardPage — Wizard Permis de Construire 5 étapes.
 *
 * URL : /permis-construire/:dossierId
 *
 * - Charge le brouillon (ou crée vide) au mount.
 * - Sauvegarde automatique debouncée 500 ms à chaque change.
 * - Mode "complétion ultérieure" : on peut quitter, l'état persiste.
 * - Bottom sticky CTA Suivant / Précédent.
 * - Mobile-first responsive.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getPc,
  initPc,
  patchPcStep,
  type PcDraftResponse,
  type ProjectType,
  type StepId,
} from "./permis-construire.api";
import PcChecklistStep from "./PcChecklistStep";
import PcDocumentsStep from "./PcDocumentsStep";
import PcFormulaireStep from "./PcFormulaireStep";
import PcReviewStep from "./PcReviewStep";
import PcSoumissionStep from "./PcSoumissionStep";
import PcStatusTracker from "./PcStatusTracker";

const ORDER: StepId[] = [
  "identification",
  "pieces",
  "formulaires",
  "review",
  "soumission",
];

export default function PcWizardPage() {
  const { dossierId } = useParams<{ dossierId: string }>();
  const [resp, setResp] = useState<PcDraftResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<StepId>("identification");
  const saveTimer = useRef<number | null>(null);

  const reload = useCallback(async () => {
    if (!dossierId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await getPc(dossierId);
      setResp(r);
      setStep(r.draft.step ?? "identification");
    } catch (e: any) {
      setError(e?.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [dossierId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const idx = ORDER.indexOf(step);

  // ─── Patch identification (debounced)
  const handleIdentChange = useCallback(
    async (patch: Partial<NonNullable<PcDraftResponse>["draft"]["identification"]>) => {
      if (!dossierId || !resp) return;
      // Si projet pas encore initialisé (pas de projectType / commune) → init
      const ident = { ...resp.draft.identification, ...patch };
      const needsInit =
        !resp.draft.identification.projectType && patch.projectType && patch.commune;

      setSaving(true);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(async () => {
        try {
          let r: PcDraftResponse;
          if (needsInit && ident.projectType && ident.commune) {
            r = await initPc(dossierId, {
              projectType: ident.projectType as ProjectType,
              commune: ident.commune,
              prefecture: ident.prefecture ?? undefined,
              surfaceTerrainM2: ident.surfaceTerrainM2 ?? undefined,
              surfacePlancherM2: ident.surfacePlancherM2 ?? undefined,
              niveaux: ident.niveaux ?? undefined,
              architecteSlug: ident.architecteSlug ?? undefined,
              architecteCnoa: ident.architecteCnoa ?? undefined,
              visaCroa: ident.visaCroa ?? undefined,
            });
          } else if (!resp.draft.identification.projectType) {
            // pas encore init → on attend que les 2 champs critiques arrivent
            r = resp;
          } else {
            r = await patchPcStep(dossierId, step, { identification: patch });
          }
          setResp(r);
        } catch (e: any) {
          setError(e?.message ?? "Échec sauvegarde");
        } finally {
          setSaving(false);
        }
      }, 500);
    },
    [dossierId, resp, step],
  );

  // ─── Navigation
  const goPrev = () => {
    if (idx > 0) navigateTo(ORDER[idx - 1]);
  };
  const goNext = () => {
    if (idx < ORDER.length - 1) navigateTo(ORDER[idx + 1]);
  };

  async function navigateTo(s: StepId) {
    if (!dossierId) return;
    setStep(s);
    if (!resp?.draft.identification.projectType) return;
    try {
      const r = await patchPcStep(dossierId, s, {});
      setResp(r);
    } catch {
      // navigation locale OK même si patch échoue
    }
  }

  // ─── Disabled steps (verrous métiers)
  const disabledSteps = useMemo<StepId[]>(() => {
    if (!resp) return ["pieces", "formulaires", "review", "soumission"];
    const out: StepId[] = [];
    if (!resp.draft.identification.projectType) {
      out.push("pieces", "formulaires", "review", "soumission");
    } else {
      if (resp.progress.requiredMissing > 0) out.push("soumission");
      if (!resp.progress.canCompile) out.push("review");
      if (!resp.draft.masterPdfPath) out.push("soumission");
    }
    return out;
  }, [resp]);

  if (loading) {
    return <div style={{ padding: 24, textAlign: "center" }}>Chargement du brouillon PC…</div>;
  }

  if (error && !resp) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Erreur</h2>
        <p style={{ color: "#991b1b" }}>{error}</p>
        <button onClick={reload}>Réessayer</button>
      </div>
    );
  }

  if (!resp || !dossierId) return null;

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh", paddingBottom: 80 }}>
      <PcStatusTracker
        current={step}
        onSelect={navigateTo}
        disabled={disabledSteps}
      />

      {error && (
        <div
          role="alert"
          style={{
            maxWidth: 720,
            margin: "12px auto 0",
            padding: 8,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          ⚠ {error}
        </div>
      )}

      {step === "identification" && (
        <PcChecklistStep
          draft={resp.draft}
          checklist={resp.checklist}
          onChange={handleIdentChange}
          saving={saving}
        />
      )}
      {step === "pieces" && (
        <PcDocumentsStep
          dossierId={dossierId}
          checklist={resp.checklist}
          onChange={setResp}
        />
      )}
      {step === "formulaires" && (
        <PcFormulaireStep
          dossierId={dossierId}
          draft={resp.draft}
          onChange={setResp}
        />
      )}
      {step === "review" && (
        <PcReviewStep
          dossierId={dossierId}
          draft={resp.draft}
          checklist={resp.checklist}
          progress={resp.progress}
          onChange={setResp}
          onNavigateStep={navigateTo}
        />
      )}
      {step === "soumission" && (
        <PcSoumissionStep
          dossierId={dossierId}
          draft={resp.draft}
          canSubmit={resp.progress.canSubmit}
          onChange={setResp}
        />
      )}

      {/* Bottom sticky CTA */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          borderTop: "1px solid #e5e7eb",
          padding: "10px 12px",
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
          maxWidth: 720,
          margin: "0 auto",
          boxShadow: "0 -2px 6px rgba(0,0,0,0.05)",
        }}
      >
        <button
          type="button"
          onClick={goPrev}
          disabled={idx === 0}
          style={{
            ...secondaryBtn,
            opacity: idx === 0 ? 0.4 : 1,
            cursor: idx === 0 ? "not-allowed" : "pointer",
          }}
        >
          ← Précédent
        </button>
        <div style={{ fontSize: 11, color: "#6b7280", alignSelf: "center" }}>
          Étape {idx + 1} / {ORDER.length}
        </div>
        <button
          type="button"
          onClick={goNext}
          disabled={idx === ORDER.length - 1 || disabledSteps.includes(ORDER[idx + 1])}
          style={{
            ...primaryBtn,
            opacity:
              idx === ORDER.length - 1 || disabledSteps.includes(ORDER[idx + 1])
                ? 0.4
                : 1,
            cursor:
              idx === ORDER.length - 1 || disabledSteps.includes(ORDER[idx + 1])
                ? "not-allowed"
                : "pointer",
          }}
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "10px 16px",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  background: "#fff",
  color: "#374151",
  border: "1px solid #d1d5db",
  padding: "10px 16px",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
