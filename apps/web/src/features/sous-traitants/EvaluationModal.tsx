/**
 * EvaluationModal — notation post-mission d'un sous-traitant.
 *
 * Étoiles 0..5 sur 4 dimensions (qualité, délai, communication, relation).
 * Le score moyen pondéré agrège ensuite au Score L7 P6 (cf. evaluation.service).
 */

import React, { useMemo, useState } from "react";
import {
  EvaluationInput,
  SousTraitantAssignment,
  sousTraitantsApi,
} from "./sous-traitants.api";

type Props = {
  assignment: SousTraitantAssignment;
  onClose(): void;
  onEvaluated(): void;
};

const S = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(15,23,42,0.55)",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 12,
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    borderRadius: 12,
    maxWidth: 520,
    width: "100%",
    padding: 20,
    maxHeight: "92vh",
    overflowY: "auto" as const,
  },
  title: { margin: 0, marginBottom: 14, fontSize: 18, fontWeight: 800, color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#475569", marginBottom: 16 },
  dim: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: "10px 0",
    borderBottom: "1px solid #f1f5f9",
  },
  dimLabel: { fontSize: 14, fontWeight: 700, color: "#0f172a" },
  stars: { display: "flex" as const, gap: 4 },
  star: {
    fontSize: 28,
    cursor: "pointer",
    userSelect: "none" as const,
    transition: "transform 80ms",
  },
  score: {
    background: "#dbeafe",
    color: "#1e40af",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    marginTop: 14,
    textAlign: "center" as const,
  },
  field: { display: "flex" as const, flexDirection: "column" as const, gap: 4, marginTop: 14 },
  label: { fontSize: 13, color: "#0f172a", fontWeight: 600 },
  textarea: {
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 13,
    fontFamily: "inherit",
    minHeight: 80,
    resize: "vertical" as const,
  },
  actions: {
    display: "flex" as const,
    gap: 8,
    justifyContent: "flex-end" as const,
    marginTop: 16,
    paddingTop: 12,
    borderTop: "1px solid #e2e8f0",
  },
  btn: {
    background: "#0f172a",
    color: "#fff",
    border: 0,
    borderRadius: 6,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnGhost: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  err: { color: "#b91c1c", fontSize: 12, marginTop: 8 },
};

const DIMENSIONS: Array<{ key: keyof EvaluationInput; label: string }> = [
  { key: "qualite", label: "Qualité technique" },
  { key: "delai", label: "Respect des délais" },
  { key: "communication", label: "Communication" },
  { key: "relation", label: "Relation / professionnalisme" },
];

function StarRow({ value, onChange }: { value: number; onChange(v: number): void }) {
  return (
    <div style={S.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          style={{ ...S.star, color: n <= value ? "#facc15" : "#e2e8f0" }}
          onClick={() => onChange(n)}
          role="button"
          aria-label={`${n} étoiles`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function EvaluationModal({ assignment, onClose, onEvaluated }: Props) {
  const [qualite, setQ] = useState(0);
  const [delai, setD] = useState(0);
  const [communication, setC] = useState(0);
  const [relation, setR] = useState(0);
  const [commentaire, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const scoreMoyen = useMemo(
    () => Math.round(((qualite + delai + communication + relation) / 4) * 100) / 100,
    [qualite, delai, communication, relation],
  );

  async function submit() {
    setErr(null);
    if (!qualite || !delai || !communication || !relation) {
      return setErr("Notez les 4 dimensions");
    }
    setSaving(true);
    try {
      await sousTraitantsApi.evaluate(assignment.id, {
        qualite,
        delai,
        communication,
        relation,
        commentaire,
      });
      onEvaluated();
    } catch (e: any) {
      setErr(e?.message || "Erreur évaluation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={S.title}>Évaluer {assignment.supplierCabinet}</h2>
        <p style={S.subtitle}>
          Lot {assignment.lotIntitule} · cette évaluation alimente le Score L7 du sous-traitant.
        </p>

        {DIMENSIONS.map((dim) => {
          const value =
            dim.key === "qualite"
              ? qualite
              : dim.key === "delai"
                ? delai
                : dim.key === "communication"
                  ? communication
                  : relation;
          const set =
            dim.key === "qualite"
              ? setQ
              : dim.key === "delai"
                ? setD
                : dim.key === "communication"
                  ? setC
                  : setR;
          return (
            <div key={dim.key} style={S.dim}>
              <span style={S.dimLabel}>{dim.label}</span>
              <StarRow value={value} onChange={set} />
            </div>
          );
        })}

        <div style={S.score}>Score moyen : {scoreMoyen.toFixed(2)} / 5</div>

        <div style={S.field}>
          <label style={S.label}>Commentaire (facultatif)</label>
          <textarea
            style={S.textarea}
            value={commentaire}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Points forts, axes d'amélioration, recommanderiez-vous ?"
          />
        </div>

        {err ? <div style={S.err}>{err}</div> : null}

        <div style={S.actions}>
          <button style={S.btnGhost} onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button style={S.btn} onClick={submit} disabled={saving}>
            {saving ? "Enregistrement…" : "Évaluer"}
          </button>
        </div>
      </div>
    </div>
  );
}
