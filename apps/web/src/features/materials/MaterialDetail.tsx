import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useT } from "../../i18n/i18n";
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

type Tab = "price" | "specs" | "brands" | "compare" | "buy";

/**
 * MaterialDetail — page détail avec onglets:
 *   Prix · Spécifications · Marques · Comparateur · Achat
 * + Graphique 12 mois agrandi avec axes labellisés
 * + Bouton "Ajouter à mon devis" (placeholder)
 * + Partage WhatsApp (Web Share API + fallback wa.me)
 */
export default function MaterialDetail() {
  const t = useT();
  const { code } = useParams<{ code: string }>();
  const [material, setMaterial] = useState<MaterialWithPrice | null>(null);
  const [history, setHistory] = useState<MaterialPriceHistoryPoint[]>([]);
  const [regions, setRegions] = useState<RegionDescriptor[]>([]);
  const [region, setRegion] = useState<string>(DEFAULT_REGION);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("price");

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
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Erreur de chargement";
        setError(msg);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [code, region]);

  if (loading) return <div style={{ padding: 24 }}>{t("common.loading")}</div>;
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
  const variationColor =
    variation > 1.5 ? "#dc2626" : variation < -1.5 ? "#16a34a" : "#6b7280";

  function addToQuote() {
    // Placeholder — TODO: brancher sur Tome 1 (devis dossier en cours).
    // eslint-disable-next-line no-console
    console.log("[MaterialDetail] add-to-quote", { code: material?.code, region, price: price?.prixMoyen });
    alert(t("mat.detail.add_to_quote") + " ✓");
  }

  async function shareWhatsApp() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${material!.label}\n${
      price ? `${fmtMad(price.prixMoyen)} ${fmtUnit(material!.unit)}` : ""
    }\n${url}`;
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> })
          .share({ title: material!.label, text, url });
        return;
      }
    } catch { /* fallback */ }
    if (typeof window !== "undefined") {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px" }}>
      <Link to="/materiaux" style={{ color: "#6b7280", fontSize: 13, textDecoration: "none" }}>
        ← {t("mat.catalog.title")}
      </Link>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {material.category} · code {material.code}
        </div>
        <h1 style={{ margin: "4px 0 6px", fontSize: 24, fontWeight: 700 }}>{material.label}</h1>
        <div style={{ fontSize: 14, color: "#6b7280", direction: "rtl", fontFamily: "system-ui" }}>
          {material.labelAr}
        </div>
        <p style={{ marginTop: 10, color: "#374151", fontSize: 14, lineHeight: 1.5 }}>
          {material.description}
        </p>
      </div>

      {/* Actions header */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        <button
          type="button"
          onClick={addToQuote}
          style={{
            padding: "10px 16px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          + {t("mat.detail.add_to_quote")}
        </button>
        <button
          type="button"
          onClick={shareWhatsApp}
          style={{
            padding: "10px 16px",
            background: "#25D366",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          📱 {t("mat.detail.share_whatsapp")}
        </button>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          style={{
            marginLeft: "auto",
            padding: "10px 12px",
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

      {/* Tabs */}
      <div
        style={{
          marginTop: 18,
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          gap: 4,
          overflowX: "auto",
        }}
      >
        <TabBtn active={tab === "price"} onClick={() => setTab("price")}>
          {t("mat.detail.tab.price")}
        </TabBtn>
        <TabBtn active={tab === "specs"} onClick={() => setTab("specs")}>
          {t("mat.detail.tab.specs")}
        </TabBtn>
        <TabBtn active={tab === "brands"} onClick={() => setTab("brands")}>
          {t("mat.detail.tab.brands")}
        </TabBtn>
        <TabBtn active={tab === "compare"} onClick={() => setTab("compare")}>
          {t("mat.detail.tab.compare")}
        </TabBtn>
        <TabBtn active={tab === "buy"} onClick={() => setTab("buy")}>
          {t("mat.detail.tab.buy")}
        </TabBtn>
      </div>

      {/* ─── Tab: PRICE ─── */}
      {tab === "price" && (
        <>
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
              <PriceBlock label={t("mat.price.min")} value={price.prixMin} unit={material.unit} />
              <PriceBlock label={t("mat.price.avg")} value={price.prixMoyen} unit={material.unit} highlight />
              <PriceBlock label={t("mat.price.max")} value={price.prixMax} unit={material.unit} />
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>Variation M-1</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: variationColor }}>
                  {variation > 0 ? "+" : ""}{variation.toFixed(1)}%
                </div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>vs mois précédent</div>
              </div>
            </div>
          )}
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
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{t("mat.detail.chart_title")}</h3>
              <BigLineChart points={history} unit={material.unit} t={t} />
            </div>
          )}
          {price && (
            <p style={{ marginTop: 12, fontSize: 11, color: "#9ca3af" }}>
              Source: {price.source} — {price.observations} observations — snapshot {price.yearMonth}
            </p>
          )}
        </>
      )}

      {/* ─── Tab: SPECS ─── */}
      {tab === "specs" && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{t("mat.detail.tab.specs")}</h3>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              margin: 0,
            }}
          >
            <SpecRow label={t("mat.unit")} value={String(material.unit)} />
            {Object.entries(material.specs || {}).map(([k, v]) => (
              <SpecRow key={k} label={prettyKey(k)} value={String(v)} />
            ))}
            {material.normesRefs?.length > 0 && (
              <SpecRow label="Normes" value={material.normesRefs.join(", ")} />
            )}
          </dl>
        </div>
      )}

      {/* ─── Tab: BRANDS ─── */}
      {tab === "brands" && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{t("mat.brands.title")}</h3>
          {(material.marquesCourantes || []).length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 13 }}>—</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(material.marquesCourantes || []).map((m) => (
                <span
                  key={m}
                  style={{
                    padding: "8px 14px",
                    background: "#eef2ff",
                    border: "1px solid #c7d2fe",
                    borderRadius: 999,
                    fontSize: 13,
                    color: "#3730a3",
                    fontWeight: 600,
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: COMPARE ─── */}
      {tab === "compare" && (
        <div style={{ marginTop: 4 }}>
          <MaterialPriceCompare material={material} region={region} />
        </div>
      )}

      {/* ─── Tab: BUY ─── */}
      {tab === "buy" && (
        <div
          style={{
            marginTop: 16,
            padding: 32,
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            border: "1px solid #fcd34d",
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#78350f" }}>
            {t("mat.detail.buy.soon")}
          </div>
          <div style={{ fontSize: 12, color: "#92400e", marginTop: 6 }}>
            Marketplace fournisseurs CITURBAREA — Q3 2026
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 16px",
        background: "transparent",
        border: "none",
        borderBottom: `2px solid ${active ? "#2563eb" : "transparent"}`,
        color: active ? "#2563eb" : "#6b7280",
        fontWeight: active ? 700 : 500,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
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

/**
 * BigLineChart — graphique 12 mois agrandi avec axes labellisés (mois X, MAD Y).
 */
function BigLineChart({
  points,
  unit,
  t,
}: {
  points: MaterialPriceHistoryPoint[];
  unit: string;
  t: (k: string) => string;
}) {
  const W = 800;
  const H = 280;
  const PAD = { top: 16, right: 16, bottom: 48, left: 72 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const { minY, maxY } = useMemo(() => {
    const ys = points.map((p) => p.prixMoyen);
    const minV = Math.min(...ys);
    const maxV = Math.max(...ys);
    const pad = (maxV - minV) * 0.1 || maxV * 0.05;
    return { minY: Math.max(0, minV - pad), maxY: maxV + pad };
  }, [points]);

  const xScale = (i: number) =>
    PAD.left + (i / (points.length - 1 || 1)) * innerW;
  const yScale = (v: number) =>
    PAD.top + innerH - ((v - minY) / (maxY - minY || 1)) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(p.prixMoyen).toFixed(1)}`)
    .join(" ");

  // Aire sous la courbe
  const area =
    `${path} L ${xScale(points.length - 1).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} ` +
    `L ${xScale(0).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`;

  const yTicks = [minY, (minY + maxY) * 0.25 + minY * 0, (minY + maxY) / 2, (minY + maxY) * 0.75, maxY].map((v, i, a) => {
    // espacer régulièrement entre min et max
    return minY + ((maxY - minY) * i) / (a.length - 1);
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Historique 12 mois"
        style={{ minWidth: 480 }}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y axis label */}
        <text
          x={16}
          y={H / 2}
          fontSize={11}
          textAnchor="middle"
          fill="#6b7280"
          fontWeight={600}
          transform={`rotate(-90 16 ${H / 2})`}
        >
          {t("mat.detail.price_axis")}
        </text>

        {/* X axis label */}
        <text
          x={PAD.left + innerW / 2}
          y={H - 6}
          fontSize={11}
          textAnchor="middle"
          fill="#6b7280"
          fontWeight={600}
        >
          {t("mat.detail.month_axis")}
        </text>

        {/* Y grid + labels */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={yScale(tick) + 4}
              fontSize={11}
              textAnchor="end"
              fill="#6b7280"
            >
              {Math.round(tick).toLocaleString("fr-FR")}
            </text>
          </g>
        ))}

        {/* X axis baseline */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + innerH}
          y2={PAD.top + innerH}
          stroke="#9ca3af"
          strokeWidth={1}
        />
        {/* Y axis baseline */}
        <line
          x1={PAD.left}
          x2={PAD.left}
          y1={PAD.top}
          y2={PAD.top + innerH}
          stroke="#9ca3af"
          strokeWidth={1}
        />

        {/* X labels */}
        {points.map((p, i) => (
          <text
            key={p.yearMonth}
            x={xScale(i)}
            y={H - PAD.bottom + 18}
            fontSize={10}
            textAnchor="middle"
            fill="#6b7280"
          >
            {p.yearMonth.slice(5)}
          </text>
        ))}

        {/* Aire */}
        <path d={area} fill="url(#areaGrad)" />

        {/* Line */}
        <path d={path} fill="none" stroke="#2563eb" strokeWidth={2.5} strokeLinejoin="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <circle
            key={p.yearMonth}
            cx={xScale(i)}
            cy={yScale(p.prixMoyen)}
            r={4}
            fill="#fff"
            stroke="#2563eb"
            strokeWidth={2}
          >
            <title>{`${p.yearMonth}: ${p.prixMoyen.toLocaleString("fr-FR")} MAD ${fmtUnit(unit)}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
