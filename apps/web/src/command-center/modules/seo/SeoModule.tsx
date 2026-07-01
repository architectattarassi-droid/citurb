/**
 * SeoModule — Cockpit SEO/GEO (admin.citurbarea.com /cc/seo).
 *  - Audit : score on-page de nos pages + problèmes à corriger au fil de l'eau.
 *  - Mots-clés : plan de mots-clés cibles (statut, priorité, locale).
 *  - Concurrents : veille (inspection publique title/meta/H1/keywords).
 * Source /api/cc/seo (admin).
 */
import React, { useCallback, useEffect, useState } from "react";
import { CC } from "../../theme/tokens";
import { apiBase, getToken } from "../../../tomes/tome4/apiClient";

const C = CC.color;
const authGet = (p: string) => fetch(`${apiBase()}${p}`, { headers: { Authorization: `Bearer ${getToken() ?? ""}` } });
const authSend = (p: string, method: string, body?: unknown) =>
  fetch(`${apiBase()}${p}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken() ?? ""}` }, body: body ? JSON.stringify(body) : undefined });

type Tab = "audit" | "gsc" | "keywords" | "competitors";

export default function SeoModule() {
  const [tab, setTab] = useState<Tab>("audit");
  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <div>
          <h1 style={S.title}>SEO / GEO</h1>
          <p style={S.sub}>Audit de nos pages, plan de mots-clés et veille concurrents — pour corriger au fil de l'eau. (Positions Google réelles = via Search Console à connecter ultérieurement.)</p>
        </div>
      </div>
      <div style={S.tabs}>
        {(["audit", "gsc", "keywords", "competitors"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ ...S.tab, ...(tab === t ? S.tabOn : {}) }}>
            {t === "audit" ? "Audit on-page" : t === "gsc" ? "Search Console" : t === "keywords" ? "Mots-clés" : "Concurrents"}
          </button>
        ))}
      </div>
      {tab === "audit" && <AuditTab />}
      {tab === "gsc" && <GscTab />}
      {tab === "keywords" && <KeywordsTab />}
      {tab === "competitors" && <CompetitorsTab />}
    </div>
  );
}

