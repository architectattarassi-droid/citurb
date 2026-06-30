/**
 * VisitorsModule — Suivi des visites (admin.citurbarea.com /cc/visites).
 *
 * Données quotidiennes : nombre de visiteurs, pages consultées, durée de visite,
 * pages de sortie, et sessions récentes (parcours + quand le visiteur a quitté) —
 * même sans devenir lead. Source : GET /api/analytics-hub/visitors.
 */
import React, { useCallback, useEffect, useState } from "react";
import { CC } from "../../theme/tokens";
import { apiBase, getToken } from "../../../tomes/tome4/apiClient";

type Period = "7d" | "30d" | "90d";
type PageStat = { path: string; views: number; uniques: number };
type VisitorDay = { date: string; visitors: number; pageviews: number; avgDurationSec: number; bounceRate: number };
type Session = {
  sessionId: string; userId?: string; firstSeen: string; lastSeen: string;
  durationSec: number; pageviews: number; entryPath?: string; exitPath?: string; paths: string[]; isLead: boolean;
};
type Report = {
  period: Period; generatedAt: string;
  totals: { visitors: number; sessions: number; pageviews: number; avgDurationSec: number; bounceRate: number; leads: number };
  daily: VisitorDay[]; topPages: PageStat[]; topExitPages: PageStat[]; recentSessions: Session[];
};

const C = CC.color;
const fmtDur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
const fmtTime = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const sid8 = (s: string) => s.slice(0, 8);

