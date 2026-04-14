import React from 'react';

const S = {
  wrap: { color: '#e8eaf0', background: '#0d1117', border: '1px solid #1e2330', borderRadius: 10, padding: 24 } as React.CSSProperties,
  h1: { marginTop: 0, fontSize: 18, fontWeight: 700 } as React.CSSProperties,
  sub: { color: '#8892a4', fontSize: 13, marginBottom: 28 } as React.CSSProperties,
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 } as React.CSSProperties,
  card: { background: '#111827', border: '1px solid #1e2330', borderRadius: 8, padding: '32px 20px', textAlign: 'center' as const } as React.CSSProperties,
  icon: { fontSize: 32, marginBottom: 12 },
  label: { fontWeight: 600, fontSize: 15, marginBottom: 6 } as React.CSSProperties,
  badge: { display: 'inline-block', background: '#1e2330', color: '#8892a4', borderRadius: 4, padding: '2px 8px', fontSize: 11 } as React.CSSProperties,
};

const CARDS = [
  { icon: '🎬', label: 'Vidéos' },
  { icon: '📱', label: 'Reels' },
  { icon: '📝', label: 'Articles' },
];

export default function MediaModule() {
  return (
    <div style={S.wrap}>
      <h1 style={S.h1}>Cities Talk — Module Médias</h1>
      <p style={S.sub}>Disponible Sprint 5</p>
      <div style={S.grid}>
        {CARDS.map(c => (
          <div key={c.label} style={S.card}>
            <div style={S.icon}>{c.icon}</div>
            <div style={S.label}>{c.label}</div>
            <span style={S.badge}>Sprint 5</span>
          </div>
        ))}
      </div>
    </div>
  );
}
