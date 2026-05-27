/**
 * PcChecklistStep — Étape 1 : Identification du projet.
 *
 * Saisie : type projet, commune, surfaces, niveaux, architecte.
 * Génère implicitement la checklist (calcul backend dans /init ou /step).
 *
 * Mobile-first, sauvegarde auto debouncée 500 ms.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PROJECT_TYPE_LABELS,
  type EnrichedPiece,
  type PcDraft,
  type ProjectType,
} from "./permis-construire.api";

interface Props {
  draft: PcDraft;
  checklist: EnrichedPiece[];
  onChange: (patch: Partial<PcDraft["identification"]>) => void;
  /** Persiste (debounced) — appelé par le wizard parent. */
  saving?: boolean;
}

export default function PcChecklistStep({ draft, checklist, onChange, saving }: Props) {
  const ident = draft.identification;
  const [local, setLocal] = useState(ident);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setLocal(ident);
  }, [ident.projectType, ident.commune, ident.architecteCnoa]);

  function update<K extends keyof typeof local>(key: K, value: (typeof local)[K]) {
    const next = { ...local, [key]: value };
    setLocal(next);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => onChange({ [key]: value }), 500);
  }

  const requiredCount = useMemo(
    () => checklist.filter((p) => p.required).length,
    [checklist],
  );

  return (
    <div style={{ padding: "16px 12px", maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, margin: "0 0 4px 0" }}>Identification du projet</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 0 }}>
        Renseignez les caractéristiques de votre projet pour générer la liste exhaustive
        des pièces requises par votre commune.
      </p>
      {saving && (
        <div style={{ fontSize: 11, color: "#16a34a", marginBottom: 8 }}>
          ✓ Sauvegarde automatique…
        </div>
      )}

      <FieldGroup label="Type de projet">
        <select
          value={local.projectType ?? ""}
          onChange={(e) => update("projectType", (e.target.value || null) as ProjectType | null)}
          style={inputStyle}
        >
          <option value="">— Sélectionner —</option>
          {(Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]).map((t) => (
            <option key={t} value={t}>{PROJECT_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </FieldGroup>

      <FieldGroup label="Commune">
        <input
          type="text"
          value={local.commune ?? ""}
          onChange={(e) => update("commune", e.target.value)}
          placeholder="Ex: Casablanca, Rabat, Marrakech…"
          style={inputStyle}
          autoComplete="off"
          list="pc-communes-suggest"
        />
        <datalist id="pc-communes-suggest">
          {["Casablanca", "Rabat", "Marrakech", "Fes", "Tanger", "Agadir", "Meknes", "Oujda", "Tetouan", "Sale", "Kenitra", "Mohammedia"]
            .map((c) => <option key={c} value={c} />)}
        </datalist>
      </FieldGroup>

      <FieldGroup label="Préfecture / Province (optionnel)">
        <input
          type="text"
          value={local.prefecture ?? ""}
          onChange={(e) => update("prefecture", e.target.value)}
          style={inputStyle}
        />
      </FieldGroup>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <FieldGroup label="Surface terrain (m²)">
          <input
            type="number"
            min={0}
            value={local.surfaceTerrainM2 ?? ""}
            onChange={(e) =>
              update("surfaceTerrainM2", e.target.value === "" ? null : Number(e.target.value))
            }
            style={inputStyle}
          />
        </FieldGroup>
        <FieldGroup label="Surface plancher (m²)">
          <input
            type="number"
            min={0}
            value={local.surfacePlancherM2 ?? ""}
            onChange={(e) =>
              update("surfacePlancherM2", e.target.value === "" ? null : Number(e.target.value))
            }
            style={inputStyle}
          />
        </FieldGroup>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <FieldGroup label="Niveaux (R+)">
          <input
            type="number"
            min={0}
            max={50}
            value={local.niveaux ?? ""}
            onChange={(e) =>
              update("niveaux", e.target.value === "" ? null : Number(e.target.value))
            }
            style={inputStyle}
          />
        </FieldGroup>
        <FieldGroup label="Zone sismique (RPS 2011)">
          <input
            type="text"
            value={local.zoneSismique ?? ""}
            readOnly
            style={{ ...inputStyle, background: "#f9fafb", color: "#6b7280" }}
            placeholder="Auto"
          />
        </FieldGroup>
      </div>

      <h3 style={{ fontSize: 14, marginTop: 20, marginBottom: 4 }}>Architecte</h3>

      <FieldGroup label="Architecte (slug Cercles)">
        <input
          type="text"
          value={local.architecteSlug ?? ""}
          onChange={(e) => update("architecteSlug", e.target.value)}
          placeholder="ex: archi-yassine-attarassi"
          style={inputStyle}
        />
      </FieldGroup>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <FieldGroup label="N° CNOA">
          <input
            type="text"
            value={local.architecteCnoa ?? ""}
            onChange={(e) => update("architecteCnoa", e.target.value)}
            style={inputStyle}
          />
        </FieldGroup>
        <FieldGroup label="Visa CROA">
          <input
            type="text"
            value={local.visaCroa ?? ""}
            onChange={(e) => update("visaCroa", e.target.value)}
            style={inputStyle}
          />
        </FieldGroup>
      </div>

      {checklist.length > 0 && (
        <div
          style={{
            marginTop: 24,
            padding: 12,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            fontSize: 13,
            color: "#1e40af",
          }}
        >
          <strong>📋 Checklist générée :</strong> {checklist.length} pièces dont{" "}
          <strong>{requiredCount} obligatoires</strong>.<br />
          Passez à l'étape suivante pour les téléverser.
        </div>
      )}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", margin: "10px 0" }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#fff",
  color: "#111827",
  boxSizing: "border-box",
};
