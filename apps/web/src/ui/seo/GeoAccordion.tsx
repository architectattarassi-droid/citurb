import { useState } from 'react';
import { REGIONS, Region } from './portes.data';
import { useNavigate } from 'react-router-dom';

interface Props { porteSlug: string; }

export default function GeoAccordion({ porteSlug }: Props) {
  const [open, setOpen] = useState<string | null>('Rabat-Salé-Kénitra');
  const nav = useNavigate();

  const S = {
    wrap: { maxWidth: 900, margin: '0 auto', padding: '0 24px 60px' } as React.CSSProperties,
    title: { fontSize: 22, fontWeight: 800, marginBottom: 6, color: '#e8eaf0', textAlign: 'center' as const },
    sub: { color: '#4a5568', fontSize: 14, marginBottom: 28, textAlign: 'center' as const },
    natBadge: { background: '#0f1c33', border: '1px solid #1e2330', borderRadius: 8, padding: '12px 16px', marginBottom: 16, textAlign: 'center' as const, color: '#60a5fa', fontSize: 13 },
    region: (isOpen: boolean): React.CSSProperties => ({
      background: isOpen ? '#0f1520' : '#0d1117',
      border: `1px solid ${isOpen ? '#1d4ed8' : '#1e2330'}`,
      borderRadius: 8, marginBottom: 8, overflow: 'hidden',
    }),
    regionHdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' } as React.CSSProperties,
    regionName: { fontWeight: 700, fontSize: 14, color: '#e8eaf0', display: 'flex', alignItems: 'center', gap: 8 } as React.CSSProperties,
    badge: (priority?: string): React.CSSProperties => ({
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
      background: priority === '⭐1' ? '#1a3a2a' : priority === '⭐2' ? '#2a2a1a' : '#1e2330',
      color: priority === '⭐1' ? '#4ade80' : priority === '⭐2' ? '#fbbf24' : '#4a5568',
    }),
    regionBody: { padding: '0 16px 14px' } as React.CSSProperties,
    regionBadge: { fontSize: 12, color: '#4a5568', marginBottom: 10 },
    regionLien: { display: 'inline-block', fontSize: 12, color: '#3b82f6', marginBottom: 10, cursor: 'pointer' },
    province: { marginBottom: 8 },
    provinceName: { fontSize: 11, color: '#3d4f6a', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: .5 },
    villesRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 6 },
    ville: (hasSlug: boolean): React.CSSProperties => ({
      fontSize: 12, padding: '3px 10px', borderRadius: 20,
      background: hasSlug ? '#111827' : '#0d1117',
      border: `1px solid ${hasSlug ? '#1e2330' : '#0f1520'}`,
      color: hasSlug ? '#60a5fa' : '#2d3a50',
      cursor: hasSlug ? 'pointer' : 'default',
    }),
  };

  return (
    <div style={S.wrap}>
      <div style={S.title}>CITURBAREA au Maroc entier</div>
      <div style={S.sub}>Sélectionnez votre région pour accéder aux pages dédiées à votre ville.</div>
      <div style={S.natBadge}>🇲🇦 Plateforme nationale — 12 régions · 75+ provinces</div>
      {REGIONS.map((r: Region) => {
        const isOpen = open === r.name;
        return (
          <div key={r.name} style={S.region(isOpen)}>
            <div style={S.regionHdr} onClick={() => setOpen(isOpen ? null : r.name)}>
              <div style={S.regionName}>
                {r.priority && <span style={S.badge(r.priority)}>{r.priority === '⭐1' ? '⭐ Zone 1' : '⭐ Zone 2'}</span>}
                {r.name}
              </div>
              <span style={{ color: '#3d4f6a', fontSize: 18 }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div style={S.regionBody}>
                {r.badge && <div style={S.regionBadge}>{r.badge}</div>}
                {r.lien && (
                  <div style={S.regionLien} onClick={() => nav(r.lien!(porteSlug))}>
                    → Projets dans cette région
                  </div>
                )}
                {r.provinces.map(p => (
                  <div key={p.name} style={S.province}>
                    <div style={S.provinceName}>{p.name}</div>
                    <div style={S.villesRow}>
                      {p.villes.map(v => (
                        <span key={v.name}
                          style={S.ville(!!v.slug)}
                          onClick={() => v.slug && nav(`/architecte-${v.slug}`)}>
                          {v.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#3d4f6a' }}>
        Votre ville n'est pas listée ?{' '}
        <span style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={() => nav('/p1')}>
          Déposez votre demande — nous étudions tous les projets au Maroc.
        </span>
      </div>
    </div>
  );
}
