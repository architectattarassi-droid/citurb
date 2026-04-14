/**
 * CCKpiBar.tsx
 * Barre KPI globale — 6 métriques clés en haut du Command Center
 * Se charge via /api/cc/snapshot (endpoint NestJS)
 */

import React, { useEffect, useState } from 'react';

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
  {
    id: 'subs',
    icon: '▶',
    label: 'Abonnés YouTube',
    value: fmtNum(d.ytSubscribers),
    color: '#ff4444',
    trend: null,
  },
  {
    id: 'emails',
    icon: '◉',
    label: 'Emails collectés',
    value: fmtNum(d.emailsCollected),
    color: '#00d4aa',
    trend: null,
  },
  {
    id: 'leads',
    icon: '◎',
    label: 'Leads CITURBAREA',
    value: fmtNum(d.leadsNew),
    color: '#0088ff',
    trend: null,
  },
  {
    id: 'consult',
    icon: '◈',
    label: 'Consultations',
    value: fmtNum(d.consultationsDone),
    color: '#f59e0b',
    trend: null,
  },
  {
    id: 'projects',
    icon: '⬡',
    label: 'Projets actifs',
    value: fmtNum(d.projectsActive),
    color: '#a855f7',
    trend: null,
  },
  {
    id: 'revenue',
    icon: '◆',
    label: 'Revenus (mois)',
    value: fmtDH(d.revenueMois),
    color: '#34d399',
    trend: null,
  },
];

// ─── Composant ───────────────────────────────────────────────

export default function CCKpiBar() {
  const [kpis, setKpis] = useState<CCKpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKpis();
  }, []);

  async function fetchKpis() {
    try {
      const res = await fetch('/api/cc/snapshot/current');
      if (!res.ok) throw new Error('fetch failed');
      const data: CCKpis = await res.json();
      setKpis(data);
    } catch {
      // Fallback données démo
      setKpis({
        ytSubscribers: 0,
        emailsCollected: 0,
        leadsNew: 0,
        consultationsDone: 0,
        projectsActive: 0,
        revenueMois: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  const items = kpis ? buildKpis(kpis) : [];

  return (
    <div style={styles.bar}>
      {loading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={styles.skeleton} />
          ))
        : items.map(kpi => (
            <KpiCard key={kpi.id} {...kpi} />
          ))}
    </div>
  );
}

// ─── KpiCard ─────────────────────────────────────────────────

function KpiCard({ icon, label, value, color }: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        ...styles.card,
        borderColor: hovered ? color + '40' : '#1e2330',
        background: hovered ? '#131820' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ ...styles.cardIcon, color }}>
        {icon}
      </div>
      <div style={styles.cardBody}>
        <div style={styles.cardValue}>{value}</div>
        <div style={styles.cardLabel}>{label}</div>
      </div>
      {/* Accent line */}
      <div style={{ ...styles.accentLine, background: color }} />
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function fmtDH(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M DH';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K DH';
  return n + ' DH';
}

// ─── Styles ──────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 0,
    borderBottom: '1px solid #1e2330',
    background: '#0d1017',
    flexShrink: 0,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    borderRight: '1px solid #1e2330',
    border: '1px solid transparent',
    cursor: 'default',
    transition: 'all 0.15s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  cardIcon: {
    fontSize: 16,
    flexShrink: 0,
    opacity: 0.85,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#e8eaf0',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    fontFamily: "'DM Mono', 'IBM Plex Mono', monospace",
  },
  cardLabel: {
    fontSize: 9,
    color: '#4a5568',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  accentLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.6,
  },
  skeleton: {
    height: 58,
    background: 'linear-gradient(90deg, #1e2330 25%, #252d3d 50%, #1e2330 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRight: '1px solid #1e2330',
  },
};
