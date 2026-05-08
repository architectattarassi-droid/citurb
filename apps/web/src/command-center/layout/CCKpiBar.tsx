/**
 * CCKpiBar.tsx — Bandeau KPI atelier
 *
 * 6 métriques essentielles, présentées comme des chiffres gravés sur papier.
 * Source : /api/cc/snapshot/current.
 */

import React, { useEffect, useState } from "react";
import { CC } from "../theme/tokens";

// ─── Types ───────────────────────────────────────────────────

interface CCKpis {
  ytSubscribers: number;
  emailsCollected: number;
  leadsNew: number;
  consultationsDone: number;
  projectsActive: number;
  revenueMois: number;
}

// ─── KPI config ──────────────────────────────────────────────

const buildKpis = (d: CCKpis) => [
  { id: "leads",    mark: "I",   label: "Leads", value: fmtNum(d.leadsNew),               accent: CC.color.or },
  { id: "consult",  mark: "II",  label: "Consultations", value: fmtNum(d.consultationsDone), accent: CC.color.info },
  { id: "projects", mark: "III", label: "Projets actifs", value: fmtNum(d.projectsActive),   accent: CC.color.success },
  { id: "revenue",  mark: "IV",  label: "Revenus du mois", value: fmtDH(d.revenueMois),      accent: CC.color.navy },
  { id: "emails",   mark: "V",   label: "Emails collectés", value: fmtNum(d.emailsCollected), accent: CC.color.inkMid },
  { id: "subs",     mark: "VI",  label: "Abonnés YouTube", value: fmtNum(d.ytSubscribers),    accent: CC.color.warn },
];

// ─── Composant ───────────────────────────────────────────────

export default function CCKpiBar() {
  const [kpis, setKpis] = useState<CCKpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cc/snapshot/current");
        if (!res.ok) throw new Error("fetch failed");
        const data: CCKpis = await res.json();
        if (!cancelled) setKpis(data);
      } catch {
        if (!cancelled) {
          setKpis({ ytSubscribers: 0, emailsCollected: 0, leadsNew: 0, consultationsDone: 0, projectsActive: 0, revenueMois: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const items = kpis ? buildKpis(kpis) : [];

  return (
    <div style={S.bar}>
      {loading
        ? Array.from({ length: 6 }).map((_, i) => <div key={i} style={S.skeleton} />)
        : items.map(kpi => <KpiCard key={kpi.id} {...kpi} />)}
    </div>
  );
}

function KpiCard({ mark, label, value, accent }: { mark: string; label: string; value: string; accent: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ ...S.card, background: hovered ? CC.color.bgRaised : "transparent" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ ...S.cardMark, color: accent }}>{mark}</div>
      <div style={S.cardBody}>
        <div style={S.cardValue}>{value}</div>
        <div style={S.cardLabel}>{label}</div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + " k";
  return n.toString();
}

function fmtDH(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + " M DH";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + " k DH";
  return n + " DH";
}

// ─── Styles ──────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  bar: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 0,
    background: CC.color.bgSoft,
    borderBottom: `1px solid ${CC.color.border}`,
    flexShrink: 0,
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "16px 24px",
    borderRight: `1px solid ${CC.color.border}`,
    cursor: "default",
    transition: `background 0.18s ${CC.ease}`,
    minHeight: 76,
  },
  cardMark: {
    fontFamily: CC.font.display,
    fontStyle: "italic",
    fontSize: 22,
    fontWeight: 600,
    flexShrink: 0,
    width: 32,
    textAlign: "center",
    opacity: 0.85,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardValue: {
    fontFamily: CC.font.display,
    fontSize: 26,
    fontWeight: 600,
    color: CC.color.navy,
    letterSpacing: "-0.02em",
    lineHeight: 1.05,
  },
  cardLabel: {
    fontSize: 10.5,
    color: CC.color.inkMuted,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontWeight: 500,
    marginTop: 4,
  },
  skeleton: {
    minHeight: 76,
    background: `linear-gradient(90deg, ${CC.color.bgSoft} 25%, ${CC.color.border} 50%, ${CC.color.bgSoft} 75%)`,
    backgroundSize: "200% 100%",
    borderRight: `1px solid ${CC.color.border}`,
    opacity: 0.6,
  },
};
