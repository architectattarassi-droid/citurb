/**
 * AdsModule — Régie pub (admin.citurbarea.com /cc/publicite).
 * Modération des mises en avant "promo fournisseurs matériaux" : activer (n jours),
 * pauser, rejeter. Stats impressions / clics. Source /api/ads/admin.
 */
import React, { useCallback, useEffect, useState } from "react";
import { CC } from "../../theme/tokens";
import { apiBase, getToken } from "../../../tomes/tome4/apiClient";

const C = CC.color;

type Promo = {
  offerId: string; name: string; photo?: string | null; famille?: string;
  supplier: string; priceDH: number; city?: string | null; lot?: string | null;
  status: string; until?: string | null; impressions: number; clicks: number;
};

const LOT_LABEL: Record<string, string> = {
  REV: "Revêtements", PEI: "Peinture", ALU: "Menuiserie alu", FAC: "Façade", BOI: "Menuiserie bois", PLO: "Plomberie",
};
const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  PENDING: { bg: C.warnBg, fg: C.warn }, ACTIVE: { bg: C.successBg, fg: C.success },
  PAUSED: { bg: C.infoBg, fg: C.info }, REJECTED: { bg: C.dangerBg, fg: C.danger },
};

export default function AdsModule() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${apiBase()}/api/ads/admin`, { headers: { Authorization: `Bearer ${getToken() ?? ""}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setPromos(j.promos || []);
    } catch (e: any) { setErr(e?.message || "Erreur"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (offerId: string, action: string, days?: number) => {
    setBusy(offerId);
    try {
      const res = await fetch(`${apiBase()}/api/ads/admin/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken() ?? ""}` },
        body: JSON.stringify({ action, days }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e: any) { setErr(e?.message || "Erreur"); }
    finally { setBusy(""); }
  };

  const pending = promos.filter((p) => p.status === "PENDING");
  const others = promos.filter((p) => p.status !== "PENDING");
  const totalImpr = promos.reduce((s, p) => s + (p.impressions || 0), 0);
  const totalClicks = promos.reduce((s, p) => s + (p.clicks || 0), 0);

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <div>
          <h1 style={S.title}>Régie publicitaire</h1>
          <p style={S.sub}>Promos fournisseurs matériaux affichées dans les devis clients (au contexte des finitions). Valide, met en pause ou rejette les mises en avant.</p>
        </div>
        <button onClick={load} style={S.refresh} title="Rafraîchir">↻</button>
      </div>

      {err && <div style={S.err}>{err}</div>}
      {loading && <div style={S.muted}>Chargement…</div>}

      <div style={S.kpis}>
        <Kpi label="En attente" value={pending.length} accent={pending.length > 0} />
        <Kpi label="Actives" value={promos.filter((p) => p.status === "ACTIVE").length} />
        <Kpi label="Impressions" value={totalImpr} />
        <Kpi label="Clics" value={totalClicks} hint={totalImpr ? `CTR ${((totalClicks / totalImpr) * 100).toFixed(1)}%` : ""} />
      </div>

      {pending.length > 0 && (
        <Section title={`À valider (${pending.length})`}>
          {pending.map((p) => <Row key={p.offerId} p={p} busy={busy === p.offerId} act={act} pending />)}
        </Section>
      )}

      <Section title="Campagnes">
        {others.length === 0 && !loading && <div style={S.muted}>Aucune campagne active. Les promos apparaissent ici une fois qu'un fournisseur en demande une.</div>}
        {others.map((p) => <Row key={p.offerId} p={p} busy={busy === p.offerId} act={act} />)}
      </Section>
    </div>
  );
}

function Row({ p, busy, act, pending }: { p: Promo; busy: boolean; act: (id: string, a: string, d?: number) => void; pending?: boolean }) {
  const sc = STATUS_COLOR[p.status] || { bg: C.bgSoft, fg: C.inkMid };
  return (
    <div style={S.row}>
      <div style={{ ...S.thumb, background: p.photo ? `center/cover url(${p.photo})` : "linear-gradient(135deg,#ece7dc,#cfc7b6)" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.name}>{p.name} {p.lot && <span style={S.lotTag}>{LOT_LABEL[p.lot] || p.lot}</span>}</div>
        <div style={S.meta}>{p.supplier}{p.city ? ` · ${p.city}` : ""} · {Math.round(p.priceDH).toLocaleString("fr-MA")} DH · {p.famille || ""}</div>
        <div style={S.meta}>{p.impressions} impressions · {p.clicks} clics{p.until ? ` · jusqu'au ${new Date(p.until).toLocaleDateString("fr-FR")}` : ""}</div>
      </div>
      <span style={{ ...S.status, background: sc.bg, color: sc.fg }}>{p.status}</span>
      <div style={S.actions}>
        {pending && <button disabled={busy} onClick={() => act(p.offerId, "activate", 30)} style={{ ...S.btn, ...S.btnGo }}>Activer 30j</button>}
        {p.status === "ACTIVE" && <button disabled={busy} onClick={() => act(p.offerId, "pause")} style={S.btn}>Pause</button>}
        {p.status === "PAUSED" && <button disabled={busy} onClick={() => act(p.offerId, "resume")} style={{ ...S.btn, ...S.btnGo }}>Reprendre</button>}
        {p.status !== "REJECTED" && <button disabled={busy} onClick={() => act(p.offerId, "reject")} style={{ ...S.btn, ...S.btnNo }}>Rejeter</button>}
      </div>
    </div>
  );
}
function Kpi({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div style={{ ...S.kpi, ...(accent ? { borderColor: C.warn, background: C.warnBg } : {}) }}>
      <div style={S.kpiVal}>{value}</div>
      <div style={S.kpiLabel}>{label}</div>
      {hint ? <div style={S.kpiHint}>{hint}</div> : null}
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div style={S.section}><div style={S.sectionTitle}>{title}</div>{children}</div>);
}

const S: Record<string, React.CSSProperties> = {
  wrap: { padding: 24, maxWidth: 1100, margin: "0 auto", fontFamily: CC.font.body, color: C.ink },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 },
  title: { fontFamily: CC.font.display, fontSize: 28, fontWeight: 700, margin: 0, color: C.navy },
  sub: { fontSize: 13.5, color: C.inkMid, margin: "6px 0 0", maxWidth: 640, lineHeight: 1.5 },
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
  row: { display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderTop: `1px solid ${C.borderSoft}`, flexWrap: "wrap" },
  thumb: { width: 54, height: 54, borderRadius: 8, flexShrink: 0, border: `1px solid ${C.border}` },
  name: { fontWeight: 800, fontSize: 14, color: C.ink },
  lotTag: { fontSize: 10.5, fontWeight: 800, color: C.or, background: C.orSoft, padding: "1px 7px", borderRadius: 99, marginLeft: 6 },
  meta: { fontSize: 12, color: C.inkMid, marginTop: 2 },
  status: { padding: "3px 10px", borderRadius: 99, fontSize: 10.5, fontWeight: 800 },
  actions: { display: "flex", gap: 6, flexWrap: "wrap" },
  btn: { padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgRaised, color: C.inkMid, fontWeight: 700, fontSize: 12.5, cursor: "pointer" },
  btnGo: { background: C.navy, color: C.inkOnDark, borderColor: C.navy },
  btnNo: { background: C.bgRaised, color: C.danger, borderColor: C.dangerBg },
};
