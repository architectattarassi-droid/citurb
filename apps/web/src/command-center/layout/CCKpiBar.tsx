/**
 * CCKpiBar.tsx — Bandeau KPI atelier
 *
 * 6 compteurs réels lus dans Neon (GET /api/cc/snapshot/current, Pages
 * Function). Compteur indisponible → « — », jamais de valeur inventée.
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CC } from "../theme/tokens";

// ─── Types ───────────────────────────────────────────────────

interface CCKpis {
  leads7j: number | null;
  leadsTotal: number | null;
  rdvAVenir: number | null;
  dossiers: number | null;
  fournisseursEnAttente: number | null;
  terrainsEnAttente: number | null;
}

// ─── KPI config ──────────────────────────────────────────────

const buildKpis = (d: CCKpis | null) => [
  { id: "leads7",   mark: "I",   label: "Leads 7 jours",        value: fmtNum(d?.leads7j),               accent: CC.color.or,      to: "/cc/leads" },
  { id: "leads",    mark: "II",  label: "Leads au total",       value: fmtNum(d?.leadsTotal),            accent: CC.color.info,    to: "/cc/leads" },
  { id: "rdv",      mark: "III", label: "RDV à venir",          value: fmtNum(d?.rdvAVenir),             accent: CC.color.success, to: "/cc/rendez-vous" },
  { id: "dossiers", mark: "IV",  label: "Dossiers",             value: fmtNum(d?.dossiers),              accent: CC.color.navy,    to: "/cc/dossiers" },
  { id: "fourn",    mark: "V",   label: "Fournisseurs à valider", value: fmtNum(d?.fournisseursEnAttente), accent: CC.color.inkMid,  to: "/cc/fournisseurs" },
  { id: "terrains", mark: "VI",  label: "Terrains à valider",   value: fmtNum(d?.terrainsEnAttente),     accent: CC.color.warn,    to: "/cc/terrains" },
];

// ─── Composant ───────────────────────────────────────────────

export default function CCKpiBar() {
  const [kpis, setKpis] = useState<CCKpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cc/snapshot/current", { credentials: "same-origin" });
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok && data?.ok) setKpis(data as CCKpis);
      } catch { /* compteurs « — » */ } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={S.bar} className="cc-kpi-bar">
      {loading
        ? Array.from({ length: 6 }).map((_, i) => <div key={i} style={S.skeleton} />)
        : buildKpis(kpis).map(kpi => <KpiCard key={kpi.id} {...kpi} />)}
    </div>
  );
}

function KpiCard({ mark, label, value, accent, to }: { mark: string; label: string; value: string; accent: string; to: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={to}
      style={{ ...S.card, background: hovered ? CC.color.bgRaised : "transparent" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ ...S.cardMark, color: accent }}>{mark}</div>
      <div style={S.cardBody}>
        <div style={S.cardValue}>{value}</div>
        <div style={S.cardLabel}>{label}</div>
      </div>
    </Link>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + " k";
  return n.toString();
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
    cursor: "pointer",
    textDecoration: "none",
    color: "inherit",
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
