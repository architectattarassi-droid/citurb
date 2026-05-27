/**
 * LivraisonsCalendar — vue semaine des livraisons à venir.
 * Affiche par jour (Lun→Dim) les créneaux livraisons cliquables.
 * Mobile-first : empile en vertical sur petit écran, grille 7-col sur desktop.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarItem,
  STATUS_COLOR,
  currentIsoWeek,
  fmtMad,
  livraisonsApi,
} from "./livraisons-materiaux.api";

type Props = {
  dossierId: string;
  initialWeek?: string;
  onPickItem?: (item: CalendarItem) => void;
};

const S = {
  wrap: { background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #e2e8f0" },
  head: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 12,
    gap: 8,
    flexWrap: "wrap" as const,
  },
  title: { fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 },
  navBtn: {
    background: "#f1f5f9",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 40,
  } as React.CSSProperties,
  grid: {
    display: "grid",
    gap: 8,
  } as React.CSSProperties,
  day: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 8,
    minHeight: 80,
  } as React.CSSProperties,
  dayHead: { fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6 },
  slot: {
    background: "#fff",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    cursor: "pointer",
    fontSize: 12,
    textAlign: "left" as const,
    width: "100%",
    minHeight: 56,
  } as React.CSSProperties,
  badge: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: 999,
    marginBottom: 4,
  } as React.CSSProperties,
  empty: { fontSize: 12, color: "#94a3b8", fontStyle: "italic" as const },
};

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function isoWeekToRange(week: string): { start: Date; end: Date } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(week);
  if (!m) return null;
  const year = Number(m[1]);
  const w = Number(m[2]);
  // Lundi = jour 1 de la semaine ISO.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Mon = new Date(jan4.getTime() - (jan4Day - 1) * 86400000);
  const start = new Date(week1Mon.getTime() + (w - 1) * 7 * 86400000);
  const end = new Date(start.getTime() + 6 * 86400000);
  return { start, end };
}

function shiftWeek(week: string, delta: number): string {
  const range = isoWeekToRange(week);
  if (!range) return week;
  const newDate = new Date(range.start.getTime() + delta * 7 * 86400000);
  // Recompute ISO week key
  const target = new Date(Date.UTC(newDate.getUTCFullYear(), newDate.getUTCMonth(), newDate.getUTCDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((+target - +yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-${String(weekNum).padStart(2, "0")}`;
}

export default function LivraisonsCalendar({ dossierId, initialWeek, onPickItem }: Props) {
  const [week, setWeek] = useState<string>(initialWeek || currentIsoWeek());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    livraisonsApi
      .calendar(dossierId, week)
      .then((r) => { if (!cancelled) setItems(r.items); })
      .catch((e) => { if (!cancelled) setErr(e?.message || "Erreur"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dossierId, week]);

  const range = useMemo(() => isoWeekToRange(week), [week]);

  // Group items by day-of-week (0..6)
  const byDay = useMemo(() => {
    const out: CalendarItem[][] = [[], [], [], [], [], [], []];
    for (const it of items) {
      try {
        const d = new Date(it.dateLivraisonSouhaitee);
        const day = (d.getDay() || 7) - 1; // Lun=0 … Dim=6
        out[day].push(it);
      } catch { /* ignore */ }
    }
    return out;
  }, [items]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const gridTemplate = isMobile ? "1fr" : "repeat(7, 1fr)";

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <h3 style={S.title}>
          Semaine {week} {range && `(${range.start.toLocaleDateString("fr-FR")} → ${range.end.toLocaleDateString("fr-FR")})`}
        </h3>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={S.navBtn} onClick={() => setWeek(shiftWeek(week, -1))}>← Sem. préc.</button>
          <button style={S.navBtn} onClick={() => setWeek(currentIsoWeek())}>Aujourd'hui</button>
          <button style={S.navBtn} onClick={() => setWeek(shiftWeek(week, +1))}>Sem. suiv. →</button>
        </div>
      </div>

      {loading && <div style={{ color: "#64748b", fontSize: 13 }}>Chargement…</div>}
      {err && <div style={{ color: "#991b1b", fontSize: 13 }}>{err}</div>}

      <div style={{ ...S.grid, gridTemplateColumns: gridTemplate }}>
        {DAYS_FR.map((label, i) => {
          const dayDate = range ? new Date(range.start.getTime() + i * 86400000) : null;
          return (
            <div key={label} style={S.day}>
              <div style={S.dayHead}>
                {label} {dayDate && dayDate.getDate()}
              </div>
              {byDay[i].length === 0 ? (
                <div style={S.empty}>—</div>
              ) : (
                byDay[i].map((it) => {
                  const st = STATUS_COLOR[it.status];
                  return (
                    <button
                      key={it.commandeId}
                      style={S.slot}
                      onClick={() => onPickItem?.(it)}
                    >
                      <span style={{ ...S.badge, background: st.bg, color: st.fg }}>{st.label}</span>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>
                        {it.nbLignes} ligne(s)
                      </div>
                      <div style={{ color: "#64748b" }}>{fmtMad(it.totalTtc)}</div>
                      <div style={{ color: "#94a3b8", marginTop: 4 }}>
                        {it.adresseLivraison.slice(0, 40)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
