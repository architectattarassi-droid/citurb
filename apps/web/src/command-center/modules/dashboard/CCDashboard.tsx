import React, { useEffect, useState } from "react";
import { CC } from "../../theme/tokens";

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

type MediaItem = { title: string; type: string; status: string; weekNumber: number };

const fallbackSnapshot: Snapshot = {
  ytSubscribers: 0, emailsCollected: 0, leadsNew: 0, consultationsDone: 0,
  projectsActive: 0, revenueMois: 0, dossierCount: 0, blockedCount: 0, approvedCount: 0,
};
const fallbackMedia: MediaItem[] = [
  { title: "500 000 DH : نستثمر ولا نبني؟", type: "VIDEO_LONG", status: "PLANNED", weekNumber: 1 },
  { title: "5 أخطاء كتخسر الملايين", type: "VIDEO_LONG", status: "PLANNED", weekNumber: 2 },
  { title: "Étape 6: التسوية Terrassement", type: "SHORT", status: "PLANNED", weekNumber: 1 },
];

export default function CCDashboard() {
  const [snapshot, setSnapshot] = useState<Snapshot>(fallbackSnapshot);
  const [media, setMedia] = useState<MediaItem[]>(fallbackMedia);

  useEffect(() => {
    (async () => {
      try {
        const [s, m] = await Promise.all([
          fetch("/api/cc/snapshot/current").then(r => (r.ok ? r.json() : fallbackSnapshot)),
          fetch("/api/cc/media").then(r => (r.ok ? r.json() : { items: fallbackMedia })),
        ]);
        setSnapshot(s);
        setMedia(m.items || fallbackMedia);
      } catch {
        /* fallback déjà appliqué */
      }
    })();
  }, []);

  return (
    <div style={S.root}>
      <header style={S.intro}>
        <div>
          <div style={S.eyebrow}>Atelier · Vue propriétaire</div>
          <h2 style={S.title}>Cockpit consolidé</h2>
          <p style={S.lead}>
            Suivez l'activité de l'atelier, l'avancement des dossiers et les chantiers en
            cours, jour après jour.
          </p>
        </div>
        <a href="/simulateur" style={S.cta}>Ouvrir le simulateur</a>
      </header>

      {/* Aujourd'hui — priorités */}
      <section style={S.section}>
        <SectionTitle eyebrow="Aujourd'hui" title="Trois priorités" />
        <div style={S.priorityGrid}>
          <PriorityCard mark="I"   title="Brancher les données" body="Remplacer les snapshots de démo par les flux réels du cockpit." />
          <PriorityCard mark="II"  title="Dossiers & blocages"   body="Faire avancer les dossiers en BRIEF / ESQUISSE et lever les blocages." />
          <PriorityCard mark="III" title="Cities Talk"           body="Tenir le rythme de publication hebdomadaire." />
        </div>
      </section>

      {/* KPIs détaillés */}
      <section style={S.section}>
        <SectionTitle eyebrow="Indicateurs clés" title="État de l'atelier" />
        <div style={S.kpiGrid}>
          <KpiBlock value={snapshot.dossierCount ?? 0}    label="Dossiers"        accent={CC.color.navy}    />
          <KpiBlock value={snapshot.leadsNew ?? 0}        label="Leads nouveaux"  accent={CC.color.or}      />
          <KpiBlock value={snapshot.projectsActive ?? 0}  label="Projets actifs"  accent={CC.color.success} />
          <KpiBlock value={snapshot.blockedCount ?? 0}    label="Blocages"        accent={CC.color.warn}    />
        </div>
      </section>

      {/* Six axes — vue stratégique */}
      <section style={S.section}>
        <SectionTitle eyebrow="Stratégie" title="Six axes de l'atelier" />
        <div style={S.axesGrid}>
          <AxeCard mark="I"   title="Développement CITURBAREA"
            sub="Back-office et noyau métier"
            rows={[
              { k: "Sprint courant",  v: "S2 → cockpit branché" },
              { k: "Route clé",       v: "/cc" },
              { k: "Prochaine étape", v: "Remplacer les mocks" },
            ]} />

          <AxeCard mark="II"  title="Cities Talk"
            sub="Conversion média"
            children={
              <div style={S.mediaList}>
                {media.map(m => (
                  <div key={m.title} style={S.mediaRow}>
                    <span style={{ ...S.mediaType, background: m.type === "SHORT" ? CC.color.warnBg : CC.color.infoBg, color: m.type === "SHORT" ? CC.color.warn : CC.color.info }}>
                      {m.type === "SHORT" ? "Short" : "Vidéo"}
                    </span>
                    <span style={S.mediaTitle}>{m.title}</span>
                    <span style={S.mediaWeek}>S{m.weekNumber}</span>
                  </div>
                ))}
              </div>
            } />

          <AxeCard mark="III" title="Réseaux & branding"
            sub="Présence et constance"
            rows={[
              { k: "Dernière publication", v: "À brancher" },
              { k: "Signal",               v: "Surveillance", warn: true },
            ]} />

          <AxeCard mark="IV"  title="Dossiers & projets"
            sub="Cabinet et opérations"
            rows={[
              { k: "Dossiers total",  v: String(snapshot.dossierCount ?? 0) },
              { k: "Projets actifs",  v: String(snapshot.projectsActive ?? 0) },
              { k: "Blocages",        v: String(snapshot.blockedCount ?? 0), warn: (snapshot.blockedCount ?? 0) > 0 },
            ]} />

          <AxeCard mark="V"   title="Écosystème prestataires"
            sub="Entreprises, bureaux d'études, partenaires"
            rows={[
              { k: "Réseau",   v: "À structurer" },
              { k: "Objectif", v: "Hub territorial" },
            ]} />

          <AxeCard mark="VI"  title="Recherche doctorale"
            sub="Production scientifique"
            rows={[
              { k: "Backlog articles", v: "À brancher" },
              { k: "Discipline",       v: "1 créneau hebdo min." },
            ]} />
        </div>
      </section>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={S.sectionHead}>
      <div style={S.sectionEyebrow}>{eyebrow}</div>
      <h3 style={S.sectionTitle}>{title}</h3>
    </div>
  );
}

