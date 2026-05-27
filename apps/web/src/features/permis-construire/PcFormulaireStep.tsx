/**
 * PcFormulaireStep — Étape 3 : Formulaires officiels auto-générés.
 *
 * - Bouton "Générer tous les formulaires" → /generate-formulaires
 * - Liste les formulaires produits, ouvre l'aperçu dans un iframe.
 * - Pour chaque formulaire : champs pré-saisis affichés en read-only avec
 *   override possible (sauvegardé via patchStep formulaireOverrides).
 */

import React, { useEffect, useState } from "react";
import {
  generatePcFormulaires,
  patchPcStep,
  pcFormulaireUrl,
  type PcDraft,
  type PcDraftResponse,
  type PcFormulaire,
} from "./permis-construire.api";

interface Props {
  dossierId: string;
  draft: PcDraft;
  onChange: (resp: PcDraftResponse) => void;
}

export default function PcFormulaireStep({ dossierId, draft, onChange }: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCode, setOpenCode] = useState<string | null>(null);

  useEffect(() => {
    // Auto-génération si aucune formulaire encore produit et identification OK
    if (draft.formulaires.length === 0 && draft.identification.projectType) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const resp = await generatePcFormulaires(dossierId);
      onChange(resp);
    } catch (e: any) {
      setError(e?.message ?? "Échec de la génération");
    } finally {
      setGenerating(false);
    }
  }

  async function saveOverride(code: string, key: string, value: string) {
    try {
      const resp = await patchPcStep(dossierId, "formulaires", {
        formulaireOverrides: { [code]: { [key]: value } },
      });
      onChange(resp);
    } catch (e: any) {
      setError(e?.message ?? "Échec sauvegarde");
    }
  }

  return (
    <div style={{ padding: "16px 12px", maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, margin: "0 0 4px 0" }}>Formulaires officiels</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 0 }}>
        CITURBAREA pré-remplit les formulaires réglementaires depuis vos données.
        Validez ou ajustez chaque champ avant impression.
      </p>

      {error && (
        <div style={alertStyle}>⚠ {error}</div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          style={primaryBtn}
        >
          {generating ? "Génération en cours…" : "Régénérer tous les formulaires"}
        </button>
      </div>

      {draft.formulaires.length === 0 && !generating && (
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          Aucun formulaire généré pour le moment. Cliquez sur le bouton ci-dessus.
        </p>
      )}

      {draft.formulaires.map((f) => (
        <FormulaireCard
          key={f.code}
          formulaire={f}
          isOpen={openCode === f.code}
          onToggle={() => setOpenCode(openCode === f.code ? null : f.code)}
          onOverride={(key, value) => saveOverride(f.code, key, value)}
          previewUrl={pcFormulaireUrl(dossierId, f.code)}
        />
      ))}
    </div>
  );
}

function FormulaireCard({
  formulaire,
  isOpen,
  onToggle,
  onOverride,
  previewUrl,
}: {
  formulaire: PcFormulaire;
  isOpen: boolean;
  onToggle: () => void;
  onOverride: (k: string, v: string) => void;
  previewUrl: string;
}) {
  const data = formulaire.data ?? {};
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{formulaire.label}</div>
          {formulaire.generatedAt && (
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Généré : {formulaire.generatedAt.slice(0, 10)} {formulaire.generatedAt.slice(11, 16)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            style={ghostBtn}
          >
            Imprimer
          </a>
          <button type="button" onClick={onToggle} style={ghostBtn}>
            {isOpen ? "Masquer" : "Voir / éditer"}
          </button>
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: 10 }}>
          <details open style={{ marginBottom: 8, fontSize: 12 }}>
            <summary style={{ cursor: "pointer", color: "#2563eb" }}>
              Champs pré-saisis ({Object.keys(data).length})
            </summary>
            <table style={{ width: "100%", marginTop: 8, borderCollapse: "collapse" }}>
              <tbody>
                {Object.entries(data).map(([k, v]) => (
                  <tr key={k}>
                    <td
                      style={{
                        padding: "4px 6px",
                        color: "#6b7280",
                        fontSize: 11,
                        width: "38%",
                        verticalAlign: "top",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      {k}
                    </td>
                    <td style={{ padding: "4px 6px", borderBottom: "1px solid #f3f4f6" }}>
                      <input
                        type="text"
                        defaultValue={v === null || v === undefined ? "" : String(v)}
                        onBlur={(e) => {
                          if (e.target.value !== String(v ?? "")) {
                            onOverride(k, e.target.value);
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "4px 6px",
                          border: "1px solid #d1d5db",
                          borderRadius: 4,
                          fontSize: 12,
                          boxSizing: "border-box",
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
          <iframe
            src={previewUrl}
            title={formulaire.label}
            style={{
              width: "100%",
              height: 360,
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              background: "#fff",
            }}
          />
        </div>
      )}
    </div>
  );
}

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
  textDecoration: "none",
};
