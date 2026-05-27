/**
 * PcReviewStep — Étape 4 : Vérification finale + aperçu master PDF.
 *
 * - Récap projet + checklist (checkmarks)
 * - Bouton "Compiler le PDF master"
 * - Aperçu iframe du master HTML compilé
 * - Boutons "Modifier" → navigation vers étape spécifique
 */

import React, { useState } from "react";
import {
  compilePcMaster,
  pcMasterUrl,
  PROJECT_TYPE_LABELS,
  type EnrichedPiece,
  type PcDraft,
  type PcDraftResponse,
  type StepId,
} from "./permis-construire.api";

interface Props {
  dossierId: string;
  draft: PcDraft;
  checklist: EnrichedPiece[];
  progress: {
    totalPieces: number;
    uploadedPieces: number;
    validatedPieces: number;
    requiredMissing: number;
    canCompile: boolean;
    canSubmit: boolean;
  };
  onChange: (resp: PcDraftResponse) => void;
  onNavigateStep: (s: StepId) => void;
}

export default function PcReviewStep({
  dossierId,
  draft,
  checklist,
  progress,
  onChange,
  onNavigateStep,
}: Props) {
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCompile() {
    if (!progress.canCompile) {
      setError("Pièces obligatoires manquantes — complétez l'étape 2.");
      return;
    }
    setError(null);
    setCompiling(true);
    try {
      const resp = await compilePcMaster(dossierId);
      onChange(resp);
    } catch (e: any) {
      setError(e?.message ?? "Échec compilation");
    } finally {
      setCompiling(false);
    }
  }

  const ident = draft.identification;
  const masterReady = !!draft.masterPdfPath;

  return (
    <div style={{ padding: "16px 12px", maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, margin: "0 0 4px 0" }}>Vérification finale</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 0 }}>
        Vérifiez le récapitulatif et générez le dossier PDF master complet.
      </p>

      {error && (
        <div role="alert" style={alertStyle}>⚠ {error}</div>
      )}

      {/* Récap projet */}
      <section style={cardStyle}>
        <SectionHeader title="Projet" onEdit={() => onNavigateStep("identification")} />
        <KV k="Type" v={ident.projectType ? PROJECT_TYPE_LABELS[ident.projectType] : "—"} />
        <KV k="Commune" v={ident.commune ?? "—"} />
        <KV k="Surface terrain" v={ident.surfaceTerrainM2 ? `${ident.surfaceTerrainM2} m²` : "—"} />
        <KV k="Surface plancher" v={ident.surfacePlancherM2 ? `${ident.surfacePlancherM2} m²` : "—"} />
        <KV k="Niveaux" v={ident.niveaux !== null && ident.niveaux !== undefined ? `R+${ident.niveaux}` : "—"} />
        <KV k="Zone sismique" v={ident.zoneSismique ?? "—"} />
        <KV k="Architecte CNOA" v={ident.architecteCnoa ?? "—"} />
        <KV k="Visa CROA" v={ident.visaCroa ?? "—"} />
      </section>

      {/* Pièces */}
      <section style={cardStyle}>
        <SectionHeader
          title={`Pièces (${progress.uploadedPieces} / ${progress.totalPieces})`}
          onEdit={() => onNavigateStep("pieces")}
        />
        <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 12 }}>
          {checklist.map((p) => {
            const ok = p.state.status === "UPLOADED" || p.state.status === "VALIDATED";
            return (
              <li
                key={p.code}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  borderBottom: "1px dashed #f3f4f6",
                }}
              >
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ok ? "✅" : p.required ? "❌" : "⚪"} {p.label}
                  {p.required && <span style={{ color: "#dc2626" }}> *</span>}
                </span>
                <span style={{ fontSize: 10, color: "#6b7280", marginLeft: 8 }}>
                  {p.state.status}
                </span>
              </li>
            );
          })}
        </ul>
        {progress.requiredMissing > 0 && (
          <p style={{ fontSize: 12, color: "#991b1b", marginTop: 8 }}>
            ⚠ {progress.requiredMissing} pièce(s) obligatoire(s) manquante(s).
          </p>
        )}
      </section>

      {/* Formulaires */}
      <section style={cardStyle}>
        <SectionHeader
          title={`Formulaires (${draft.formulaires.length})`}
          onEdit={() => onNavigateStep("formulaires")}
        />
        <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 12 }}>
          {draft.formulaires.map((f) => (
            <li key={f.code} style={{ padding: "4px 0", borderBottom: "1px dashed #f3f4f6" }}>
              📄 {f.label}
            </li>
          ))}
        </ul>
      </section>

      {/* Compile master */}
      <section style={cardStyle}>
        <SectionHeader title="Dossier master" />
        {!masterReady && (
          <button
            type="button"
            onClick={handleCompile}
            disabled={compiling || !progress.canCompile}
            style={{
              ...primaryBtn,
              opacity: progress.canCompile ? 1 : 0.5,
              cursor: progress.canCompile ? "pointer" : "not-allowed",
              width: "100%",
            }}
          >
            {compiling ? "Compilation en cours…" : "Compiler le PDF master"}
          </button>
        )}
        {masterReady && (
          <>
            <div style={{ fontSize: 12, color: "#16a34a", marginBottom: 8 }}>
              ✓ Master compilé le {draft.masterCompiledAt?.slice(0, 10)} —{" "}
              hash: <code style={{ fontSize: 10 }}>{draft.masterHash?.slice(0, 16)}…</code>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <a href={pcMasterUrl(dossierId)} target="_blank" rel="noreferrer" style={primaryBtn}>
                Ouvrir / Imprimer le master
              </a>
              <button type="button" onClick={handleCompile} disabled={compiling} style={ghostBtn}>
                {compiling ? "…" : "Recompiler"}
              </button>
            </div>
            <iframe
              src={pcMasterUrl(dossierId)}
              title="Aperçu master"
              style={{
                width: "100%",
                height: 420,
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                background: "#fff",
              }}
            />
          </>
        )}
      </section>
    </div>
  );
}

function SectionHeader({ title, onEdit }: { title: string; onEdit?: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
        borderBottom: "1px solid #e5e7eb",
        paddingBottom: 4,
      }}
    >
      <h3 style={{ fontSize: 14, margin: 0, color: "#1f2937" }}>{title}</h3>
      {onEdit && (
        <button type="button" onClick={onEdit} style={{ ...ghostBtn, padding: "2px 8px", fontSize: 11 }}>
          Modifier
        </button>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
      <span style={{ color: "#6b7280", fontWeight: 600 }}>{k}</span>
      <span style={{ color: "#111827", textAlign: "right" }}>{v}</span>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 12,
  marginBottom: 12,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const alertStyle: React.CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  padding: 8,
  borderRadius: 6,
  fontSize: 12,
  marginBottom: 12,
};

const primaryBtn: React.CSSProperties = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "8px 14px",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
};

const ghostBtn: React.CSSProperties = {
  background: "#fff",
  color: "#2563eb",
  border: "1px solid #2563eb",
  padding: "6px 10px",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
