/**
 * FunnelPanel — formulaires commencés puis abandonnés (GET /api/cc/funnel).
 *
 * Données : table FunnelEvent (Pages Functions + Neon), alimentée par
 * lib/analytics-tracker.ts. Aucune valeur saisie, seulement les noms des
 * champs touchés. Masqué si la route n'existe pas (API locale NestJS).
 */
import React, { useEffect, useState } from "react";
import { apiBase } from "../../../tomes/tome4/apiClient";

type Ligne = { path: string; sessions: number; demarres: number; envoyes: number };
type Abandon = { sessionId: string; debut: string; fin: string; pages: string[]; champs: string[]; pays: string | null; provenance: string | null };
type Synthese = { jours: number; totaux: { sessions: number; demarres: number; envoyes: number; vues: number }; pages: Ligne[]; abandons: Abandon[] };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-MA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function FunnelPanel() {
  const [jours, setJours] = useState(30);
  const [data, setData] = useState<Synthese | null>(null);
  const [indispo, setIndispo] = useState(false);
  const [ouvert, setOuvert] = useState(true);

  useEffect(() => {
    let annule = false;
    fetch(`${apiBase()}/api/cc/funnel?jours=${jours}`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(j => { if (!annule) { setData(j); setIndispo(false); } })
      .catch(() => { if (!annule) setIndispo(true); });
    return () => { annule = true; };
  }, [jours]);

  if (indispo || !data) return null;
  const t = data.totaux;

  return (
    <section style={S.box}>
      <div style={S.head}>
        <button style={S.toggle} onClick={() => setOuvert(o => !o)}>{ouvert ? "▾" : "▸"} Visiteurs & formulaires abandonnés</button>
        <select value={jours} onChange={e => setJours(Number(e.target.value))} style={S.select}>
          {[1, 7, 30, 90].map(j => <option key={j} value={j}>{j === 1 ? "24 h" : `${j} jours`}</option>)}
        </select>
      </div>
      <div style={S.kpis}>
        <Kpi v={t.sessions} l="sessions" />
        <Kpi v={t.vues} l="pages vues" />
        <Kpi v={t.demarres} l="formulaires commencés" />
        <Kpi v={t.envoyes} l="envoyés" />
        <Kpi v={Math.max(0, t.demarres - t.envoyes)} l="abandons" accent />
      </div>
      {ouvert && (
        <>
          {data.abandons.length > 0 && (
            <table style={S.table}>
              <thead><tr><th style={S.th}>Dernière activité</th><th style={S.th}>Pages</th><th style={S.th}>Champs touchés</th><th style={S.th}>Pays</th><th style={S.th}>Provenance</th></tr></thead>
              <tbody>
                {data.abandons.map(a => (
                  <tr key={a.sessionId}>
                    <td style={S.td}>{fmt(a.fin)}</td>
                    <td style={S.td}>{a.pages.join(", ")}</td>
                    <td style={S.td}>{a.champs.length ? a.champs.join(", ") : "— (focus seulement)"}</td>
                    <td style={S.td}>{a.pays || "—"}</td>
                    <td style={S.td}>{a.provenance || "direct"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data.pages.length > 0 && (
            <table style={S.table}>
              <thead><tr><th style={S.th}>Page</th><th style={S.th}>Sessions</th><th style={S.th}>Commencés</th><th style={S.th}>Envoyés</th></tr></thead>
              <tbody>
                {data.pages.map(p => (
                  <tr key={p.path}><td style={S.td}>{p.path}</td><td style={S.td}>{p.sessions}</td><td style={S.td}>{p.demarres}</td><td style={S.td}>{p.envoyes}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {data.pages.length === 0 && <p style={S.vide}>Aucun événement sur la période.</p>}
        </>
      )}
    </section>
  );
}

function Kpi({ v, l, accent }: { v: number; l: string; accent?: boolean }) {
  return (
    <div style={S.kpi}>
      <span style={{ ...S.kpiV, color: accent ? "#f59e0b" : "#e8eaf0" }}>{v}</span>
      <span style={S.kpiL}>{l}</span>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  box: { background: "#0d1017", border: "1px solid #1e2330", borderRadius: 10, padding: 16, marginBottom: 16, color: "#e8eaf0" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 },
  toggle: { background: "none", border: "none", color: "#e8eaf0", fontWeight: 600, fontSize: 14, cursor: "pointer", padding: 0 },
  select: { background: "#151922", color: "#e8eaf0", border: "1px solid #1e2330", borderRadius: 6, padding: "4px 8px" },
  kpis: { display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 },
  kpi: { display: "flex", flexDirection: "column", minWidth: 90 },
  kpiV: { fontSize: 22, fontWeight: 700 },
  kpiL: { fontSize: 11, color: "#9ca3af" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 8, display: "block", overflowX: "auto" },
  th: { textAlign: "left", color: "#9ca3af", fontWeight: 500, padding: "6px 8px", borderBottom: "1px solid #1e2330", whiteSpace: "nowrap" },
  td: { padding: "6px 8px", borderBottom: "1px solid #151922", verticalAlign: "top" },
  vide: { fontSize: 12, color: "#9ca3af", margin: 0 },
};
