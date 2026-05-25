/**
 * TaskEditor — bottom sheet d'édition de tâche.
 *
 * Champs : titre, durée, prédécesseurs (multi), assignés (string libre), status,
 * progression, jalon. Sauvegarde via callback parent (PATCH/POST).
 */

import React, { useEffect, useState } from "react";
import {
  PHASE_LABELS, ProjectPhase, ProjectTask, ProjectTaskStatus, STATUS_LABELS,
} from "./project-calendar.api";

export type TaskEditorMode = "create" | "edit";

export default function TaskEditor(props: {
  mode: TaskEditorMode;
  initial?: Partial<ProjectTask>;
  allTasks: ProjectTask[];
  onClose: () => void;
  onSave: (patch: Partial<ProjectTask>) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}) {
  const { mode, initial, allTasks, onClose, onSave, onDelete } = props;

  const [titre, setTitre] = useState(initial?.titre ?? "");
  const [phase, setPhase] = useState<ProjectPhase>(initial?.phase ?? "ESQ");
  const [durationDays, setDurationDays] = useState<number>(initial?.durationDays ?? 1);
  const [predecessors, setPredecessors] = useState<string[]>(initial?.predecessors ?? []);
  const [resourceUserIds, setResourceUserIds] = useState<string>((initial?.resourceUserIds ?? []).join(", "));
  const [status, setStatus] = useState<ProjectTaskStatus>(initial?.status ?? "PENDING");
  const [progressPct, setProgressPct] = useState<number>(initial?.progressPct ?? 0);
  const [isMilestone, setIsMilestone] = useState<boolean>(!!initial?.isMilestone);
  const [description, setDescription] = useState<string>(initial?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = async () => {
    if (!titre.trim()) { setError("Le titre est requis"); return; }
    if (durationDays < 0 || !Number.isFinite(durationDays)) { setError("Durée invalide"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        titre: titre.trim(),
        phase,
        durationDays: Math.round(durationDays),
        predecessors,
        resourceUserIds: resourceUserIds.split(",").map((s) => s.trim()).filter(Boolean),
        status,
        progressPct: Math.max(0, Math.min(100, Math.round(progressPct))),
        isMilestone,
        description: description.trim() || null,
      });
      onClose();
    } catch (e: any) {
      setError(e?.message || "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const togglePred = (id: string) => {
    setPredecessors((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", width: "100%", maxWidth: 640, maxHeight: "85vh",
        overflow: "auto", borderTopLeftRadius: 16, borderTopRightRadius: 16,
        padding: 20, boxShadow: "0 -8px 24px rgba(0,0,0,0.15)",
      }}>
        <div style={{
          width: 40, height: 4, background: "#d1d5db", borderRadius: 2,
          margin: "0 auto 16px",
        }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>
            {mode === "create" ? "Nouvelle tâche" : `${initial?.numero ?? ""} — Éditer`}
          </h3>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", fontSize: 22, cursor: "pointer", color: "#6b7280",
          }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Titre">
            <input value={titre} onChange={(e) => setTitre(e.target.value)} style={inputStyle} placeholder="Ex : Plans niveaux 1/100" />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Phase">
              <select value={phase} onChange={(e) => setPhase(e.target.value as ProjectPhase)} style={inputStyle}>
                {Object.entries(PHASE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{k} — {v}</option>
                ))}
              </select>
            </Field>
            <Field label="Durée (jours)">
              <input
                type="number" min={0} value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 0)}
                style={inputStyle}
                disabled={isMilestone}
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Statut">
              <select value={status} onChange={(e) => setStatus(e.target.value as ProjectTaskStatus)} style={inputStyle}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label={`Progression (${progressPct}%)`}>
              <input
                type="range" min={0} max={100} value={progressPct}
                onChange={(e) => setProgressPct(parseInt(e.target.value, 10))}
                style={{ width: "100%" }}
              />
            </Field>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
            <input type="checkbox" checked={isMilestone} onChange={(e) => { setIsMilestone(e.target.checked); if (e.target.checked) setDurationDays(0); }} />
            Jalon (milestone)
          </label>

          <Field label="Description (optionnelle)">
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputStyle, minHeight: 60, fontFamily: "inherit" }}
              placeholder="Détails ou commentaires…"
            />
          </Field>

          <Field label="Assignés (IDs users, séparés par virgule)">
            <input value={resourceUserIds} onChange={(e) => setResourceUserIds(e.target.value)} style={inputStyle} placeholder="user_abc, user_def" />
          </Field>

          <Field label={`Prédécesseurs (${predecessors.length} sélectionnés)`}>
            <div style={{ maxHeight: 160, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 6, padding: 6 }}>
              {allTasks.filter((t) => t.id !== initial?.id).length === 0 && (
                <div style={{ fontSize: 12, color: "#9ca3af", padding: 8 }}>Aucune autre tâche disponible.</div>
              )}
              {allTasks.filter((t) => t.id !== initial?.id).map((t) => (
                <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: 4, fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={predecessors.includes(t.id)} onChange={() => togglePred(t.id)} />
                  <span style={{ fontWeight: 600, color: "#6b7280" }}>{t.numero}</span>
                  <span style={{ color: "#111827" }}>{t.titre}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "#9ca3af" }}>{t.phase}</span>
                </label>
              ))}
            </div>
          </Field>

          {error && (
            <div style={{ color: "#dc2626", fontSize: 13, padding: 8, background: "#fee2e2", borderRadius: 6 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 8 }}>
            {mode === "edit" && onDelete ? (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (confirm("Supprimer cette tâche ?")) {
                    await onDelete();
                    onClose();
                  }
                }}
                style={{ ...btnStyle, background: "#fff", color: "#dc2626", border: "1px solid #fecaca" }}
              >
                Supprimer
              </button>
            ) : <div />}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={onClose} style={{ ...btnStyle, background: "#fff", color: "#374151", border: "1px solid #d1d5db" }}>
                Annuler
              </button>
              <button type="button" onClick={handleSave} disabled={saving} style={{ ...btnStyle, background: "#6366f1", color: "#fff", border: "1px solid #6366f1" }}>
                {saving ? "…" : mode === "create" ? "Créer" : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {props.label}
      </span>
      {props.children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6,
  fontSize: 14, background: "#fff", color: "#111827", outline: "none",
};

const btnStyle: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
};