function PriorityCard({ mark, title, body }: { mark: string; title: string; body: string }) {
  return (
    <div style={S.priorityCard}>
      <div style={S.priorityMark}>{mark}</div>
      <div>
        <div style={S.priorityTitle}>{title}</div>
        <div style={S.priorityBody}>{body}</div>
      </div>
    </div>
  );
}

function KpiBlock({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div style={S.kpiCard}>
      <div style={{ ...S.kpiValue, color: accent }}>{value}</div>
      <div style={S.kpiLabel}>{label}</div>
      <div style={{ ...S.kpiUnderline, background: accent }} />
    </div>
  );
}

function AxeCard(props: {
  mark: string;
  title: string;
  sub: string;
  rows?: { k: string; v: string; warn?: boolean }[];
  children?: React.ReactNode;
}) {
  return (
    <div style={S.axeCard}>
      <div style={S.axeHead}>
        <div style={S.axeMark}>{props.mark}</div>
        <div>
          <div style={S.axeTitle}>{props.title}</div>
          <div style={S.axeSub}>{props.sub}</div>
        </div>
      </div>
      <div style={S.axeBody}>
        {props.rows?.map(r => (
          <div key={r.k} style={S.metricRow}>
            <span style={S.metricK}>{r.k}</span>
            <span style={{ ...S.metricV, color: r.warn ? CC.color.warn : CC.color.ink }}>{r.v}</span>
          </div>
        ))}
        {props.children}
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  root: { display: "flex", flexDirection: "column", gap: 36, maxWidth: 1280 },

  intro: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, paddingBottom: 8, borderBottom: `1px solid ${CC.color.border}` },
  eyebrow: { fontSize: 10, color: CC.color.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  title: { margin: "6px 0 8px", fontFamily: CC.font.display, fontSize: 36, fontWeight: 600, color: CC.color.navy, letterSpacing: "-0.02em", lineHeight: 1.1 },
  lead: { margin: 0, color: CC.color.inkMid, fontSize: 14, fontStyle: "italic", maxWidth: 480, lineHeight: 1.55 },
  cta: { background: CC.color.navy, color: CC.color.bg, padding: "11px 18px", borderRadius: 6, textDecoration: "none", fontWeight: 600, fontSize: 12.5, letterSpacing: "0.04em", boxShadow: CC.shadow.soft, transition: `all 0.18s ${CC.ease}` },

  section: { display: "flex", flexDirection: "column", gap: 16 },
  sectionHead: { display: "flex", flexDirection: "column", gap: 2 },
  sectionEyebrow: { fontSize: 10, color: CC.color.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  sectionTitle: { margin: 0, fontFamily: CC.font.display, fontSize: 22, fontWeight: 600, color: CC.color.navy, letterSpacing: "-0.01em" },

  // Priorités
  priorityGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  priorityCard: {
    display: "flex", alignItems: "flex-start", gap: 14,
    background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`,
    borderRadius: CC.size.radiusLg, padding: "20px 22px",
    boxShadow: CC.shadow.soft,
  },
  priorityMark: {
    fontFamily: CC.font.display, fontStyle: "italic", fontSize: 28, fontWeight: 600,
    color: CC.color.or, lineHeight: 1, width: 36, flexShrink: 0,
  },
  priorityTitle: { fontFamily: CC.font.display, fontSize: 16, fontWeight: 600, color: CC.color.navy, marginBottom: 4 },
  priorityBody: { fontSize: 13, color: CC.color.inkMid, lineHeight: 1.55 },

  // KPI
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  kpiCard: {
    background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`,
    borderRadius: CC.size.radiusLg, padding: "22px 24px", position: "relative",
    boxShadow: CC.shadow.soft, overflow: "hidden",
  },
  kpiValue: { fontFamily: CC.font.display, fontSize: 38, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em" },
  kpiLabel: { color: CC.color.inkMuted, fontSize: 11, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 500 },
  kpiUnderline: { position: "absolute", bottom: 0, left: 0, right: 0, height: 3, opacity: 0.6 },

  // Axes
  axesGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  axeCard: {
    background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`,
    borderRadius: CC.size.radiusLg, padding: "22px 26px",
    display: "flex", flexDirection: "column", gap: 14,
    boxShadow: CC.shadow.soft,
  },
  axeHead: { display: "flex", alignItems: "flex-start", gap: 14, paddingBottom: 12, borderBottom: `1px dotted ${CC.color.border}` },
  axeMark: {
    fontFamily: CC.font.display, fontStyle: "italic", fontSize: 22, fontWeight: 600,
    color: CC.color.or, lineHeight: 1, width: 32, flexShrink: 0, paddingTop: 2,
  },
  axeTitle: { fontFamily: CC.font.display, fontSize: 18, fontWeight: 600, color: CC.color.navy, lineHeight: 1.2 },
  axeSub: { color: CC.color.inkMuted, fontSize: 11, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.12em" },
  axeBody: { display: "flex", flexDirection: "column", gap: 10 },

  metricRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13, paddingBottom: 8, borderBottom: `1px solid ${CC.color.borderSoft}` },
  metricK: { color: CC.color.inkMid },
  metricV: { fontWeight: 600, color: CC.color.ink },

  mediaList: { display: "flex", flexDirection: "column", gap: 8 },
  mediaRow: { display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, paddingBottom: 8, borderBottom: `1px solid ${CC.color.borderSoft}` },
  mediaType: { fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 3, letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0 },
  mediaTitle: { flex: 1, color: CC.color.ink, lineHeight: 1.4 },
  mediaWeek: { color: CC.color.inkMuted, fontSize: 10.5, letterSpacing: "0.08em", flexShrink: 0 },
};
