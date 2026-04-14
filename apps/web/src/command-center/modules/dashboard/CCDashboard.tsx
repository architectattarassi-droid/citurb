import React, { useEffect, useState } from 'react';

type Snapshot = {
  ytSubscribers?: number;
  emailsCollected?: number;
  leadsNew?: number;
  consultationsDone?: number;
  projectsActive?: number;
  revenueMois?: number;
  dossierCount?: number;
  blockedCount?: number;
  approvedCount?: number;
};

type MediaItem = { title: string; type: string; status: string; weekNumber: number; };

const fallbackSnapshot: Snapshot = { ytSubscribers: 0, emailsCollected: 0, leadsNew: 0, consultationsDone: 0, projectsActive: 0, revenueMois: 0, dossierCount: 0, blockedCount: 0, approvedCount: 0 };
const fallbackMedia: MediaItem[] = [
  { title: '500 000 DH : نستثمر ولا نبني؟', type: 'VIDEO_LONG', status: 'PLANNED', weekNumber: 1 },
  { title: '5 أخطاء كتخسر الملايين', type: 'VIDEO_LONG', status: 'PLANNED', weekNumber: 2 },
  { title: 'Étape 6: التسوية Terrassement', type: 'SHORT', status: 'PLANNED', weekNumber: 1 },
];

export default function CCDashboard() {
  const [snapshot, setSnapshot] = useState<Snapshot>(fallbackSnapshot);
  const [media, setMedia] = useState<MediaItem[]>(fallbackMedia);

  useEffect(() => {
    (async () => {
      try {
        const [s, m] = await Promise.all([
          fetch('/api/cc/snapshot/current').then(r => r.ok ? r.json() : fallbackSnapshot),
          fetch('/api/cc/media').then(r => r.ok ? r.json() : { items: fallbackMedia }),
        ]);
        setSnapshot(s);
        setMedia(m.items || fallbackMedia);
      } catch {}
    })();
  }, []);

  const kpis = [
    { label: 'Dossiers', value: snapshot.dossierCount ?? 0, color: '#00d4aa' },
    { label: 'Leads nouveaux', value: snapshot.leadsNew ?? 0, color: '#0088ff' },
    { label: 'Projets actifs', value: snapshot.projectsActive ?? 0, color: '#a855f7' },
    { label: 'Blocages', value: snapshot.blockedCount ?? 0, color: '#f59e0b' },
  ];

  return (
    <div style={styles.root}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>◈ CITURBAREA OS</h1>
          <div style={styles.pageSub}>Cockpit consolidé — vue propriétaire</div>
        </div>
        <a href="/simulateur" style={styles.simButton}>Ouvrir le simulateur</a>
      </div>

      <div style={styles.today}>
        <div style={styles.todayTitle}>Today</div>
        <div style={styles.todayGrid}>
          <div style={styles.todayCard}><b>Priorité 1</b><span>Brancher les vraies données du cockpit</span></div>
          <div style={styles.todayCard}><b>Priorité 2</b><span>Suivre les dossiers actifs et blocages</span></div>
          <div style={styles.todayCard}><b>Priorité 3</b><span>Respecter le plan Cities Talk</span></div>
        </div>
      </div>

      <div style={styles.kpiGrid}>
        {kpis.map((k) => <div key={k.label} style={styles.kpiCard}><div style={{...styles.kpiValue,color:k.color}}>{k.value}</div><div style={styles.kpiLabel}>{k.label}</div></div>)}
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <SectionHeader title="Axe 1 — Développement CITURBAREA" sub="Back-office et noyau métier" />
          <div style={styles.metricRow}><span>Sprint courant</span><b>S2 → cockpit branché</b></div>
          <div style={styles.metricRow}><span>Route clé</span><code>/cc</code></div>
          <div style={styles.metricRow}><span>Prochaine étape</span><b>Remplacer les mocks</b></div>
        </div>

        <div style={styles.card}>
          <SectionHeader title="Axe 2 — Cities Talk" sub="Conversion média" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {media.map((m) => <div key={m.title} style={styles.mediaRow}><span>{m.type === 'SHORT' ? 'S' : 'V'}</span><span style={{flex:1}}>{m.title}</span><span>S{m.weekNumber}</span></div>)}
          </div>
        </div>

        <div style={styles.card}>
          <SectionHeader title="Axe 3 — Réseaux & branding" sub="Présence et constance" />
          <div style={styles.metricRow}><span>Dernière publication</span><b>À brancher</b></div>
          <div style={styles.metricRow}><span>Signal</span><b style={{color:'#f59e0b'}}>Surveillance requise</b></div>
        </div>

        <div style={styles.card}>
          <SectionHeader title="Axe 4 — Dossiers & projets" sub="Cabinet et opérations" />
          <div style={styles.metricRow}><span>Dossiers total</span><b>{snapshot.dossierCount ?? 0}</b></div>
          <div style={styles.metricRow}><span>Projets actifs</span><b>{snapshot.projectsActive ?? 0}</b></div>
          <div style={styles.metricRow}><span>Blocages</span><b style={{color:'#f59e0b'}}>{snapshot.blockedCount ?? 0}</b></div>
        </div>

        <div style={styles.card}>
          <SectionHeader title="Axe 5 — Écosystème prestataires" sub="Entreprises, bureaux d'études, partenaires" />
          <div style={styles.metricRow}><span>Réseau</span><b>À structurer</b></div>
          <div style={styles.metricRow}><span>Objectif</span><b>Hub territorial</b></div>
        </div>

        <div style={styles.card}>
          <SectionHeader title="Axe 6 — Recherche doctorale" sub="Production scientifique" />
          <div style={styles.metricRow}><span>Backlog articles</span><b>À brancher</b></div>
          <div style={styles.metricRow}><span>Discipline</span><b>1 créneau hebdo minimum</b></div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return <div><div style={styles.sectionTitle}>{title}</div><div style={styles.sectionSub}>{sub}</div></div>;
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: 16 },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { margin: 0, fontSize: 22, color: '#e8eaf0', fontWeight: 700 },
  pageSub: { color: '#4a5568', fontSize: 12, marginTop: 4 },
  simButton: { background: '#00d4aa', color: '#0a0c10', padding: '10px 14px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 12 },
  today: { background: '#0d1017', border: '1px solid #1e2330', borderRadius: 10, padding: 20 },
  todayTitle: { color: '#e8eaf0', fontWeight: 700, marginBottom: 12 },
  todayGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  todayCard: { background: '#131820', border: '1px solid #1e2330', borderRadius: 8, padding: 12, color: '#8892a4', display: 'flex', flexDirection: 'column', gap: 6 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  kpiCard: { background: '#0d1017', border: '1px solid #1e2330', borderRadius: 10, padding: 18 },
  kpiValue: { fontSize: 24, fontWeight: 800, fontFamily: "'DM Mono', monospace" },
  kpiLabel: { color: '#4a5568', fontSize: 11, marginTop: 4, textTransform: 'uppercase' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  card: { background: '#0d1017', border: '1px solid #1e2330', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  sectionTitle: { color: '#e8eaf0', fontWeight: 700, fontSize: 13 },
  sectionSub: { color: '#4a5568', fontSize: 10, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' },
  metricRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#8892a4', fontSize: 12, borderBottom: '1px solid #131820', paddingBottom: 8 },
  mediaRow: { display: 'flex', gap: 8, color: '#8892a4', fontSize: 12, padding: '6px 0', borderBottom: '1px solid #131820' },
};
