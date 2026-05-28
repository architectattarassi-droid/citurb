import React, { useEffect, useState } from "react";
import { apiBase } from "../../tomes/tome4/apiClient";

/**
 * MetricsDashboardPage — dashboard OPS des 6 portes (/cc/metrics).
 * "Laissons le marché décider" : compare conversion + GMV + NPS par porte.
 */
type PorteKpi = {
  porte: string; dau: number; mau: number; gmvMad: number; npsScore: number;
  npsResponses: number; arpuMad: number; payeursUniques: number;
  funnel: { views: number; wizardStarts: number; intakeSubmits: number; paymentsReceived: number; rateGlobalViewToPaid: number; rateViewToStart: number; rateSubmitToPaid: number };
};
type Dashboard = { period: string; totalEvents: number; portes: PorteKpi[]; topPorteByGmv?: string; topPorteByConversion?: string };

const PORTE_LABEL: Record<string, string> = {
  P1: "Particulier", P2: "Promoteur", P3: "MOD délégué", P4: "Foncier", P5: "Rapports", P6: "Prestataires",
};

export default function MetricsDashboardPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const token = (() => { try { return localStorage.getItem("citurbarea.token") || localStorage.getItem("cit:auth:jwt"); } catch { return null; } })();
    fetch(`${apiBase()}/api/analytics-hub/dashboard?period=${period}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((j) => setData(j.dashboard || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  const fmtMad = (n: number) => new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0B1B3A" }}>📊 Métriques 6 portes</h1>
          <div style={{ fontSize: 13, color: "rgba(11,27,58,0.6)", marginTop: 2 }}>
            "Laissons le marché décider" — {data?.totalEvents ?? "…"} événements sur {period}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              background: period === p ? "#0B1B3A" : "#fff", color: period === p ? "#fff" : "#0B1B3A",
              border: period === p ? "1px solid #0B1B3A" : "1px solid rgba(11,27,58,0.2)",
            }}>{p}</button>
          ))}
        </div>
      </div>

      {(data?.topPorteByGmv || data?.topPorteByConversion) && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {data.topPorteByGmv && <Banner emoji="💰" label={`Top GMV : ${PORTE_LABEL[data.topPorteByGmv]} (${data.topPorteByGmv})`} />}
          {data.topPorteByConversion && <Banner emoji="🎯" label={`Top conversion : ${PORTE_LABEL[data.topPorteByConversion]} (${data.topPorteByConversion})`} />}
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Chargement…</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {(data?.portes || []).map((k) => (
          <div key={k.porte} style={{ background: "#fff", border: "1px solid rgba(11,27,58,0.1)", borderRadius: 14, padding: 18, boxShadow: "0 4px 12px rgba(11,27,58,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#0B1B3A" }}>{k.porte} · {PORTE_LABEL[k.porte]}</div>
              <span style={{ fontSize: 11, background: "rgba(201,162,39,0.15)", color: "#9a7a1d", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>{k.mau} MAU</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 14 }}>
              <Kpi label="GMV" value={`${fmtMad(k.gmvMad)}`} unit="MAD" />
              <Kpi label="Conv. → payé" value={`${k.funnel.rateGlobalViewToPaid}`} unit="%" />
              <Kpi label="NPS" value={`${k.npsScore}`} unit={`(${k.npsResponses})`} />
              <Kpi label="ARPU" value={`${fmtMad(k.arpuMad)}`} unit="MAD" />
              <Kpi label="DAU" value={`${k.dau}`} unit="" />
              <Kpi label="Payeurs" value={`${k.payeursUniques}`} unit="" />
            </div>
            {/* Mini funnel */}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(11,27,58,0.08)" }}>
              <FunnelBar label="Vues" value={k.funnel.views} max={k.funnel.views} />
              <FunnelBar label="Wizard" value={k.funnel.wizardStarts} max={k.funnel.views} />
              <FunnelBar label="Soumis" value={k.funnel.intakeSubmits} max={k.funnel.views} />
              <FunnelBar label="Payés" value={k.funnel.paymentsReceived} max={k.funnel.views} accent />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Banner({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #0B1B3A, #1a2f5f)", color: "#fff", padding: "10px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13 }}>
      {emoji} {label}
    </div>
  );
}
function Kpi({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "rgba(11,27,58,0.5)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#0B1B3A", marginTop: 2 }}>{value} <span style={{ fontSize: 10, fontWeight: 400, color: "rgba(11,27,58,0.4)" }}>{unit}</span></div>
    </div>
  );
}
function FunnelBar({ label, value, max, accent = false }: { label: string; value: number; max: number; accent?: boolean }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <div style={{ fontSize: 11, color: "rgba(11,27,58,0.6)", width: 54, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 8, background: "rgba(11,27,58,0.06)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${w}%`, height: "100%", background: accent ? "#16a34a" : "#3b82f6" }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#0B1B3A", width: 36, textAlign: "right" }}>{value}</div>
    </div>
  );
}
