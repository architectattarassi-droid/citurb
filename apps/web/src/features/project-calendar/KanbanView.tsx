/**
 * KanbanView — 4 colonnes (Pending / In Progress / Blocked / Completed).
 *
 * Drag & drop natif HTML5 (sans lib). Sur mobile, le drag tap-to-select
 * fallback : tap une carte puis tap une colonne cible.
 */

import React, { useState } from "react";
import {
  PHASE_COLORS, PHASE_LABELS, ProjectTask, ProjectTaskStatus, STATUS_LABELS,
} from "./project-calendar.api";

const COLUMNS: ProjectTaskStatus[] = ["PENDING", "IN_PROGRESS", "BLOCKED", "COMPLETED"];

const COL_BG: Record<ProjectTaskStatus, string> = {
  PENDING: "#f3f4f6",
  IN_PROGRESS: "#dbeafe",
  BLOCKED: "#fee2e2",
  COMPLETED: "#dcfce7",
  CANCELED: "#fafafa",
};

export default function KanbanView(props: {
  tasks: ProjectTask[];
  onChangeStatus: (taskId: string, status: ProjectTaskStatus) => void;
  onTaskClick?: (taskId: string) => void;
}) {
  const { tasks, onChangeStatus, onTaskClick } = props;
  const [dragId, setDragId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const grouped: Record<ProjectTaskStatus, ProjectTask[]> = {
    PENDING: [], IN_PROGRESS: [], BLOCKED: [], COMPLETED: [], CANCELED: [],
  };
  for (const t of tasks) (grouped[t.status] ||= []).push(t);

  const handleDrop = (status: ProjectTaskStatus) => {
    const id = dragId ?? selectedId;
    if (!id) return;
    onChangeStatus(id, status);
    setDragId(null);
    setSelectedId(null);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
      {COLUMNS.map((col) => (
        <div
          key={col}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(col)}
          onClick={() => selectedId && handleDrop(col)}
          style={{
            background: COL_BG[col],
            borderRadius: 8,
            padding: 10,
            minHeight: 320,
            border: selectedId ? "2px dashed #6366f1" : "1px solid transparent",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#111827" }}>
            {STATUS_LABELS[col]} <span style={{ color: "#6b7280", fontWeight: 400 }}>({grouped[col].length})</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {grouped[col].map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={() => setDragId(t.id)}
                onDragEnd={() => setDragId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedId === t.id) setSelectedId(null);
                  else if (selectedId == null) { setSelectedId(t.id); }
                  else { onTaskClick?.(t.id); }
                }}
                onDoubleClick={() => onTaskClick?.(t.id)}
                style={{
                  background: "#fff",
                  borderRadius: 6,
                  padding: 10,
                  border: selectedId === t.id ? "2px solid #6366f1" : t.isCritical ? "1px solid #dc2626" : "1px solid #e5e7eb",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{
                    display: "inline-block", width: 8, height: 8, borderRadius: 8,
                    background: PHASE_COLORS[t.phase],
                  }} />
                  <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>
                    {t.numero} · {PHASE_LABELS[t.phase]}
                  </span>
                  {t.isCritical && (
                    <span style={{ marginLeft: "auto", fontSize: 9, color: "#dc2626", fontWeight: 700 }}>
                      CRITIQUE
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>
                  {t.isMilestone && "◆ "}{t.titre}
                </div>
                <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: "#6b7280" }}>
                  <span>{t.durationDays}j</span>
                  <span>{t.progressPct}%</span>
                </div>
                {t.progressPct > 0 && (
                  <div style={{ marginTop: 4, height: 3, background: "#e5e7eb", borderRadius: 2 }}>
                    <div style={{
                      width: `${Math.min(100, t.progressPct)}%`,
                      height: "100%",
                      background: PHASE_COLORS[t.phase],
                      borderRadius: 2,
                    }} />
                  </div>
                )}
                {t.blockers.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 10, color: "#dc2626" }}>
                    {t.blockers.length} blocage{t.blockers.length > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            ))}
            {grouped[col].length === 0 && (
              <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", padding: 16 }}>
                Aucune tâche
              </div>
            )}
          </div>
        </div>
      ))}
      {selectedId && (
        <div style={{
          position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
          background: "#111827", color: "#fff", padding: "8px 14px", borderRadius: 999,
          fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 100,
        }}>
          Tâche sélectionnée — tap une colonne pour déplacer · tap encore pour ouvrir
        </div>
      )}
    </div>
  );
}
