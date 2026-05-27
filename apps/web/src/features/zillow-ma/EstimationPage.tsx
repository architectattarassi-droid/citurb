import React, { useState } from "react";
import { apiBase } from "../../tomes/tome4/apiClient";

/**
 * EstimationPage — page publique d'estimation foncière (Zillow MA).
 * Pivot Visa du foncier — Livrable Q3-2026 #2.
 * Pas de login requis. Lead magnet pour capturer email après estimation.
 */
export default function EstimationPage() {
  const [lat, setLat] = useState("33.5731");   // Casa par défaut
  const [lng, setLng] = useState("-7.5898");
  const [surfaceM2, setSurfaceM2] = useState("200");
  const [bienFamily, setBienFamily] = useState("villa");
  const [ville, setVille] = useState("Casablanca");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const estimate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch(`${apiBase()}/api/zillow-ma/estimation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          surfaceM2: parseFloat(surfaceM2),
          bienFamily,
          ville,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setResult(j.result);
    } catch (e: any) {
      setError(e?.message || "Erreur estimation");
    } finally {
      setLoading(false);
    }
  };

  const fmtMad = (n: number) => new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n) + " MAD";

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 12, color: "#C9A227", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
          Zillow Maroc · Pivot Visa du foncier
        </div>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#0B1B3A" }}>
          Estimez votre bien en 48 h
        </h1>
        <p style={{ color: "rgba(11,27,58,0.6)", marginTop: 12, fontSize: 15, lineHeight: 1.6 }}>
          Premier rail d'estimation foncière probante au Maroc — DGI 2017 × IPAI BAM 2026 + 1 000 comparables récents.
        </p>
      </div>

      <div style={{ background: "#fff", border: "1px solid rgba(11,27,58,0.12)", borderRadius: 16, padding: 24, boxShadow: "0 8px 24px rgba(11,27,58,0.06)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="Latitude" value={lat} onChange={setLat} type="number" />
          <Field label="Longitude" value={lng} onChange={setLng} type="number" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="Surface (m²)" value={surfaceM2} onChange={setSurfaceM2} type="number" />
          <Field label="Ville" value={ville} onChange={setVille} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "rgba(11,27,58,0.75)" }}>Type de bien</label>
          <select value={bienFamily} onChange={(e) => setBienFamily(e.target.value)} style={selectStyle}>
            <option value="terrain_nu">Terrain nu</option>
            <option value="terrain_constructible">Terrain constructible</option>
            <option value="villa">Villa</option>
            <option value="appartement">Appartement</option>
            <option value="immeuble">Immeuble</option>
            <option value="local_commercial">Local commercial</option>
          </select>
        </div>
        <button
          onClick={estimate}
          disabled={loading}
          style={{
            width: "100%", padding: "14px 20px", borderRadius: 10, border: 0,
            background: loading ? "rgba(11,27,58,0.4)" : "linear-gradient(135deg, #0B1B3A, #1a2f5f)",
            color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "wait" : "pointer",
            letterSpacing: "0.04em",
          }}
        >
          {loading ? "Calcul en cours…" : "Estimer maintenant"}
        </button>
      </div>

      {error && <div style={{ marginTop: 16, padding: 12, background: "#fef2f2", color: "#b91c1c", borderRadius: 8 }}>⚠ {error}</div>}

      {result && (
        <div style={{ marginTop: 24, background: "linear-gradient(135deg, #0B1B3A, #1a2f5f)", color: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 12px 32px rgba(11,27,58,0.18)" }}>
          <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: "0.15em", textTransform: "uppercase" }}>Estimation moyenne</div>
          <div style={{ fontSize: 42, fontWeight: 800, marginTop: 4, color: "#E8C66A" }}>{fmtMad(result.estimationMad ?? 0)}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>
            soit <strong>{fmtMad(result.estimationMadPerM2 ?? 0)}/m²</strong>
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.15)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Kpi label="Fourchette min" value={fmtMad(result.fourchetteMin ?? 0)} />
            <Kpi label="Fourchette max" value={fmtMad(result.fourchetteMax ?? 0)} />
            <Kpi label="Confiance" value={`${result.confidencePct ?? 0}%`} accent />
          </div>
          {result.comparablesCount != null && (
            <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>
              Basé sur <strong>{result.comparablesCount}</strong> comparables récents dans un rayon de {result.comparablesDansRayonKm ?? "—"} km.
            </div>
          )}
          {result.methodologie && (
            <div style={{ marginTop: 12, fontSize: 11, opacity: 0.6, fontStyle: "italic" }}>{result.methodologie}</div>
          )}
        </div>
      )}

      <div style={{ marginTop: 32, padding: 20, background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.25)", borderRadius: 12, textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0B1B3A" }}>
          📊 Rapport complet + 10 comparables + historique 5 ans
        </div>
        <div style={{ fontSize: 12, color: "rgba(11,27,58,0.6)", marginTop: 4 }}>
          Créez un compte pour recevoir le rapport détaillé (PDF probatoire + signature horodatée).
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid rgba(11,27,58,0.18)", fontSize: 14, fontFamily: "inherit",
  background: "#fff", boxSizing: "border-box",
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "rgba(11,27,58,0.75)" }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} inputMode={type === "number" ? "decimal" : "text"} />
    </div>
  );
}

function Kpi({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: accent ? "#E8C66A" : "#fff" }}>{value}</div>
    </div>
  );
}