export default function VisitorsModule() {
  const [period, setPeriod] = useState<Period>("7d");
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${apiBase()}/api/analytics-hub/visitors?period=${period}`, {
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setData(j.report);
    } catch (e: any) {
      setErr(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const t = data?.totals;
  const maxVisitors = Math.max(1, ...(data?.daily.map((d) => d.visitors) || [1]));

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <div>
          <h1 style={S.title}>Suivi des visites</h1>
          <p style={S.sub}>Qui visite la plateforme, quelles pages, combien de temps, et quand ils partent — même sans devenir lead.</p>
        </div>
        <div style={S.periodRow}>
          {(["7d", "30d", "90d"] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} style={{ ...S.periodBtn, ...(period === p ? S.periodOn : {}) }}>
              {p === "7d" ? "7 jours" : p === "30d" ? "30 jours" : "90 jours"}
            </button>
          ))}
          <button onClick={load} style={S.refresh} title="Rafraîchir">↻</button>
        </div>
      </div>

      {err && <div style={S.err}>{err}</div>}
      {loading && !data && <div style={S.muted}>Chargement…</div>}

      {t && (
        <>
          <div style={S.kpis}>
            <Kpi label="Visiteurs" value={t.visitors} hint={`${t.sessions} sessions`} />
            <Kpi label="Pages vues" value={t.pageviews} hint={t.visitors ? `${(t.pageviews / t.visitors).toFixed(1)} / visiteur` : ""} />
            <Kpi label="Durée moy." value={fmtDur(t.avgDurationSec)} hint="par session" />
            <Kpi label="Rebond" value={`${t.bounceRate}%`} hint="1 seule page" />
            <Kpi label="Leads" value={t.leads} hint="sessions converties" accent />
          </div>

          {/* Quotidien */}
          <Section title="Visiteurs par jour">
            <div style={S.bars}>
              {data!.daily.map((d) => (
                <div key={d.date} style={S.barCol} title={`${d.date} — ${d.visitors} visiteurs, ${d.pageviews} pages, ${fmtDur(d.avgDurationSec)} moy., ${d.bounceRate}% rebond`}>
                  <div style={S.barValue}>{d.visitors}</div>
                  <div style={{ ...S.bar, height: `${Math.max(4, (d.visitors / maxVisitors) * 120)}px` }} />
                  <div style={S.barLabel}>{fmtDate(d.date)}</div>
                </div>
              ))}
              {data!.daily.length === 0 && <div style={S.muted}>Aucune visite sur la période.</div>}
            </div>
            {data!.daily.length > 0 && (
              <table style={S.table}>
                <thead><tr><Th>Jour</Th><Th r>Visiteurs</Th><Th r>Pages</Th><Th r>Durée moy.</Th><Th r>Rebond</Th></tr></thead>
                <tbody>
                  {[...data!.daily].reverse().map((d) => (
                    <tr key={d.date} style={S.tr}>
                      <Td>{fmtDate(d.date)}</Td><Td r>{d.visitors}</Td><Td r>{d.pageviews}</Td><Td r>{fmtDur(d.avgDurationSec)}</Td><Td r>{d.bounceRate}%</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <div style={S.cols2}>
            <Section title="Pages les plus consultées">
              <table style={S.table}>
                <thead><tr><Th>Page</Th><Th r>Vues</Th><Th r>Visiteurs</Th></tr></thead>
                <tbody>
                  {data!.topPages.map((p) => (
                    <tr key={p.path} style={S.tr}><Td mono>{p.path}</Td><Td r>{p.views}</Td><Td r>{p.uniques}</Td></tr>
                  ))}
                  {data!.topPages.length === 0 && <tr><Td>—</Td><Td r>0</Td><Td r>0</Td></tr>}
                </tbody>
              </table>
            </Section>

            <Section title="Pages de sortie (où ils quittent)">
              <table style={S.table}>
                <thead><tr><Th>Page</Th><Th r>Sorties</Th></tr></thead>
                <tbody>
                  {data!.topExitPages.map((p) => (
                    <tr key={p.path} style={S.tr}><Td mono>{p.path}</Td><Td r>{p.views}</Td></tr>
                  ))}
                  {data!.topExitPages.length === 0 && <tr><Td>—</Td><Td r>0</Td></tr>}
                </tbody>
              </table>
            </Section>
          </div>

          {/* Sessions récentes */}
          <Section title="Sessions récentes">
            <table style={S.table}>
              <thead><tr><Th>Session</Th><Th>Entrée</Th><Th>Sortie</Th><Th r>Pages</Th><Th r>Durée</Th><Th>Quitté le</Th><Th>Lead</Th></tr></thead>
              <tbody>
                {data!.recentSessions.map((s) => (
                  <tr key={s.sessionId} style={S.tr} title={s.paths.join("  →  ")}>
                    <Td mono>{sid8(s.sessionId)}{s.userId ? " 👤" : ""}</Td>
                    <Td mono>{s.entryPath || "—"}</Td>
                    <Td mono>{s.exitPath || "—"}</Td>
                    <Td r>{s.pageviews}</Td>
                    <Td r>{fmtDur(s.durationSec)}</Td>
                    <Td>{fmtTime(s.lastSeen)}</Td>
                    <Td>{s.isLead ? <span style={S.leadTag}>LEAD</span> : ""}</Td>
                  </tr>
                ))}
                {data!.recentSessions.length === 0 && <tr><Td>Aucune session</Td></tr>}
              </tbody>
            </table>
          </Section>

          <div style={S.foot}>
            Généré {new Date(data!.generatedAt).toLocaleString("fr-FR")} · {t.sessions} sessions · RGPD/Loi 09‑08 : aucune IP ni fingerprint, identifiant de session anonyme.
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div style={{ ...S.kpi, ...(accent ? { borderColor: C.or, background: C.bgSoft } : {}) }}>
      <div style={S.kpiVal}>{value}</div>
      <div style={S.kpiLabel}>{label}</div>
      {hint ? <div style={S.kpiHint}>{hint}</div> : null}
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div style={S.section}><div style={S.sectionTitle}>{title}</div>{children}</div>);
}
function Th({ children, r }: { children: React.ReactNode; r?: boolean }) {
  return <th style={{ ...S.th, textAlign: r ? "right" : "left" }}>{children}</th>;
}
function Td({ children, r, mono }: { children: React.ReactNode; r?: boolean; mono?: boolean }) {
  return <td style={{ ...S.td, textAlign: r ? "right" : "left", fontFamily: mono ? CC.font.mono : CC.font.body, fontSize: mono ? 12 : 13 }}>{children}</td>;
}

const S: Record<string, React.CSSProperties> = {
  wrap: { padding: 24, maxWidth: 1280, margin: "0 auto", fontFamily: CC.font.body, color: C.ink },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 },
  title: { fontFamily: CC.font.display, fontSize: 28, fontWeight: 700, margin: 0, color: C.navy },
  sub: { fontSize: 13.5, color: C.inkMid, margin: "6px 0 0", maxWidth: 620, lineHeight: 1.5 },
  periodRow: { display: "flex", gap: 6, alignItems: "center" },
  periodBtn: { padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgRaised, color: C.inkMid, fontWeight: 700, fontSize: 13, cursor: "pointer" },
  periodOn: { background: C.navy, color: C.inkOnDark, borderColor: C.navy },
  refresh: { padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgRaised, color: C.navy, fontSize: 15, cursor: "pointer" },
  err: { padding: "12px 16px", borderRadius: 8, background: C.dangerBg, color: C.danger, fontSize: 13, marginBottom: 16 },
  muted: { color: C.inkMuted, fontSize: 13, padding: 12 },
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 },
  kpi: { padding: 16, borderRadius: 12, background: C.bgRaised, border: `1px solid ${C.border}`, boxShadow: CC.shadow.soft },
  kpiVal: { fontSize: 26, fontWeight: 800, color: C.navy, fontFamily: CC.font.display },
  kpiLabel: { fontSize: 12, fontWeight: 700, color: C.inkMid, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.04em" },
  kpiHint: { fontSize: 11.5, color: C.inkMuted, marginTop: 2 },
  section: { background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 18, boxShadow: CC.shadow.soft },
  sectionTitle: { fontWeight: 800, fontSize: 14, color: C.navy, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.04em" },
  bars: { display: "flex", gap: 8, alignItems: "flex-end", overflowX: "auto", paddingBottom: 8, minHeight: 150 },
  barCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 34 },
  bar: { width: 26, background: `linear-gradient(180deg, ${C.or}, ${C.orSoft})`, borderRadius: "4px 4px 0 0" },
  barValue: { fontSize: 11, fontWeight: 800, color: C.navy },
  barLabel: { fontSize: 10.5, color: C.inkMuted, whiteSpace: "nowrap" },
  cols2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 4 },
  th: { padding: "8px 10px", fontSize: 11, fontWeight: 800, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1px solid ${C.border}` },
  td: { padding: "8px 10px", color: C.ink, borderBottom: `1px solid ${C.borderSoft}`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 },
  tr: {},
  leadTag: { padding: "2px 8px", borderRadius: 99, background: C.successBg, color: C.success, fontSize: 10.5, fontWeight: 800 },
  foot: { fontSize: 11.5, color: C.inkMuted, marginTop: 8, lineHeight: 1.5 },
};
