/**
 * GanttView — diagramme de Gantt SVG natif.
 *
 * Pas de lib externe. Rendu :
 *  - une ligne par tâche, hauteur fixe (ROW_H)
 *  - bandes de phase en fond (couleur tinted)
 *  - barre de tâche avec couleur phase, bord rouge si critique, progression
 *  - milestone = losange (rotated rect)
 *  - flèches grises de prédécesseur (FS)
 *  - axe temporel haut = jours (ou semaines si projet long)
 *
 * Mobile-first : SVG en width 100% avec overflow horizontal sur le parent.
 */

import React, { useMemo } from "react";
import {
  GanttPayload, PHASE_COLORS, PHASE_LABELS, ProjectTask, STATUS_LABELS,
} from "./project-calendar.api";

const ROW_H = 32;
const HEADER_H = 48;
const LEFT_W = 220;
const DAY_W_DEFAULT = 14;

export default function GanttView(props: {
  gantt: GanttPayload;
  tasks: ProjectTask[];
  onTaskClick?: (taskId: string) => void;
}) {
  const { gantt, tasks, onTaskClick } = props;

  const dayW = useMemo(() => {
    if (gantt.projectDuration <= 0) return DAY_W_DEFAULT;
    // Largeur cible 1000px → ajuste dayW pour tenir si projet long
    const target = 1000;
    const w = target / Math.max(gantt.projectDuration, 30);
    return Math.max(6, Math.min(28, Math.round(w)));
  }, [gantt.projectDuration]);

  const sortedBars = useMemo(() => {
    return [...gantt.bars].sort((a, b) => {
      // Tri par phase ordre canonique puis startDay puis numero
      const ph = PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase);
      if (ph !== 0) return ph;
      if (a.startDay !== b.startDay) return a.startDay - b.startDay;
      return a.numero.localeCompare(b.numero, undefined, { numeric: true });
    });
  }, [gantt.bars]);

  const rowIndex = new Map(sortedBars.map((b, i) => [b.taskId, i]));
  const totalH = HEADER_H + sortedBars.length * ROW_H + 16;
  const totalW = LEFT_W + Math.max(gantt.projectDuration, 30) * dayW + 24;

  const ticks = buildTicks(gantt.projectDuration, dayW);

  return (
    <div style={{ overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}>
      <svg width={totalW} height={totalH} style={{ display: "block", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {/* En-tête axe temporel */}
        <rect x={0} y={0} width={totalW} height={HEADER_H} fill="#f9fafb" />
        <text x={12} y={20} fontSize={11} fontWeight={600} fill="#374151">Tâche</text>
        {ticks.map((tk) => (
          <g key={tk.day}>
            <line
              x1={LEFT_W + tk.day * dayW}
              y1={HEADER_H}
              x2={LEFT_W + tk.day * dayW}
              y2={totalH}
              stroke={tk.major ? "#d1d5db" : "#f3f4f6"}
              strokeWidth={1}
            />
            {tk.major && (
              <text x={LEFT_W + tk.day * dayW + 2} y={20} fontSize={10} fill="#6b7280">
                {tk.label}
              </text>
            )}
          </g>
        ))}

        {/* Bandes de phase en fond */}
        {gantt.phases.map((ph) => (
          <rect
            key={ph.phase + ph.startDay}
            x={LEFT_W + ph.startDay * dayW}
            y={HEADER_H}
            width={Math.max(2, (ph.endDay - ph.startDay) * dayW)}
            height={totalH - HEADER_H}
            fill={PHASE_COLORS[ph.phase]}
            opacity={0.05}
          />
        ))}

        {/* Lignes de tâches */}
        {sortedBars.map((bar, i) => {
          const y = HEADER_H + i * ROW_H;
          const x = LEFT_W + bar.startDay * dayW;
          const w = Math.max(2, (bar.endDay - bar.startDay) * dayW);
          const cy = y + ROW_H / 2;
          return (
            <g key={bar.taskId} style={{ cursor: "pointer" }} onClick={() => onTaskClick?.(bar.taskId)}>
              {i % 2 === 0 && (
                <rect x={0} y={y} width={totalW} height={ROW_H} fill="#fafafa" />
              )}
              {/* Label gauche */}
              <text x={12} y={cy + 4} fontSize={11} fill="#111827">
                {bar.numero} {truncate(bar.titre, 24)}
              </text>

              {/* Barre / Milestone */}
              {bar.isMilestone ? (
                <g transform={`translate(${LEFT_W + bar.startDay * dayW},${cy})`}>
                  <polygon
                    points="-8,0 0,-8 8,0 0,8"
                    fill={PHASE_COLORS[bar.phase]}
                    stroke={bar.isCritical ? "#dc2626" : "#1f2937"}
                    strokeWidth={bar.isCritical ? 2 : 1}
                  />
                </g>
              ) : (
                <>
                  <rect
                    x={x}
                    y={y + 6}
                    width={w}
                    height={ROW_H - 12}
                    rx={4}
                    fill={PHASE_COLORS[bar.phase]}
                    opacity={0.25}
                    stroke={bar.isCritical ? "#dc2626" : "#4b5563"}
                    strokeWidth={bar.isCritical ? 2 : 1}
                  />
                  {/* Progression */}
                  {bar.progressPct > 0 && (
                    <rect
                      x={x}
                      y={y + 6}
                      width={(w * Math.min(100, bar.progressPct)) / 100}
                      height={ROW_H - 12}
                      rx={4}
                      fill={PHASE_COLORS[bar.phase]}
                      opacity={0.8}
                    />
                  )}
                  <text x={x + w + 6} y={cy + 4} fontSize={10} fill="#4b5563">
                    {bar.durationDays}j · {STATUS_LABELS[bar.status]}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Flèches de prédécesseurs */}
        {sortedBars.map((bar) => {
          return bar.predecessors.map((pid) => {
            const pIdx = rowIndex.get(pid);
            if (pIdx == null) return null;
            const pBar = sortedBars[pIdx];
            const x1 = LEFT_W + pBar.endDay * dayW;
            const y1 = HEADER_H + pIdx * ROW_H + ROW_H / 2;
            const x2 = LEFT_W + bar.startDay * dayW;
            const y2 = HEADER_H + (rowIndex.get(bar.taskId) ?? 0) * ROW_H + ROW_H / 2;
            const midX = Math.max(x1 + 4, x2 - 4);
            return (
              <g key={`${pid}->${bar.taskId}`}>
                <path
                  d={`M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`}
                  stroke="#9ca3af"
                  strokeWidth={1}
                  fill="none"
                />
                <polygon
                  points={`${x2 - 4},${y2 - 3} ${x2},${y2} ${x2 - 4},${y2 + 3}`}
                  fill="#9ca3af"
                />
              </g>
            );
          });
        })}
      </svg>

      {/* Légende */}
      <div style={{ padding: 8, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: "#6b7280", borderTop: "1px solid #f3f4f6" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#dc2626", marginRight: 4, borderRadius: 2 }} />Chemin critique</span>
        <span>◆ Jalon</span>
        {Object.entries(PHASE_LABELS).map(([k, v]) => {
          const present = gantt.phases.some((p) => p.phase === k);
          if (!present) return null;
          return (
            <span key={k}>
              <span style={{ display: "inline-block", width: 10, height: 10, background: PHASE_COLORS[k as keyof typeof PHASE_COLORS], marginRight: 4, borderRadius: 2 }} />
              {v}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const PHASE_ORDER: ReadonlyArray<ProjectTask["phase"]> = [
  "ESQ", "APS", "APD", "DCE", "DAO", "MARCHE", "EXEC", "RECEPTION", "GPA",
];

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function buildTicks(duration: number, dayW: number): { day: number; label: string; major: boolean }[] {
  const out: { day: number; label: string; major: boolean }[] = [];
  if (duration <= 0) return out;
  // Choix granularité selon largeur jour
  const stepDays = dayW >= 18 ? 1 : dayW >= 10 ? 7 : 14;
  const majorEvery = stepDays === 1 ? 7 : stepDays === 7 ? 4 : 4;
  for (let d = 0; d <= duration; d += stepDays) {
    const major = (d / stepDays) % majorEvery === 0;
    out.push({ day: d, label: stepDays >= 7 ? `S${Math.round(d / 7)}` : `J${d}`, major });
  }
  return out;
}
