import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TOTAL_PHASES = 12;

const S = {
  wrap: { color: '#e8eaf0', background: '#0d1117', border: '1px solid #1e2330', borderRadius: 10, padding: 24 } as React.CSSProperties,
  h1: { marginTop: 0, fontSize: 18, fontWeight: 700 } as React.CSSProperties,
  bar: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const },
  sel: { background: '#1e2330', color: '#e8eaf0', border: '1px solid #2d3548', borderRadius: 6, padding: '4px 10px', fontSize: 13 } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 } as React.CSSProperties,
  th: { textAlign: 'left' as const, padding: '8px 10px', color: '#8892a4', borderBottom: '1px solid #1e2330', fontWeight: 600 } as React.CSSProperties,
  td: { padding: '7px 10px', borderBottom: '1px solid #1a2030', cursor: 'pointer' } as React.CSSProperties,
  empty: { color: '#8892a4', padding: 16, textAlign: 'center' as const } as React.CSSProperties,
  err: { color: '#f87171', padding: 12 } as React.CSSProperties,
};

function PhaseBadge({ phase }: { phase: string }) {
  const label = phase?.replace('PHASE_', '').replace(/_/g, ' ') ?? '—';
  const isAuto = phase?.includes('AUTORISATION');
  const isEsq = phase?.includes('ESQUISSE');
  const bg = isAuto ? '#1a3a2a' : isEsq ? '#1a2a3a' : '#1e2330';
  const color = isAuto ? '#4ade80' : isEsq ? '#60a5fa' : '#8892a4';
  return <span style={{ background: bg, color, borderRadius: 4, padding: '2px 7px', fontSize: 11 }}>{label}</span>;
}

function ProgressBar({ records }: { records: any[] }) {
  const completed = (records ?? []).filter((r: any) => r.statut === 'COMPLETE').length;
  const pct = Math.round((completed / TOTAL_PHASES) * 100);
  const color = pct >= 75 ? '#4ade80' : pct >= 40 ? '#f59e0b' : '#3b82f6';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 6, background: '#1e2330', borderRadius: 3, minWidth: 60 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, color: '#8892a4', whiteSpace: 'nowrap' as const }}>{completed}/{TOTAL_PHASES}</span>
    </div>
  );
}

export default function ProjectsModule() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterPhase, setFilterPhase] = useState('');
  const [filterPorte, setFilterPorte] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('citurbarea.token') || '';
    fetch('/p2/dossier/ops/all', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(() => setError('Erreur chargement'))
      .finally(() => setLoading(false));
  }, []);

  const phases = [...new Set(data.map((d: any) => d.phase).filter(Boolean))].sort() as string[];
  const portes = [...new Set(data.map((d: any) => d.porteType).filter(Boolean))].sort() as string[];
  const filtered = data.filter((d: any) =>
    (!filterPhase || d.phase === filterPhase) && (!filterPorte || d.porteType === filterPorte),
  );

  if (loading) return <div style={S.wrap}><p style={S.empty}>Chargement…</p></div>;
  if (error) return <div style={S.wrap}><p style={S.err}>{error}</p></div>;

  return (
    <div style={S.wrap}>
      <h1 style={S.h1}>Projets — {filtered.length} dossiers</h1>
      <div style={S.bar}>
        <select style={S.sel} value={filterPhase} onChange={e => setFilterPhase(e.target.value)}>
          <option value=''>Toutes phases</option>
          {phases.map(p => <option key={p} value={p}>{p.replace('PHASE_', '').replace(/_/g, ' ')}</option>)}
        </select>
        <select style={S.sel} value={filterPorte} onChange={e => setFilterPorte(e.target.value)}>
          <option value=''>Tous types</option>
          {portes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <table style={S.table}>
        <thead>
          <tr>
            {['Réf.', 'Commune', 'Phase courante', 'Progression', 'Type', 'Gestion', 'Client'].map(h =>
              <th key={h} style={S.th}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {filtered.map((d: any) => (
            <tr key={d.id}
              onClick={() => navigate(`/cc/dossiers/${d.id}`)}
              onMouseEnter={e => (e.currentTarget.style.background = '#151d2e')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              <td style={S.td}>{d.refInterne ?? d.id.slice(0, 8)}</td>
              <td style={S.td}>{d.commune ?? '—'}</td>
              <td style={S.td}><PhaseBadge phase={d.phase} /></td>
              <td style={{ ...S.td, minWidth: 120 }}><ProgressBar records={d.phaseRecords} /></td>
              <td style={S.td}>{d.porteType ?? '—'}</td>
              <td style={S.td}>{d.gestionMode ?? '—'}</td>
              <td style={S.td}>{d.clientNom ?? d.owner?.email ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && <p style={S.empty}>Aucun résultat</p>}
    </div>
  );
}