/* ── Audit ─────────────────────────────────────────────────────────────────── */
function AuditTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const run = useCallback(async () => {
    setLoading(true); setErr("");
    try { const r = await authGet("/api/cc/seo/audit"); if (!r.ok) throw new Error(`HTTP ${r.status}`); setData((await r.json()).audit); }
    catch (e: any) { setErr(e?.message || "Erreur"); } finally { setLoading(false); }
  }, []);
  useEffect(() => { run(); }, [run]);

  const scoreColor = (s: number) => (s >= 80 ? C.success : s >= 50 ? C.warn : C.danger);

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={run} disabled={loading} style={{ ...S.btn, ...S.btnGo }}>{loading ? "Analyse…" : "↻ Relancer l'audit"}</button>
        {data && <span style={S.muted}>{data.pages.length} pages · score moyen <b style={{ color: scoreColor(data.avgScore) }}>{data.avgScore}/100</b> · {data.totalIssues} problèmes</span>}
      </div>
      {err && <div style={S.err}>{err}</div>}
      {data?.pages?.map((p: any) => (
        <div key={p.url} style={S.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ ...S.scoreBadge, background: scoreColor(p.score), }}>{p.score}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.cardUrl}>{p.url}{p.status && p.status !== 200 ? ` · HTTP ${p.status}` : ""}</div>
              <div style={S.cardTitle}>{p.title || <i>— pas de titre —</i>}</div>
              <div style={S.cardMeta}>{p.title ? `${p.titleLen} car.` : ""}{p.words ? ` · ${p.words} mots` : ""}{p.hreflang ? ` · hreflang ✓` : ""}{p.jsonld ? " · JSON-LD ✓" : ""}</div>
            </div>
          </div>
          {p.issues?.length > 0 && (
            <ul style={S.issues}>{p.issues.map((i: string, k: number) => <li key={k}>{i}</li>)}</ul>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Search Console ────────────────────────────────────────────────────────── */
function GscTab() {
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState(28);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await authGet(`/api/cc/seo/gsc?days=${days}`); if (r.ok) setData((await r.json()).gsc); } finally { setLoading(false); }
  }, [days]);
  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <div style={S.muted}>Chargement…</div>;

  if (data && !data.configured) {
    return (
      <div style={S.card}>
        <div style={S.cardTitle}>Connecter Google Search Console</div>
        <p style={S.muted}>Pour voir tes vraies requêtes, positions, clics et impressions Google, connecte un compte de service (gratuit) :</p>
        <ol style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.9, paddingLeft: 20 }}>
          <li>Google Cloud Console → crée un <b>compte de service</b> → génère une <b>clé JSON</b>.</li>
          <li>Active l'API <b>Google Search Console</b> dans le projet.</li>
          <li>Dans Search Console (propriété <b>citurbarea.com</b>) → Paramètres → Utilisateurs → ajoute l'email du compte de service en <b>lecture</b>.</li>
          <li>Sur Railway (service <b>citurb</b>), ajoute 2 variables : <code style={S.code}>GSC_SA_JSON</code> = le contenu du JSON, et <code style={S.code}>GSC_SITE_URL</code> = <code style={S.code}>sc-domain:citurbarea.com</code>.</li>
          <li>Reviens ici — les données s'afficheront.</li>
        </ol>
        <p style={S.muted}>Propriété attendue : <b>{data.siteUrl || "sc-domain:citurbarea.com (à définir)"}</b></p>
      </div>
    );
  }
  if (data?.error) return <div style={S.err}>Search Console : {data.error}</div>;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {[7, 28, 90].map((d) => <button key={d} onClick={() => setDays(d)} style={{ ...S.btn, ...(days === d ? S.btnGo : {}) }}>{d} jours</button>)}
        {data?.totals && <span style={S.muted}><b>{data.totals.clicks}</b> clics · <b>{data.totals.impressions}</b> impressions · position moy. <b>{data.totals.avgPosition}</b></span>}
      </div>
      <div style={S.cols2}>
        <div style={S.card}>
          <div style={S.sectionTitle}>Top requêtes</div>
          <table style={S.table}><thead><tr><th style={S.th}>Requête</th><th style={S.th}>Clics</th><th style={S.th}>Impr.</th><th style={S.th}>Pos.</th></tr></thead>
            <tbody>{(data?.queries || []).slice(0, 30).map((r: any) => (
              <tr key={r.key}><td style={S.td}>{r.key}</td><td style={S.td}>{r.clicks}</td><td style={S.td}>{r.impressions}</td><td style={S.td}>{r.position}</td></tr>
            ))}</tbody></table>
        </div>
        <div style={S.card}>
          <div style={S.sectionTitle}>Top pages</div>
          <table style={S.table}><thead><tr><th style={S.th}>Page</th><th style={S.th}>Clics</th><th style={S.th}>Impr.</th></tr></thead>
            <tbody>{(data?.pages || []).slice(0, 30).map((r: any) => (
              <tr key={r.key}><td style={S.td}><span style={S.subUrl}>{r.key}</span></td><td style={S.td}>{r.clicks}</td><td style={S.td}>{r.impressions}</td></tr>
            ))}</tbody></table>
        </div>
      </div>
    </div>
  );
}

