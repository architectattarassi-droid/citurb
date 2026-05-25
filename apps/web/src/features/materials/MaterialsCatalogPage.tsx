import React, { useEffect, useState } from "react";
import {
  DEFAULT_REGION,
  fetchCatalog,
  fetchIndex,
  searchMaterials,
  type CatalogResponse,
  type CiturbareaIndex,
  type MaterialCategoryDescriptor,
  type MaterialWithPrice,
  type RegionDescriptor,
} from "./materials.api";
import MaterialCard from "./MaterialCard";

/**
 * MaterialsCatalogPage — page d'accueil du catalogue.
 * Mobile-first:
 *   - Header sticky: search + sélecteur région
 *   - Bandeau indice CITURBAREA
 *   - Chips catégories (scroll horizontal)
 *   - Grid 2 cols mobile / 3 tablette / 4 desktop
 */
export default function MaterialsCatalogPage() {
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [region, setRegion] = useState<string>(DEFAULT_REGION);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<MaterialWithPrice[] | null>(null);
  const [index, setIndex] = useState<CiturbareaIndex | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Charge catalog quand region/category change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCatalog({ region, category: category ?? undefined })
      .then((c) => {
        if (cancelled) return;
        setData(c);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Erreur de chargement du catalogue");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [region, category]);

  // Charge indice CITURBAREA quand region change
  useEffect(() => {
    let cancelled = false;
    fetchIndex(region)
      .then((r) => { if (!cancelled) setIndex(r.index); })
      .catch(() => { /* non bloquant */ });
    return () => { cancelled = true; };
  }, [region]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    const t = setTimeout(() => {
      searchMaterials(query, region)
        .then((r) => setSearchResults(r.results))
        .catch(() => setSearchResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query, region]);

  const categories: MaterialCategoryDescriptor[] = data?.categories ?? [];
  const regions: RegionDescriptor[] = data?.regions ?? [];
  const materials: MaterialWithPrice[] = searchResults ?? data?.materials ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* HEADER STICKY */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "12px 16px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            Catalogue prix matériaux BTP
          </h1>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            Référence Maroc — {data?.meta.materialsCount ?? "…"} matériaux ·
            snapshot {data?.meta.yearMonth ?? "…"} · {data?.meta.vatNote ?? "Prix HT"}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <input
              type="search"
              placeholder="Rechercher (ex. ciment, carrelage, acier 12…)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: "1 1 240px",
                minWidth: 0,
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
              }}
            />
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{
                flex: "0 1 220px",
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

          {/* Chips catégories (scroll horizontal sur mobile) */}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 6,
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              paddingBottom: 4,
            }}
          >
            <Chip active={category === null} onClick={() => setCategory(null)}>Tous</Chip>
            {categories.map((c) => (
              <Chip
                key={c.code}
                active={category === c.code}
                onClick={() => setCategory(c.code)}
              >
                {c.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* INDICE CITURBAREA */}
      {index && (
        <div
          style={{
            maxWidth: 1200,
            margin: "16px auto 0",
            padding: "12px 16px",
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            color: "#fff",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Indice CITURBAREA — gros œuvre
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 2 }}>
              {index.indice.toFixed(1)}
              <span style={{ fontSize: 14, fontWeight: 400, opacity: 0.6, marginLeft: 8 }}>base 100</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Écart vs national</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: index.variationVsBaseline > 0 ? "#fca5a5" : "#86efac",
              }}
            >
              {index.variationVsBaseline > 0 ? "+" : ""}{index.variationVsBaseline.toFixed(1)} pts
            </div>
            <div style={{ fontSize: 10, opacity: 0.5 }}>snapshot {index.yearMonth}</div>
          </div>
        </div>
      )}

      {/* GRID */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
        {loading && <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Chargement…</div>}
        {error && <div style={{ color: "#dc2626", padding: 16 }}>{error}</div>}
        {!loading && !error && materials.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
            Aucun matériau ne correspond à votre recherche.
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
            gap: 12,
          }}
        >
          {materials.map((m) => (
            <MaterialCard key={m.code} material={m} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: "0 0 auto",
        padding: "6px 12px",
        background: active ? "#111827" : "#fff",
        color: active ? "#fff" : "#374151",
        border: `1px solid ${active ? "#111827" : "#d1d5db"}`,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: "nowrap",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
