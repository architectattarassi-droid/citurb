/**
 * CalendarMonthView — grille mois 7×6, chips de tâches sur les jours.
 * Overlay Hijri : petit numéro de jour hijri sous le grégorien.
 */

import React, { useMemo, useState } from "react";
import {
  gregorianToHijri, HIJRI_MONTHS, PHASE_COLORS, ProjectTask,
} from "./project-calendar.api";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function CalendarMonthView(props: {
  tasks: ProjectTask[];
  onTaskClick?: (taskId: string) => void;
}) {
  const { tasks, onTaskClick } = props;
  const [cursor, setCursor] = useState<Date>(() => {
    const today = new Date();
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  });

  const cells = useMemo(() => buildCells(cursor), [cursor]);
  const tasksByDay = useMemo(() => indexTasksByDay(tasks), [tasks]);

  const prev = () => setCursor((c) => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() - 1, 1)));
  const next = () => setCursor((c) => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, 1)));

  return (
    <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 16px", borderBottom: "1px solid #f3f4f6", background: "#fafafa",
      }}>
        <button onClick={prev} style={btnStyle}>‹</button>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", textAlign: "center" }}>
          {MONTHS[cursor.getUTCMonth()]} {cursor.getUTCFullYear()}
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 400 }}>
            {hijriMonthLabel(cursor)}
          </div>
        </div>
        <button onClick={next} style={btnStyle}>›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#f9fafb" }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{
            padding: "6px 8px", fontSize: 11, color: "#6b7280", fontWeight: 600, textAlign: "center",
          }}>{w}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map((cell, i) => {
          const dayKey = cell.date.toISOString().slice(0, 10);
          const dayTasks = tasksByDay.get(dayKey) ?? [];
          const hijri = gregorianToHijri(cell.date);
          const isToday = isSameDay(cell.date, new Date());
          return (
            <div
              key={i}
              style={{
                minHeight: 90,
                padding: 4,
                borderRight: (i + 1) % 7 === 0 ? "none" : "1px solid #f3f4f6",
                borderBottom: "1px solid #f3f4f6",
                background: cell.inMonth ? "#fff" : "#fafafa",
                opacity: cell.inMonth ? 1 : 0.45,
                position: "relative",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{
                  fontSize: 12, fontWeight: isToday ? 700 : 500,
                  color: isToday ? "#fff" : "#111827",
                  background: isToday ? "#6366f1" : "transparent",
                  borderRadius: 999, width: 22, height: 22,
                  display: "inline-flex", justifyContent: "center", alignItems: "center",
                }}>
                  {cell.date.getUTCDate()}
                </span>
                <span style={{ fontSize: 9, color: "#9ca3af" }} title={`${hijri.day} ${HIJRI_MONTHS[hijri.month - 1] ?? ""} ${hijri.year}`}>
                  {hijri.day}/{hijri.month}
                </span>
              </div>
              <div style={{ marginTop: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                {dayTasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onTaskClick?.(t.id)}
                    style={{
                      fontSize: 10,
                      padding: "1px 4px",
                      borderRadius: 3,
                      background: PHASE_COLORS[t.phase],
                      color: "#fff",
                      opacity: t.isCritical ? 1 : 0.85,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      border: t.isCritical ? "1px solid #fff" : "none",
                    }}
                    title={`${t.numero} ${t.titre}`}
                  >
                    {t.isMilestone && "◆ "}{t.titre}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div style={{ fontSize: 9, color: "#6b7280", paddingLeft: 4 }}>
                    +{dayTasks.length - 3} autres
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 999, border: "1px solid #d1d5db",
  background: "#fff", cursor: "pointer", fontSize: 18, color: "#374151",
};

type Cell = { date: Date; inMonth: boolean };

function buildCells(firstOfMonth: Date): Cell[] {
  const y = firstOfMonth.getUTCFullYear();
  const m = firstOfMonth.getUTCMonth();
  const firstDow = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; // Lundi=0
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells: Cell[] = [];
  // Jours du mois précédent
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m, -i));
    cells.push({ date: d, inMonth: false });
  }
  // Jours du mois
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(Date.UTC(y, m, d)), inMonth: true });
  }
  // Complète à 42
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last);
    d.setUTCDate(last.getUTCDate() + 1);
    cells.push({ date: d, inMonth: false });
  }
  return cells;
}

function indexTasksByDay(tasks: ProjectTask[]): Map<string, ProjectTask[]> {
  const map = new Map<string, ProjectTask[]>();
  for (const t of tasks) {
    if (!t.startAt || !t.endAt) continue;
    const start = new Date(t.startAt);
    const end = new Date(t.endAt);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;
    const cur = new Date(start);
    let safety = 365 * 5;
    while (cur <= end && safety-- > 0) {
      const key = cur.toISOString().slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }
  return map;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate();
}

function hijriMonthLabel(d: Date): string {
  const h = gregorianToHijri(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 15)));
  return `${HIJRI_MONTHS[h.month - 1] ?? ""} ${h.year} AH`;
}
