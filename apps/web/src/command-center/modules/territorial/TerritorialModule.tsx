import React, { useEffect, useState } from 'react';

const S = {
  wrap: { color: '#e8eaf0', background: '#0d1117', border: '1px solid #1e2330', borderRadius: 10, padding: 24 } as React.CSSProperties,
  h1: { marginTop: 0, fontSize: 18, fontWeight: 700 } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 } as React.CSSProperties,
  th: { textAlign: 'left' as const, padding: '8px 10px', color: '#8892a4', borderBottom: '1px solid #1e2330', fontWeight: 600 } as React.CSSProperties,
  td: { padding: '7px 10px', borderBottom: '1px solid #1a2030' } as React.CSSProperties,
  bar: { display: 'inline-block', height: 8, background: '#3b82f6', borderRadius: 4, minWidth: 4 } as React.CSSProperties,
  empty: { color: '#8892a4', padding: 16, textAlign: 'center' as const } as React.CSSProperties,
  err: { color: '#f87171', padding: 12 } as React.CSSProperties,
};

export default function TerritorialModule() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('citurbarea.token') || '';
    fetch('/p2/dossier/ops/all', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setData(Array.isArray(d) ? d : [])).catch(() => setError('Erreur chargement'))
      .finally(() => setLoading(false));
  }, []);

  const byCommune = Object.entries(
    data.reduce((acc: Record<string, any[]>, d: any) => {
      const c = d.commune || '(non renseignée)';
      acc[c] = acc[c] || [];
      acc[c].push(d);
      return acc;
    }, {}),
  )
    .map(([commune, dossiers]) => {
      const phases = dossiers.map((d: any) => d.phase).filter(Boolean);
      const phaseCount: Record<string, number> = {};
      phases.forEach((p: string) => { phaseCount[p] = (phaseCount[p] || 0) + 1; });
      const dominante = Object.entries(phaseCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
      return { commune, nb: dossiers.length, dominante, avecFirm: dossiers.filter((d: any) => d.firmId).length };
    })
    .sort((a, b) => b.nb - a.nb);

  const max = byCommune[0]?.nb ?? 1;

  if (loading) return <div style={S.wrap}><p style={S.empty}>Chargement…</p></div>;
  if (error) return <div style={S.wrap}><p style={S.err}>{error}</p></div>;

  return (
    <div style={S.wrap}>
      <h1 style={S.h1}>Territorial — {byCommune.length} communes</h1>
      <table style={S.table}>
        <thead>
          <tr>{['Commune', 'Dossiers', 'Répartition', 'Phase dominante', 'Avec firm'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {byCommune.map(r => (
            <tr key={r.commune}
              onMouseEnter={e => (e.currentTarget.style.background = '#151d2e')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              <td style={S.td}>{r.commune}</td>
              <td style={{ ...S.td, fontWeight: 600 }}>{r.nb}</td>
              <td style={S.td}><span style={{ ...S.bar, width: `${Math.round((r.nb / max) * 120)}px` }} /></td>
              <td style={{ ...S.td, color: '#8892a4', fontSize: 12 }}>{r.dominante.replace('PHASE_', '').replace(/_/g, ' ')}</td>
              <td style={{ ...S.td, color: r.avecFirm === r.nb ? '#4ade80' : '#f59e0b' }}>{r.avecFirm}/{r.nb}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {byCommune.length === 0 && <p style={S.empty}>Aucune donnée</p>}
    </div>
  );
}
