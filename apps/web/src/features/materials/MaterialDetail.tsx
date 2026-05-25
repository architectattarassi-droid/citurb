import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  DEFAULT_REGION,
  fetchMaterial,
  fetchPriceHistory,
  fmtMad,
  fmtUnit,
  type MaterialPriceHistoryPoint,
  type MaterialWithPrice,
  type RegionDescriptor,
  fetchCatalog,
} from "./materials.api";
import MaterialPriceCompare from "./MaterialPriceCompare";

/**
 * MaterialDetail — page détail d'un matériau.
 * - Header: label + unité + prix moyen + variation
 * - Spécifications + marques courantes
 * - Sélecteur région
 * - Graphique SVG mini (12 derniers mois)
 * - Comparateur prix de devis
 */
export default function MaterialDetail() {
  const { code } = useParams<{ code: string }>();
  const [material, setMaterial] = useState<MaterialWithPrice | null>(null);
  const [history, setHistory] = useState<MaterialPriceHistoryPoint[]>([]);
  const [regions, setRegions] = useState<RegionDescriptor[]>([]);
  const [region, setRegion] = useState<string>(DEFAULT_REGION);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCatalog()
      .then((c) => {
        if (!cancelled) setRegions(c.regions);
      })
      .catch(() => { /* non-bloquant */ });
    if (!code) {
      setError("Code matériau manquant");
      setLoading(false);
      return;
    }
    Promise.all([fetchMaterial(code, region), fetchPriceHistory(code, region, 12)])
      .then(([m, h]) => {
        if (cancelled) return;
        setMaterial(m.material);
        setHistory(h.history);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Erreur de chargement");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [code, region]);

  if (loading) return <div style={{ padding: 24 }}>Chargement…</div>;
  if (error || !material) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#dc2626", marginBottom: 12 }}>{error || "Matériau introuvable"}</div>
        <Link to="/materiaux" style={{ color: "#2563eb" }}>← Retour au catalogue</Link>
      </div>
    );
  }

  const price = material.currentPrice;
  const variation = material.variationPct ?? 0;
  const variationColor = variation > 1.5 ? "#dc2626" : variation < -1.5 ? "#16a34a" : "#6b7280";

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px" }}>
      <Link to="/materiaux" style={{ color: "#6b7280", fontSize: 13, textDecoration: "none" }}>
        ← Catalogue
      </Link>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {material.category} · code {material.code}
        </div>
        <h1 style={{ margin: "4px 0 6px", fontSize: 24, fontWeight: 700 }}>{material.label}</h1>
        <div style={{ fontSize: 14, color: "#6b7280", direction: "rtl", fontFamily: "system-ui" }}>{material.labelAr}</div>
        <p style={{ marginTop: 10, color: "#374151", fontSize: 14, lineHeight: 1.5 }}>{material.description}</p>
      </div>

      {/* Sélecteur région */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <label style={{ fontSize: 13, color: "#6b7280" }}>Région:</label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          style={{
            padding: "8px 10px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 13,
            background: "#fff",
          }}
        >
          {regions.length === 0 && <option value={DEFAULT_REGION}>Casablanca-Settat</option>}
          {regions.map((r) => (
            <option key={r.code} value={r.code}>{r.label}</option>
          ))}
        </select>
      </div>

      {price && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          <PriceBlock label="Prix minimum" value={price.prixMin} unit={material.unit} />
          <PriceBlock label="Prix moyen" value={price.prixMoyen} unit={material.unit} highlight />
          <PriceBlock label="Prix maximum" value={price.prixMax} unit={material.unit} />
          <div>
            <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>Variation M-1</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: variationColor }}>
              {variation > 0 ? "+" : ""}{variation.toFixed(1)}%
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>vs mois précédent</div>
          </div>
        </div>
      )}

      {/* Graphique mini SVG */}
      {history.length > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Évolution sur 12 mois</h3>
          <MiniLineChart points={history} unit={material.unit} />
        </div>
      )}

      {/* Spécifications */}
      <div
        style={{
          marginTop: 16,
          padding: 16,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
        }}
      >
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Spécifications</h3>
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, margin: 0 }}>
          <SpecRow label="Unité" value={String(material.unit)} />
          {Object.entries(material.specs || {}).map(([k, v]) => (
            <SpecRow key={k} label={prettyKey(k)} value={String(v)} />
          ))}
          {material.normesRefs?.length > 0 && (
            <SpecRow label="Normes" value={material.normesRefs.join(", ")} />
          )}
        </dl>
      </div>

      {material.marquesCourantes?.length > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Marques courantes au Maroc</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {material.marquesCourantes.map((m) => (
              <span
                key={m}
                style={{
                  padding: "5px 10px",
                  background: "#f3f4f6",
                  borderRadius: 999,
                  fontSize: 12,
                  color: "#374151",
                }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      <MaterialPriceCompare material={material} region={region} />

      {price && (
        <p style={{ marginTop: 12, fontSize: 11, color: "#9ca3af" }}>
          Source: {price.source} — {price.observations} observations — snapshot {price.yearMonth}
        </p>
      )}
    </div>
  );
}

function PriceBlock({ label, value, unit, highlight }: { label: string; value: number; unit: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: highlight ? 26 : 20, fontWeight: 700, color: "#111827" }}>
        {fmtMad(value, false)}
      </div>
      <div style={{ fontSize: 11, color: "#6b7280" }}>MAD HT {fmtUnit(unit)}</div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", marginBottom: 2 }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 13, color: "#111827", fontWeight: 500 }}>{value}</dd>
    </div>
  );
}

function prettyKey(k: string): string {
  return k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " ");
}

