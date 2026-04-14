import React, { useEffect, useState } from 'react';

const S = {
  wrap: { color: '#e8eaf0', background: '#0d1117', border: '1px solid #1e2330', borderRadius: 10, padding: 24 } as React.CSSProperties,
  h1: { marginTop: 0, fontSize: 18, fontWeight: 700 } as React.CSSProperties,
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14, marginBottom: 24 } as React.CSSProperties,
  card: { background: '#111827', border: '1px solid #1e2330', borderRadius: 8, padding: '16px 18px' } as React.CSSProperties,
  label: { fontSize: 11, color: '#8892a4', textTransform: 'uppercase' as const, letterSpacing: 1 },
  value: { fontSize: 28, fontWeight: 700, marginTop: 6, color: '#e8eaf0' },
  sub: { fontSize: 12, color: '#4ade80', marginTop: 2 },
  section: { marginTop: 20 } as React.CSSProperties,
  sh: { fontSize: 14, fontWeight: 600, color: '#8892a4', marginBottom: 10 } as React.CSSProperties,
  row: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #1a2030', fontSize: 13 } as React.CSSProperties,
  empty: { color: '#8892a4', padding: 16, textAlign: 'center' as const } as React.CSSProperties,
  err: { color: '#f87171', padding: 12 } as React.CSSProperties,
};

export default function BusinessModule() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('citurbarea.token') || '';
    fetch('/p2/dossier/ops/all', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setData(Array.isArray(d) ? d : [])).catch(() => setError('Erreur chargement'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={S.wrap}><p style={S.empty}>Chargement…</p></div>;
  if (error) return <div style={S.wrap}><p style={S.err}>{error}</p></div>;

  const actifs = data.filter((d: any) => d.status !== 'CLOSED');
  const avecFirm = data.filter((d: any) => d.firmId).length;
  const sansFirm = data.length - avecFirm;

  const thisMo = new Date(); thisMo.setDate(1); thisMo.setHours(0, 0, 0, 0);
  const cesMois = data.filter((d: any) => new Date(d.createdAt) >= thisMo).length;

  const byPorte: Record<string, number> = {};
  data.forEach((d: any) => { const k = d.porteType || '—'; byPorte[k] = (byPorte[k] || 0) + 1; });

  const byPhase: Record<string, number> = {};
  data.forEach((d: any) => { const k = d.phase || '—'; byPhase[k] = (byPhase[k] || 0) + 1; });
  const top5 = Object.entries(byPhase).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div style={S.wrap}>
      <h1 style={S.h1}>Business Intelligence</h1>
      <div style={S.grid}>
        <div style={S.card}>
          <div style={S.label}>Total dossiers</div>
          <div style={S.value}>{data.length}</div>
          <div style={S.sub}>{actifs.length} actifs</div>
        </div>
        <div style={S.card}>
          <div style={S.label}>Avec cabinet</div>
          <div style={S.value}>{avecFirm}</div>
          <div style={S.sub}>{sansFirm} sans firm</div>
        </div>
        <div style={S.card}>
          <div style={S.label}>Ce mois</div>
          <div style={S.value}>{cesMois}</div>
          <div style={S.sub}>nouveaux dossiers</div>
        </div>
      </div>
      <div style={S.section}>
        <div style={S.sh}>Par type de porte</div>
        {Object.entries(byPorte).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
          <div key={k} style={S.row}><span>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
        ))}
      </div>
      <div style={S.section}>
        <div style={S.sh}>Top 5 phases</div>
        {top5.map(([k, v]) => (
          <div key={k} style={S.row}>
            <span style={{ fontSize: 12, color: '#8892a4' }}>{k.replace('PHASE_', '').replace(/_/g, ' ')}</span>
            <span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
