import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PORTES, PorteData } from './portes.data';
import GeoAccordion from './GeoAccordion';

interface Props { num: string; lang?: 'fr' | 'en' | 'ar'; }

export default function PorteLanding({ num, lang = 'fr' }: Props) {
  const nav = useNavigate();
  const porte: PorteData | undefined = PORTES.find(p => p.num === num);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (!porte) return;
    document.title = `CITURBAREA | ${porte.titleFr} | Rabat-Salé-Kénitra`;
    let desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute('content', porte.subtitleFr);
    } else {
      desc = document.createElement('meta');
      (desc as HTMLMetaElement).name = 'description';
      (desc as HTMLMetaElement).content = porte.subtitleFr;
      document.head.appendChild(desc);
    }
  }, [porte]);

  if (!porte) return <div style={{ color: '#f87171', padding: 40 }}>Porte introuvable.</div>;

  const S = {
    root: { background: '#080d14', color: '#e8eaf0', fontFamily: 'system-ui,sans-serif', minHeight: '100vh' } as React.CSSProperties,
    nav: { background: '#090e18', borderBottom: '1px solid #1a2234', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as React.CSSProperties,
    logo: { fontWeight: 900, fontSize: 18, color: '#e8eaf0', cursor: 'pointer', letterSpacing: -0.5 } as React.CSSProperties,
    navLinks: { display: 'flex', gap: 20, alignItems: 'center' } as React.CSSProperties,
    navLink: (active: boolean): React.CSSProperties => ({ color: active ? '#60a5fa' : '#4a5568', fontSize: 13, cursor: 'pointer' }),
    navCta: { background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
    banner: { background: '#0f1520', borderBottom: '1px solid #1a2234', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' } as React.CSSProperties,
    bannerText: { fontSize: 13, color: '#fbbf24', fontWeight: 600 },
    bannerLink: { fontSize: 13, color: '#60a5fa', cursor: 'pointer', textDecoration: 'none' as const },
    porteBadge: { display: 'inline-block', background: '#1a2a4a', color: '#60a5fa', borderRadius: 6, padding: '4px 12px', fontSize: 13, fontWeight: 700, marginBottom: 16 },
    heroTitle: { fontSize: 36, fontWeight: 900, marginBottom: 16, lineHeight: 1.2 } as React.CSSProperties,
    heroSub: { color: '#4a5568', fontSize: 16, marginBottom: 32, lineHeight: 1.6 } as React.CSSProperties,
    heroBtns: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const },
    btnPrimary: { background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
    btnSecondary: { background: 'transparent', color: '#60a5fa', border: '1px solid #1e2330', borderRadius: 8, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
    section: { maxWidth: 900, margin: '0 auto', padding: '50px 24px' } as React.CSSProperties,
    sectionTitle: { fontSize: 24, fontWeight: 800, marginBottom: 24, color: '#e8eaf0' },
    stGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 },
    stCard: { background: '#111827', border: '1px solid #1e2330', borderRadius: 10, padding: '20px 18px', cursor: 'pointer' } as React.CSSProperties,
    stIcon: { fontSize: 28, marginBottom: 10 },
    stTitle: { fontWeight: 700, fontSize: 15, marginBottom: 6 },
    stDesc: { color: '#4a5568', fontSize: 13, lineHeight: 1.5 },
    stCta: { color: '#60a5fa', fontSize: 12, marginTop: 10, display: 'block' },
    pqCard: { background: '#111827', border: '1px solid #1e2330', borderRadius: 8, padding: '14px 16px', marginBottom: 8, display: 'flex', gap: 10 } as React.CSSProperties,
    pqCheck: { color: '#4ade80', fontSize: 16, flexShrink: 0 },
    pqText: { color: '#8892a4', fontSize: 14, lineHeight: 1.5 },
    etapeRow: { display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' } as React.CSSProperties,
    etapeNum: { background: '#1d4ed8', color: '#fff', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 } as React.CSSProperties,
    etapeTitle: { fontWeight: 700, fontSize: 15, marginBottom: 4 },
    etapeDesc: { color: '#4a5568', fontSize: 13, lineHeight: 1.5 },
    faqItem: (isOpen: boolean): React.CSSProperties => ({
      background: isOpen ? '#0f1520' : '#111827',
      border: `1px solid ${isOpen ? '#1d4ed8' : '#1e2330'}`,
      borderRadius: 8, marginBottom: 8, overflow: 'hidden',
    }),
    faqQ: { padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: 14 } as React.CSSProperties,
    faqA: { padding: '0 16px 14px', color: '#4a5568', fontSize: 13, lineHeight: 1.6 },
    portesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 },
    porteCard: (active: boolean): React.CSSProperties => ({
      background: active ? '#0f1c33' : '#111827',
      border: `2px solid ${active ? '#3b82f6' : '#1e2330'}`,
      borderRadius: 8, padding: '14px 16px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 10,
    }),
    langBar: { background: '#090e18', borderTop: '1px solid #1a2234', padding: '10px 24px', display: 'flex', gap: 10, justifyContent: 'center' } as React.CSSProperties,
    langBtn: (active: boolean): React.CSSProperties => ({
      padding: '4px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
      background: active ? '#1d4ed8' : '#1e2330', color: active ? '#fff' : '#4a5568',
    }),
    footer: { background: '#090e18', borderTop: '1px solid #1a2234', padding: '30px 24px', textAlign: 'center' as const, color: '#3d4f6a', fontSize: 12 },
  };

  return (
    <div style={S.root}>
      <nav style={S.nav}>
        <div style={S.logo} onClick={() => nav('/')}>CITURBAREA</div>
        <div style={S.navLinks}>
          <span style={S.navLink(false)} onClick={() => nav('/')}>Accueil</span>
          {PORTES.map(p => (
            <span key={p.num} style={S.navLink(p.num === num)} onClick={() => nav(`/fr/${p.slugFr}`)}>P{p.num}</span>
          ))}
          <button style={S.navCta} onClick={() => nav(porte.appPath)}>Démarrer →</button>
        </div>
      </nav>

      <div style={S.banner}>
        <span style={S.bannerText}>🚀 Forum CITURBAREA · 9 Mai 2026 · Hôtel 5★ Rabat</span>
        <a href="https://nayaup.citurbarea.com" target="_blank" rel="noreferrer" style={S.bannerLink}>S'inscrire →</a>
      </div>

      <div style={{ background: 'linear-gradient(135deg,#0f1c33 0%,#080d14 100%)', padding: '60px 24px 50px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div style={S.porteBadge}>{porte.icon} PORTE {porte.num}</div>
          <h1 style={S.heroTitle}>{porte.heroFr}</h1>
          <p style={S.heroSub}>{porte.subtitleFr}</p>
          <div style={S.heroBtns}>
            <button style={S.btnPrimary} onClick={() => nav(porte.appPath)}>Démarrer mon projet →</button>
            <button style={S.btnSecondary} onClick={() => document.getElementById('geo')?.scrollIntoView({ behavior: 'smooth' })}>Voir les villes</button>
          </div>
        </div>
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>{porte.titleFr}</div>
        <div style={S.stGrid}>
          {porte.sousTypes.map(st => (
            <div key={st.title} style={S.stCard} onClick={() => nav(porte.appPath)}>
              <div style={S.stIcon}>{st.icon}</div>
              <div style={S.stTitle}>{st.title}</div>
              <div style={S.stDesc}>{st.desc}</div>
              <span style={S.stCta}>Aller au formulaire ↓</span>
            </div>
          ))}
        </div>
      </div>

      <div id="geo">
        <GeoAccordion porteSlug={porte.slugFr} />
      </div>

      <div style={{ ...S.section, borderTop: '1px solid #1a2234' }}>
        <div style={S.sectionTitle}>Cette porte est faite pour vous si…</div>
        {porte.pourQui.map((p, i) => (
          <div key={i} style={S.pqCard}>
            <span style={S.pqCheck}>✓</span>
            <span style={S.pqText}>{p}</span>
          </div>
        ))}
      </div>

      <div style={{ ...S.section, borderTop: '1px solid #1a2234' }}>
        <div style={S.sectionTitle}>Les 6 portes</div>
        <div style={S.portesGrid}>
          {PORTES.map(p => (
            <div key={p.num} style={S.porteCard(p.num === num)} onClick={() => nav(`/fr/${p.slugFr}`)}>
              <span style={{ fontSize: 22 }}>{p.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{p.titleFr}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...S.section, borderTop: '1px solid #1a2234' }}>
        <div style={S.sectionTitle}>Comment ça se passe étape par étape</div>
        {porte.etapes.map(e => (
          <div key={e.num} style={S.etapeRow}>
            <div style={S.etapeNum}>{e.num}</div>
            <div style={{ flex: 1 }}>
              <div style={S.etapeTitle}>{e.title}</div>
              <div style={S.etapeDesc}>{e.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...S.section, borderTop: '1px solid #1a2234' }}>
        <div style={S.sectionTitle}>Questions fréquentes</div>
        {porte.faqs.map((f, i) => (
          <div key={i} style={S.faqItem(openFaq === i)}>
            <div style={S.faqQ} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <span>{f.q}</span>
              <span style={{ color: '#3d4f6a' }}>{openFaq === i ? '▲' : '▼'}</span>
            </div>
            {openFaq === i && <div style={S.faqA}>{f.a}</div>}
          </div>
        ))}
      </div>

      <div style={{ background: '#0f1c33', padding: '50px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Prêt à démarrer votre projet ?</div>
        <div style={{ color: '#4a5568', marginBottom: 24, fontSize: 15 }}>Ce formulaire est qualifiant : il filtre le besoin, réduit les allers-retours et prépare un premier échange sérieux.</div>
        <button style={{ ...S.btnPrimary, fontSize: 16, padding: '16px 36px' }} onClick={() => nav(porte.appPath)}>
          Démarrer {porte.icon} →
        </button>
      </div>

      <div style={S.langBar}>
        <button style={S.langBtn(lang === 'fr')} onClick={() => nav(`/fr/${porte.slugFr}`)}>FR</button>
        <button style={S.langBtn(lang === 'en')} onClick={() => nav(`/en/${porte.slugEn}`)}>EN</button>
        <button style={S.langBtn(lang === 'ar')} onClick={() => nav(`/ar/${porte.slugAr}`)}>AR</button>
      </div>

      <div style={S.footer}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#e8eaf0', marginBottom: 8 }}>CITURBAREA</div>
        <div>Plateforme nationale de gestion de projets architecturaux et immobiliers au Maroc</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {PORTES.map(p => (
            <span key={p.num} style={{ cursor: 'pointer', color: '#3d4f6a' }} onClick={() => nav(`/fr/${p.slugFr}`)}>
              {p.icon} {p.titleFr}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          © 2026 CITURBAREA — Kénitra, Maroc · contact@citurbarea.com
        </div>
      </div>
    </div>
  );
}