/** Pure-SVG mini line chart (no chart lib). */
function MiniLineChart({ points, unit }: { points: MaterialPriceHistoryPoint[]; unit: string }) {
  const W = 600;
  const H = 200;
  const PAD = { top: 12, right: 12, bottom: 28, left: 56 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const { minY, maxY } = useMemo(() => {
    const ys = points.map((p) => p.prixMoyen);
    const minV = Math.min(...ys);
    const maxV = Math.max(...ys);
    // Pad 5%
    const pad = (maxV - minV) * 0.1 || maxV * 0.05;
    return { minY: Math.max(0, minV - pad), maxY: maxV + pad };
  }, [points]);

  const xScale = (i: number) => PAD.left + (i / (points.length - 1 || 1)) * innerW;
  const yScale = (v: number) => PAD.top + innerH - ((v - minY) / (maxY - minY || 1)) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(p.prixMoyen).toFixed(1)}`)
    .join(" ");

  // Y-axis ticks (3)
  const yTicks = [minY, (minY + maxY) / 2, maxY];

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Historique 12 mois">
        {/* Y grid + labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
            <text x={PAD.left - 6} y={yScale(t) + 3} fontSize={10} textAnchor="end" fill="#9ca3af">
              {Math.round(t).toLocaleString("fr-FR")}
            </text>
          </g>
        ))}
        {/* X labels (every other month) */}
        {points.map((p, i) =>
          i % 2 === 0 ? (
            <text
              key={p.yearMonth}
              x={xScale(i)}
              y={H - 8}
              fontSize={10}
              textAnchor="middle"
              fill="#9ca3af"
            >
              {p.yearMonth.slice(2)}
            </text>
          ) : null,
        )}
        {/* Line */}
        <path d={path} fill="none" stroke="#2563eb" strokeWidth={2} />
        {/* Dots */}
        {points.map((p, i) => (
          <circle
            key={p.yearMonth}
            cx={xScale(i)}
            cy={yScale(p.prixMoyen)}
            r={3}
            fill="#2563eb"
          >
            <title>{`${p.yearMonth}: ${p.prixMoyen.toLocaleString("fr-FR")} MAD ${fmtUnit(unit)}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
