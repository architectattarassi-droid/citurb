/**
 * CriticalPathBanner — bandeau en-tête affichant la durée projet + chemin critique.
 */

import React from "react";
import type { CpmResult, ProjectTask } from "./project-calendar.api";

export default function CriticalPathBanner(props: {
  cpm: CpmResult | null;
  tasks: ProjectTask[];
  projectStart: string | null;
  projectEnd: string | null;
  onTaskClick?: (taskId: string) => void;
}) {
  const { cpm, tasks, projectStart, projectEnd, onTaskClick } = props;
  if (!cpm) return null;

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const months = Math.round((cpm.projectDuration / 30) * 10) / 10;

  return (
    <div style={{
      background: "linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%)",
      border: "1px solid #fecaca",
      borderRadius: 12,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: "#7f1d1d", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Chemin critique
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#991b1b" }}>
            {cpm.projectDuration} jours <span style={{ fontSize: 13, fontWeight: 500, color: "#9a3412" }}>(~{months} mois)</span>
          </div>
        </div>
        {projectStart && (
          <div style={{ paddingLeft: 12, borderLeft: "2px solid #fecaca" }}>
            <div style={{ fontSize: 11, color: "#7f1d1d", fontWeight: 600 }}>Début</div>
            <div style={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{projectStart}</div>
          </div>
        )}
        {projectEnd && (
          <div style={{ paddingLeft: 12, borderLeft: "2px solid #fecaca" }}>
            <div style={{ fontSize: 11, color: "#7f1d1d", fontWeight: 600 }}>Fin estimée</div>
            <div style={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{projectEnd}</div>
          </div>
        )}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#7f1d1d" }}>
          {cpm.criticalPath.length} tâche{cpm.criticalPath.length > 1 ? "s" : ""} critique{cpm.criticalPath.length > 1 ? "s" : ""}
        </div>
      </div>

      {cpm.criticalPath.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {cpm.criticalPath.map((id, i) => {
            const t = byId.get(id);
            if (!t) return null;
            return (
              <React.Fragment key={id}>
                {i > 0 && <span style={{ color: "#dc2626", fontWeight: 700 }}>→</span>}
                <button
                  type="button"
                  onClick={() => onTaskClick?.(id)}
                  style={{
                    background: "#fee2e2",
                    color: "#991b1b",
                    border: "1px solid #fca5a5",
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  title={`${t.titre} (${t.durationDays}j, slack=0)`}
                >
                  {t.numero} {trunc(t.titre, 20)}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