/* ── Mots-clés ─────────────────────────────────────────────────────────────── */
function KeywordsTab() {
  const [list, setList] = useState<any[]>([]);
  const [f, setF] = useState({ keyword: "", locale: "fr", target: "", url: "", priority: "MEDIUM", status: "TODO" });
  const load = useCallback(async () => { const r = await authGet("/api/cc/seo/keywords"); if (r.ok) setList((await r.json()).keywords); }, []);
  useEffect(() => { load(); }, [load]);
  const add = async () => { if (!f.keyword.trim()) return; const r = await authSend("/api/cc/seo/keywords", "POST", f); if (r.ok) { setList((await r.json()).keywords); setF({ ...f, keyword: "", url: "" }); } };
  const setStatus = async (id: string, status: string) => { const r = await authSend("/api/cc/seo/keywords", "POST", { id, status }); if (r.ok) setList((await r.json()).keywords); };
  const del = async (id: string) => { const r = await authSend(`/api/cc/seo/keywords/${id}`, "DELETE"); if (r.ok) setList((await r.json()).keywords); };
  const stColor: Record<string, string> = { TODO: C.warn, OPTIMIZED: C.info, RANKING: C.success };

  return (
    <div>
      <div style={S.card}>
        <div style={S.formRow}>
          <input placeholder="Mot-clé cible (ex. architecte Kénitra)" value={f.keyword} onChange={(e) => setF({ ...f, keyword: e.target.value })} style={{ ...S.input, flex: 2 }} />
          <select value={f.locale} onChange={(e) => setF({ ...f, locale: e.target.value })} style={S.input}><option value="fr">FR</option><option value="ar">AR</option><option value="en">EN</option></select>
          <input placeholder="Cible (porte/ville)" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} style={S.input} />
          <input placeholder="URL" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} style={{ ...S.input, flex: 2 }} />
          <select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} style={S.input}><option value="HIGH">Haute</option><option value="MEDIUM">Moyenne</option><option value="LOW">Basse</option></select>
          <button onClick={add} style={{ ...S.btn, ...S.btnGo }}>+ Ajouter</button>
        </div>
      </div>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Mot-clé</th><th style={S.th}>Loc</th><th style={S.th}>Cible</th><th style={S.th}>Priorité</th><th style={S.th}>Statut</th><th style={S.th}></th></tr></thead>
        <tbody>
          {list.map((k) => (
            <tr key={k.id}>
              <td style={S.td}><b>{k.keyword}</b>{k.url ? <div style={S.subUrl}>{k.url}</div> : null}</td>
              <td style={S.td}>{(k.locale || "").toUpperCase()}</td>
              <td style={S.td}>{k.target || "—"}</td>
              <td style={S.td}>{k.priority === "HIGH" ? "Haute" : k.priority === "LOW" ? "Basse" : "Moyenne"}</td>
              <td style={S.td}>
                <select value={k.status} onChange={(e) => setStatus(k.id, e.target.value)} style={{ ...S.miniSel, color: stColor[k.status] || C.ink }}>
                  <option value="TODO">À faire</option><option value="OPTIMIZED">Optimisé</option><option value="RANKING">Positionné</option>
                </select>
              </td>
              <td style={S.td}><button onClick={() => del(k.id)} style={S.del}>✕</button></td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={6} style={{ ...S.td, color: C.inkMuted }}>Aucun mot-clé. Ajoute tes cibles pour suivre l'optimisation.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/* ── Concurrents ───────────────────────────────────────────────────────────── */
function CompetitorsTab() {
  const [list, setList] = useState<any[]>([]);
  const [f, setF] = useState({ name: "", url: "" });
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => { const r = await authGet("/api/cc/seo/competitors"); if (r.ok) setList((await r.json()).competitors); }, []);
  useEffect(() => { load(); }, [load]);
  const add = async () => { if (!f.url.trim()) return; const r = await authSend("/api/cc/seo/competitors", "POST", f); if (r.ok) { setList((await r.json()).competitors); setF({ name: "", url: "" }); } };
  const inspect = async (id: string) => { setBusy(id); try { const r = await authSend(`/api/cc/seo/competitors/${id}/inspect`, "POST"); if (r.ok) setList((await r.json()).competitors); } finally { setBusy(""); } };
  const del = async (id: string) => { const r = await authSend(`/api/cc/seo/competitors/${id}`, "DELETE"); if (r.ok) setList((await r.json()).competitors); };

  return (
    <div>
      <div style={S.card}>
        <div style={S.formRow}>
          <input placeholder="Nom (ex. Cabinet X)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={S.input} />
          <input placeholder="https://concurrent.ma/…" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} style={{ ...S.input, flex: 3 }} />
          <button onClick={add} style={{ ...S.btn, ...S.btnGo }}>+ Ajouter</button>
        </div>
        <div style={S.muted}>La veille inspecte les balises publiques du concurrent (titre, meta, H1, keywords qu'il déclare). Les positions/mots-clés réels de Google nécessitent un outil payant.</div>
      </div>
      {list.map((c) => (
        <div key={c.id} style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.cardTitle}>{c.name}</div>
              <a href={c.url} target="_blank" rel="noopener" style={S.subUrl}>{c.url}</a>
              {c.title && <div style={{ marginTop: 8 }}><b style={S.lbl}>Titre :</b> {c.title}</div>}
              {c.description && <div><b style={S.lbl}>Meta :</b> {c.description}</div>}
              {c.h1 && <div><b style={S.lbl}>H1 :</b> {c.h1}</div>}
              {c.keywords && <div><b style={S.lbl}>Keywords déclarés :</b> {c.keywords}</div>}
              {c.checkedAt && <div style={S.cardMeta}>Vérifié {new Date(c.checkedAt).toLocaleString("fr-FR")}</div>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => inspect(c.id)} disabled={busy === c.id} style={{ ...S.btn, ...S.btnGo }}>{busy === c.id ? "…" : "Inspecter"}</button>
              <button onClick={() => del(c.id)} style={{ ...S.btn, ...S.btnNo }}>Suppr.</button>
            </div>
          </div>
        </div>
      ))}
      {list.length === 0 && <div style={S.muted}>Aucun concurrent suivi. Ajoute des URLs pour comparer le positionnement.</div>}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { padding: 24, maxWidth: 1100, margin: "0 auto", fontFamily: CC.font.body, color: C.ink },
  head: { marginBottom: 16 },
  title: { fontFamily: CC.font.display, fontSize: 28, fontWeight: 700, margin: 0, color: C.navy },
  sub: { fontSize: 13.5, color: C.inkMid, margin: "6px 0 0", maxWidth: 680, lineHeight: 1.5 },
  tabs: { display: "flex", gap: 6, marginBottom: 18, borderBottom: `1px solid ${C.border}`, paddingBottom: 2 },
  tab: { padding: "9px 16px", borderRadius: "8px 8px 0 0", border: "none", background: "transparent", color: C.inkMid, fontWeight: 700, fontSize: 13.5, cursor: "pointer" },
  tabOn: { background: C.bgRaised, color: C.navy, boxShadow: CC.shadow.soft },
  btn: { padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgRaised, color: C.inkMid, fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnGo: { background: C.navy, color: C.inkOnDark, borderColor: C.navy },
  btnNo: { background: C.bgRaised, color: C.danger, borderColor: C.dangerBg },
  muted: { color: C.inkMuted, fontSize: 12.5, lineHeight: 1.5, marginTop: 8 },
  err: { padding: "12px 16px", borderRadius: 8, background: C.dangerBg, color: C.danger, fontSize: 13, marginBottom: 16 },
  card: { background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: CC.shadow.soft },
  cols2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 },
  sectionTitle: { fontWeight: 800, fontSize: 13, color: C.navy, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" },
  code: { fontFamily: CC.font.mono, fontSize: 12, background: C.bgSoft, padding: "1px 5px", borderRadius: 4, color: C.navy },
  scoreBadge: { minWidth: 44, textAlign: "center", padding: "8px 6px", borderRadius: 10, color: "#fff", fontWeight: 900, fontSize: 18 },
  cardUrl: { fontSize: 12, color: C.inkMuted, fontFamily: CC.font.mono },
  cardTitle: { fontSize: 14.5, fontWeight: 800, color: C.navy, marginTop: 2 },
  cardMeta: { fontSize: 11.5, color: C.inkMuted, marginTop: 3 },
  issues: { margin: "10px 0 0", paddingLeft: 18, fontSize: 12.5, color: C.warn, lineHeight: 1.7 },
  formRow: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  input: { padding: "9px 11px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.ink, background: "#fff", flex: 1, minWidth: 90 },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 8 },
  th: { padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 800, color: C.inkMuted, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` },
  td: { padding: "10px", fontSize: 13, color: C.ink, borderBottom: `1px solid ${C.borderSoft}`, verticalAlign: "top" },
  subUrl: { fontSize: 11.5, color: C.info, fontFamily: CC.font.mono, textDecoration: "none", display: "block", wordBreak: "break-all" },
  miniSel: { padding: "5px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700, background: "#fff" },
  del: { border: "none", background: "transparent", color: C.danger, fontSize: 15, cursor: "pointer" },
  lbl: { color: C.inkMid, fontWeight: 700, fontSize: 12.5 },
};
