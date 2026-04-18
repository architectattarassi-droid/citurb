import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VILLES_SEO, PORTES } from './portes.data';

export default function VilleLanding() {
  const { ville } = useParams<{ ville: string }>();
  const nav = useNavigate();
  const v = VILLES_SEO.find(x => x.slug === ville);

  useEffect(() => {
    if (!v) return;
    document.title = `Architecte ${v.name} | CITURBAREA — ${v.region}`;
  }, [v]);

  const S = {
    root: { background: '#080d14', color: '#e8eaf0', fontFamily: 'system-ui,sans-serif', minHeight: '100vh' } as React.CSSProperties,
    nav: { background: '#090e18', borderBottom: '1px solid #1a2234', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as React.CSSProperties,
    hero: { background: 'linear-gradient(135deg,#0f1c33 0%,#080d14 100%)', padding: '60px 24px', textAlign: 'center' as const },
    section: { maxWidth: 900, margin: '0 auto', padding: '50px 24px' } as React.CSSProperties,
    portesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 },
    porteCard: { background: '#111827', border: '1px solid #1e2330', borderRadius: 10, padding: '20px 18px', cursor: 'pointer' } as React.CSSProperties,
    btnPrimary: { background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
  };

  if (!v) return (
    <div style={S.root}>
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Ville non trouvée</div>
        <button style={S.btnPrimary} onClick={() => nav('/')}>Retour à l'accueil</button>
      </div>
    </div>
  );

  return (
    <div style={S.root}>
      <nav style={S.nav}>
        <div style={{ fontWeight: 900, fontSize: 18, cursor: 'pointer' }} onClick={() => nav('/')}>CITURBAREA</div>
        <button style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          onClick={() => nav('/p1')}>Démarrer →</button>
      </nav>

      <div style={S.hero}>
        {v.priority && (
          <div style={{ display: 'inline-block', background: '#1a3a2a', color: '#4ade80', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
            ⭐ Zone prioritaire
          </div>
        )}
        <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 12 }}>Architecte {v.name}</h1>
        <p style={{ color: '#4a5568', fontSize: 16, marginBottom: 28, maxWidth: 600, margin: '0 auto 28px' }}>
          CITURBAREA intervient à {v.name} et dans toute la région {v.region} pour vos projets architecturaux et immobiliers.
        </p>
        <button style={S.btnPrimary} onClick={() => nav('/p1')}>
          Démarrer mon projet à {v.name} →
        </button>
      </div>

      <div style={S.section}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Nos services à {v.name}</div>
        <div style={S.portesGrid}>
          {PORTES.map(p => (
            <div key={p.num} style={S.porteCard} onClick={() => nav(`/fr/${p.slugFr}`)}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{p.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{p.titleFr}</div>
              <div style={{ color: '#4a5568', fontSize: 13, lineHeight: 1.5 }}>{p.sousTypes[0].desc}</div>
              <div style={{ color: '#60a5fa', fontSize: 12, marginTop: 8 }}>En savoir plus →</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#0f1c33', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Démarrez votre projet à {v.name}</div>
        <button style={S.btnPrimary} onClick={() => nav('/p1')}>Démarrer maintenant →</button>
      </div>

      <div style={{ background: '#090e18', borderTop: '1px solid #1a2234', padding: '24px', textAlign: 'center', color: '#3d4f6a', fontSize: 12 }}>
        © 2026 CITURBAREA — Architectes & plateforme immobilière au Maroc
      </div>
    </div>
  );
}
