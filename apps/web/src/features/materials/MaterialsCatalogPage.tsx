import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "../../i18n/i18n";
import {
  DEFAULT_REGION,
  fetchCatalog,
  fetchIndex,
  fetchPriceHistory,
  searchMaterials,
  fmtMad,
  fmtUnit,
  type CatalogResponse,
  type CiturbareaIndex,
  type MaterialCategoryDescriptor,
  type MaterialWithPrice,
  type MaterialPriceHistoryPoint,
  type RegionDescriptor,
} from "./materials.api";
import MaterialCard, { isEco } from "./MaterialCard";
import PriceRangeSlider from "./PriceRangeSlider";

type SortKey = "relevance" | "price_asc" | "price_desc" | "variation" | "alpha";
type ViewMode = "grid" | "table";
type VariationFilter = "all" | "up" | "down" | "stable";

const STEPS = [0, 100, 500, 1000, 2500, 5000, 10000, 25000, 50000];
const PRICE_MAX_DEFAULT = STEPS[STEPS.length - 1];

/**
 * MaterialsCatalogPage — page catalogue desktop-class.
 *
 * Layout :
 *   - Desktop (≥1024px) : sidebar 280px gauche (sticky) + main
 *   - Mobile  (≤1023px) : bouton "Filtres" → bottom-sheet
 *
 * Features :
 *   - Search avec datalist + suggestions live (top-5 fuzzy)
 *   - Filtres: catégories chips, slider prix, région, observations, variation, tri
 *   - View toggle Grid / Table
 *   - 0 résultat strict → bandeau jaune + top 12 catégorie + lien "Voir tout"
 *   - Indice CITURBAREA en bandeau haut avec mini-chart SVG 12 mois
 */
export default function MaterialsCatalogPage() {
  const t = useT();

  const [data, setData] = useState<CatalogResponse | null>(null);
  const [region, setRegion] = useState<string>(DEFAULT_REGION);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");
  const [debounced, setDebounced] = useState<string>("");
  const [searchResults, setSearchResults] = useState<MaterialWithPrice[] | null>(null);
  const [index, setIndex] = useState<CiturbareaIndex | null>(null);
  const [indexHistory, setIndexHistory] = useState<MaterialPriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filtres avancés ──
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(PRICE_MAX_DEFAULT);
  const [withObs, setWithObs] = useState<boolean>(false);
  const [variationFilter, setVariationFilter] = useState<VariationFilter>("all");
  const [sort, setSort] = useState<SortKey>("relevance");

  // ── UI mode ──
  const [view, setView] = useState<ViewMode>("grid");
  const [mobileFilters, setMobileFilters] = useState<boolean>(false);
  const [showSuggest, setShowSuggest] = useState<boolean>(false);

  // ─── Charge catalog ─────────────────────────────────────────
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
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Erreur de chargement";
        setError(msg);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [region, category]);

  // ─── Charge indice + mini-history (12 mois — réutilise un matériau pivot) ───
  useEffect(() => {
    let cancelled = false;
    fetchIndex(region)
      .then((r) => { if (!cancelled) setIndex(r.index); })
      .catch(() => { /* non bloquant */ });
    return () => { cancelled = true; };
  }, [region]);

  // Mini-chart de l'indice : on tape l'historique du 1er matériau du catalogue
  // pour avoir une silhouette (proxy visuel). Optionnel/best-effort.
  useEffect(() => {
    if (!data || !data.materials.length) return;
    let cancelled = false;
    const pivot = data.materials[0].code;
    fetchPriceHistory(pivot, region, 12)
      .then((r) => { if (!cancelled) setIndexHistory(r.history); })
      .catch(() => { /* non bloquant */ });
    return () => { cancelled = true; };
  }, [data, region]);

  // ─── Debounce 200ms du query ────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(id);
  }, [query]);

  // ─── Search (debounced) ─────────────────────────────────────
  useEffect(() => {
    if (!debounced) {
      setSearchResults(null);
      return;
    }
    let cancelled = false;
    searchMaterials(debounced, region)
      .then((r) => { if (!cancelled) setSearchResults(r.results); })
      .catch(() => { if (!cancelled) setSearchResults([]); });
  }, [debounced, region]);

  // ─── Catalog + filtres + tri ────────────────────────────────
  const categories: MaterialCategoryDescriptor[] = data?.categories ?? [];
  const regions: RegionDescriptor[] = data?.regions ?? [];

  // Source: search results OR catalog filtered by category.
  const baseList: MaterialWithPrice[] = useMemo(
    () => searchResults ?? data?.materials ?? [],
    [searchResults, data],
  );

  const filtered: MaterialWithPrice[] = useMemo(() => {
    return baseList.filter((m) => {
      const p = m.currentPrice;
      // Filtre prix : on regarde le prix moyen
      if (p) {
        if (p.prixMoyen < priceMin) return false;
        if (p.prixMoyen > priceMax) return false;
      } else if (priceMin > 0 || priceMax < PRICE_MAX_DEFAULT) {
        // si filtre actif et pas de prix : on exclut
        return false;
      }
      // Filtre observations
      if (withObs && (!p || p.observations === 0)) return false;
      // Filtre variation
      const v = m.variationPct ?? 0;
      if (variationFilter === "up" && v <= 0.5) return false;
      if (variationFilter === "down" && v >= -0.5) return false;
      if (variationFilter === "stable" && (v > 0.5 || v < -0.5)) return false;
      return true;
    });
  }, [baseList, priceMin, priceMax, withObs, variationFilter]);

  const sorted: MaterialWithPrice[] = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case "price_asc":
        arr.sort((a, b) => (a.currentPrice?.prixMoyen ?? Infinity) - (b.currentPrice?.prixMoyen ?? Infinity));
        break;
      case "price_desc":
        arr.sort((a, b) => (b.currentPrice?.prixMoyen ?? -Infinity) - (a.currentPrice?.prixMoyen ?? -Infinity));
        break;
      case "variation":
        arr.sort((a, b) => Math.abs(b.variationPct ?? 0) - Math.abs(a.variationPct ?? 0));
        break;
      case "alpha":
        arr.sort((a, b) => a.label.localeCompare(b.label, "fr"));
        break;
      default:
        // relevance: si search → ordre du serveur ; sinon alpha doux
        if (!searchResults) {
          arr.sort((a, b) => a.label.localeCompare(b.label, "fr"));
        }
    }
    return arr;
  }, [filtered, sort, searchResults]);

  // ─── Suggestions live (top-5 fuzzy local) ───────────────────
  const suggestions: MaterialWithPrice[] = useMemo(() => {
    if (!debounced || !data) return [];
    const q = debounced.toLowerCase();
    const matchScore = (m: MaterialWithPrice): number => {
      const lab = m.label.toLowerCase();
      if (lab.startsWith(q)) return 100;
      if (lab.includes(q)) return 80;
      // tokens
      const tokens = q.split(/\s+/).filter((s) => s.length >= 2);
      let s = 0;
      for (const tok of tokens) if (lab.includes(tok)) s += 10;
      return s;
    };
    return [...data.materials]
      .map((m) => ({ m, s: matchScore(m) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5)
      .map((x) => x.m);
  }, [debounced, data]);

  // ─── Fallback "0 résultat strict" : top 12 catégorie ────────
  const noResultsFallback: MaterialWithPrice[] = useMemo(() => {
    if (!data) return [];
    if (sorted.length > 0) return [];
    if (!debounced) return [];
    // Catégorie de recherche : si la query matche un libellé catégorie, on prend cette catégorie.
    const q = debounced.toLowerCase();
    const matchedCat = categories.find(
      (c) => c.label.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
    const targetCat = matchedCat?.code ?? category ?? null;
    const pool = targetCat
      ? data.materials.filter((m) => m.category === targetCat)
      : data.materials;
    return pool.slice(0, 12);
  }, [data, sorted.length, debounced, categories, category]);

  // ─── Reset filtres ──────────────────────────────────────────
  function resetFilters() {
    setCategory(null);
    setQuery("");
    setPriceMin(0);
    setPriceMax(PRICE_MAX_DEFAULT);
    setWithObs(false);
    setVariationFilter("all");
    setSort("relevance");
  }

  const datalistOptions = useMemo(() => {
    if (!data) return [];
    return data.materials.map((m) => m.label);
  }, [data]);

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* ── HEADER STICKY ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "12px 16px",
        }}
      >
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            {t("mat.catalog.title")}
          </h1>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            Référence Maroc — {data?.meta.materialsCount ?? "…"} matériaux ·
            snapshot {data?.meta.yearMonth ?? "…"} · {data?.meta.vatNote ?? "Prix HT"}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", position: "relative" }}>
            <div style={{ flex: "1 1 240px", minWidth: 0, position: "relative" }}>
              <input
                type="search"
                list="materials-list"
                placeholder={t("mat.search.placeholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <datalist id="materials-list">
                {datalistOptions.map((label) => (
                  <option key={label} value={label} />
                ))}
              </datalist>

              {showSuggest && suggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    boxShadow: "0 10px 24px rgba(0,0,0,0.10)",
                    overflow: "hidden",
                    zIndex: 30,
                  }}
                  role="listbox"
                >
                  <div
                    style={{
                      padding: "6px 12px",
                      fontSize: 10,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      background: "#f9fafb",
                      borderBottom: "1px solid #e5e7eb",
                      fontWeight: 600,
                    }}
                  >
                    {t("mat.search.suggestions")}
                  </div>
                  {suggestions.map((m) => (
                    <Link
                      key={m.code}
                      to={`/materiaux/${encodeURIComponent(m.code)}`}
                      onMouseDown={(e) => e.preventDefault()}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        textDecoration: "none",
                        color: "inherit",
                        fontSize: 13,
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <span style={{ flex: 1 }}>{m.label}</span>
                      {m.currentPrice && (
                        <span style={{ color: "#6b7280", fontSize: 12, whiteSpace: "nowrap" }}>
                          {fmtMad(m.currentPrice.prixMoyen, false)} {fmtUnit(m.unit)}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

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

            {/* Toggle vue Grid/Table */}
            <div
              style={{
                display: "flex",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <ViewBtn active={view === "grid"} onClick={() => setView("grid")} label={t("mat.view.grid")} icon="▦" />
              <ViewBtn active={view === "table"} onClick={() => setView("table")} label={t("mat.view.table")} icon="≡" />
            </div>

            {/* Bouton filtres mobile */}
            <button
              type="button"
              onClick={() => setMobileFilters(true)}
              className="citurb-mobile-filters-btn"
              style={{
                padding: "10px 14px",
                background: "#111827",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "none", // shown via CSS @media
              }}
            >
              ☰ {t("mat.filter.title")}
            </button>
            <style>{`
              @media (max-width: 1023px) {
                .citurb-mobile-filters-btn { display: inline-block !important; }
                .citurb-sidebar { display: none !important; }
              }
              @media (min-width: 1024px) {
                .citurb-mobile-sheet { display: none !important; }
              }
            `}</style>
          </div>
        </div>
      </div>

      {/* ── INDICE CITURBAREA + mini-chart ── */}
      {index && (
        <div
          style={{
            maxWidth: 1400,
            margin: "16px auto 0",
            padding: "14px 18px",
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            color: "#fff",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Indice CITURBAREA — gros œuvre
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 2 }}>
              {index.indice.toFixed(1)}
              <span style={{ fontSize: 14, fontWeight: 400, opacity: 0.6, marginLeft: 8 }}>base 100</span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>snapshot {index.yearMonth}</div>
          </div>

          {/* mini-chart 12 mois */}
          {indexHistory.length > 1 && (
            <div style={{ flex: "1 1 200px", maxWidth: 360, minWidth: 200 }}>
              <MiniSparkline points={indexHistory} />
            </div>
          )}

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Écart vs national</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: index.variationVsBaseline > 0 ? "#fca5a5" : "#86efac",
              }}
            >
              {index.variationVsBaseline > 0 ? "+" : ""}
              {index.variationVsBaseline.toFixed(1)} pts
            </div>
          </div>
        </div>
      )}

      {/* ── BODY : sidebar + main ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: 16, display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Sidebar desktop */}
        <aside
          className="citurb-sidebar"
          style={{
            flex: "0 0 280px",
            position: "sticky",
            top: 140,
            maxHeight: "calc(100vh - 160px)",
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <FiltersPanel
            t={t}
            categories={categories}
            category={category}
            setCategory={setCategory}
            priceMin={priceMin}
            priceMax={priceMax}
            setPriceMin={setPriceMin}
            setPriceMax={setPriceMax}
            withObs={withObs}
            setWithObs={setWithObs}
            variationFilter={variationFilter}
            setVariationFilter={setVariationFilter}
            sort={sort}
            setSort={setSort}
            onReset={resetFilters}
          />
        </aside>

        {/* Main */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Count + tri header */}
          {!loading && !error && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
                {t("mat.results.count", { n: sorted.length })}
              </div>
              {/* tri inline desktop */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                style={{
                  padding: "8px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  fontSize: 13,
                  background: "#fff",
                }}
              >
                <option value="relevance">{t("mat.sort.relevance")}</option>
                <option value="price_asc">{t("mat.sort.price_asc")}</option>
                <option value="price_desc">{t("mat.sort.price_desc")}</option>
                <option value="variation">{t("mat.sort.variation")}</option>
                <option value="alpha">{t("mat.sort.alpha")}</option>
              </select>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
              {t("common.loading")}
            </div>
          )}
          {error && <div style={{ color: "#dc2626", padding: 16 }}>{error}</div>}

          {/* 0 résultat strict → bandeau jaune + top 12 catégorie */}
          {!loading && !error && sorted.length === 0 && debounced && (
            <NoResultsBanner
              t={t}
              query={debounced}
              fallback={noResultsFallback}
              view={view}
              onSeeAll={resetFilters}
            />
          )}
          {!loading && !error && sorted.length === 0 && !debounced && (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
              {t("mat.search.no_match")}
            </div>
          )}

          {/* Liste résultats */}
          {!loading && !error && sorted.length > 0 && view === "grid" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              {sorted.map((m) => (
                <MaterialCard key={m.code} material={m} searchQuery={debounced} />
              ))}
            </div>
          )}
          {!loading && !error && sorted.length > 0 && view === "table" && (
            <MaterialsTable items={sorted} t={t} />
          )}
        </main>
      </div>

      {/* ── Mobile bottom-sheet filtres ── */}
      {mobileFilters && (
        <div
          className="citurb-mobile-sheet"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => setMobileFilters(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#fff",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 16,
              paddingBottom: 32,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t("mat.filter.title")}</h3>
              <button
                type="button"
                onClick={() => setMobileFilters(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 22,
                  cursor: "pointer",
                  color: "#6b7280",
                }}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <FiltersPanel
              t={t}
              categories={categories}
              category={category}
              setCategory={setCategory}
              priceMin={priceMin}
              priceMax={priceMax}
              setPriceMin={setPriceMin}
              setPriceMax={setPriceMax}
              withObs={withObs}
              setWithObs={setWithObs}
              variationFilter={variationFilter}
              setVariationFilter={setVariationFilter}
              sort={sort}
              setSort={setSort}
              onReset={resetFilters}
            />
            <button
              type="button"
              onClick={() => setMobileFilters(false)}
              style={{
                width: "100%",
                marginTop: 16,
                padding: 14,
                background: "#111827",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {t("mat.filter.apply")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────────────────────── */

function FiltersPanel({
  t,
  categories,
  category,
  setCategory,
  priceMin,
  priceMax,
  setPriceMin,
  setPriceMax,
  withObs,
  setWithObs,
  variationFilter,
  setVariationFilter,
  sort,
  setSort,
  onReset,
}: {
  t: (k: string, vars?: Record<string, string | number>) => string;
  categories: MaterialCategoryDescriptor[];
  category: string | null;
  setCategory: (c: string | null) => void;
  priceMin: number;
  priceMax: number;
  setPriceMin: (n: number) => void;
  setPriceMax: (n: number) => void;
  withObs: boolean;
  setWithObs: (b: boolean) => void;
  variationFilter: VariationFilter;
  setVariationFilter: (v: VariationFilter) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  onReset: () => void;
}) {
  return (
    <div>
      {/* Catégories */}
      <FilterSection title={t("mat.filter.categories")}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Chip active={category === null} onClick={() => setCategory(null)}>
            {t("mat.filter.all_categories")}
          </Chip>
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
      </FilterSection>

      {/* Prix slider */}
      <FilterSection title={t("mat.filter.price_range")}>
        <PriceRangeSlider
          min={priceMin}
          max={priceMax}
          onChange={(mn, mx) => {
            setPriceMin(mn);
            setPriceMax(mx);
          }}
          steps={STEPS}
        />
      </FilterSection>

      {/* Observations toggle */}
      <FilterSection title={t("mat.filter.with_observations")}>
        <ToggleSwitch checked={withObs} onChange={setWithObs} />
      </FilterSection>

      {/* Variation */}
      <FilterSection title={t("mat.filter.variation")}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Chip active={variationFilter === "all"} onClick={() => setVariationFilter("all")}>
            {t("mat.filter.all_categories")}
          </Chip>
          <Chip active={variationFilter === "up"} onClick={() => setVariationFilter("up")}>
            ↑ {t("mat.filter.variation.up")}
          </Chip>
          <Chip active={variationFilter === "down"} onClick={() => setVariationFilter("down")}>
            ↓ {t("mat.filter.variation.down")}
          </Chip>
          <Chip active={variationFilter === "stable"} onClick={() => setVariationFilter("stable")}>
            → {t("mat.filter.variation.stable")}
          </Chip>
        </div>
      </FilterSection>

      {/* Tri */}
      <FilterSection title={t("mat.sort.label")}>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          style={{
            width: "100%",
            padding: "8px 10px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 13,
            background: "#fff",
          }}
        >
          <option value="relevance">{t("mat.sort.relevance")}</option>
          <option value="price_asc">{t("mat.sort.price_asc")}</option>
          <option value="price_desc">{t("mat.sort.price_desc")}</option>
          <option value="variation">{t("mat.sort.variation")}</option>
          <option value="alpha">{t("mat.sort.alpha")}</option>
        </select>
      </FilterSection>

      <button
        type="button"
        onClick={onReset}
        style={{
          width: "100%",
          marginTop: 8,
          padding: "10px",
          background: "#fff",
          color: "#dc2626",
          border: "1px solid #fecaca",
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        ↺ {t("mat.filter.reset")}
      </button>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 11,
          color: "#374151",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
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
        padding: "5px 11px",
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

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        position: "relative",
        width: 44,
        height: 24,
        background: checked ? "#2563eb" : "#d1d5db",
        border: "none",
        borderRadius: 999,
        cursor: "pointer",
        transition: "background .15s",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          background: "#fff",
          borderRadius: "50%",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "left .15s",
        }}
      />
    </button>
  );
}

function ViewBtn({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      style={{
        padding: "8px 12px",
        background: active ? "#111827" : "#fff",
        color: active ? "#fff" : "#6b7280",
        border: "none",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {icon}
    </button>
  );
}

function NoResultsBanner({
  t,
  query,
  fallback,
  view,
  onSeeAll,
}: {
  t: (k: string, vars?: Record<string, string | number>) => string;
  query: string;
  fallback: MaterialWithPrice[];
  view: ViewMode;
  onSeeAll: () => void;
}) {
  return (
    <div>
      <div
        style={{
          background: "#fef9c3",
          border: "1px solid #fde047",
          color: "#854d0e",
          padding: "12px 16px",
          borderRadius: 10,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {t("mat.no_results.exact", { q: query })}
          </div>
          <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>
            {t("mat.no_results.suggestion")}
          </div>
        </div>
        <button
          type="button"
          onClick={onSeeAll}
          style={{
            padding: "8px 14px",
            background: "#854d0e",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t("mat.no_results.see_all")}
        </button>
      </div>
      {fallback.length > 0 && (
        view === "grid" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {fallback.map((m) => (
              <MaterialCard key={m.code} material={m} />
            ))}
          </div>
        ) : (
          <MaterialsTable items={fallback} t={t} />
        )
      )}
    </div>
  );
}

function MaterialsTable({
  items,
  t,
}: {
  items: MaterialWithPrice[];
  t: (k: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        overflowX: "auto",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f9fafb", textAlign: "left" }}>
            <Th>{t("mat.table.category")}</Th>
            <Th>{t("mat.table.code")}</Th>
            <Th>{t("mat.table.label")}</Th>
            <Th>{t("mat.table.unit")}</Th>
            <Th align="right">{t("mat.price.min")}</Th>
            <Th align="right">{t("mat.price.avg")}</Th>
            <Th align="right">{t("mat.price.max")}</Th>
            <Th align="right">{t("mat.table.variation")}</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((m) => {
            const p = m.currentPrice;
            const v = m.variationPct ?? 0;
            const vc = v > 1.5 ? "#dc2626" : v < -1.5 ? "#16a34a" : "#6b7280";
            return (
              <tr key={m.code} style={{ borderTop: "1px solid #f3f4f6" }}>
                <Td>
                  <span style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>
                    {m.category}
                  </span>
                </Td>
                <Td>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "#6b7280" }}>
                    {m.code}
                  </span>
                </Td>
                <Td>
                  <Link
                    to={`/materiaux/${encodeURIComponent(m.code)}`}
                    style={{ color: "#111827", textDecoration: "none", fontWeight: 600 }}
                  >
                    {m.label}
                    {isEco(m.code) && (
                      <span
                        style={{
                          marginLeft: 6,
                          background: "#16a34a",
                          color: "#fff",
                          fontSize: 9,
                          padding: "1px 5px",
                          borderRadius: 999,
                          fontWeight: 700,
                        }}
                      >
                        ♻
                      </span>
                    )}
                  </Link>
                </Td>
                <Td>{m.unit}</Td>
                <Td align="right">{p ? fmtMad(p.prixMin, false) : "—"}</Td>
                <Td align="right" bold>{p ? fmtMad(p.prixMoyen, false) : "—"}</Td>
                <Td align="right">{p ? fmtMad(p.prixMax, false) : "—"}</Td>
                <Td align="right">
                  <span style={{ color: vc, fontWeight: 700 }}>
                    {v > 0 ? "+" : ""}{v.toFixed(1)}%
                  </span>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      style={{
        padding: "10px 12px",
        fontSize: 11,
        fontWeight: 700,
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        textAlign: align ?? "left",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  bold,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  bold?: boolean;
}) {
  return (
    <td
      style={{
        padding: "10px 12px",
        textAlign: align ?? "left",
        fontWeight: bold ? 700 : 400,
        color: "#111827",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

/** Mini-sparkline 12 mois pour le bandeau indice (sans axes). */
function MiniSparkline({ points }: { points: MaterialPriceHistoryPoint[] }) {
  const W = 360;
  const H = 60;
  const PAD = 4;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  const ys = points.map((p) => p.prixMoyen);
  const minV = Math.min(...ys);
  const maxV = Math.max(...ys);
  const pad = (maxV - minV) * 0.1 || 1;
  const minY = minV - pad;
  const maxY = maxV + pad;

  const xScale = (i: number) => PAD + (i / (points.length - 1 || 1)) * innerW;
  const yScale = (v: number) => PAD + innerH - ((v - minY) / (maxY - minY || 1)) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(p.prixMoyen).toFixed(1)}`)
    .join(" ");

  const last = points[points.length - 1];
  const first = points[0];
  const trendUp = last && first && last.prixMoyen >= first.prixMoyen;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Tendance 12 mois"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={trendUp ? "#fca5a5" : "#86efac"} stopOpacity="0.4" />
          <stop offset="100%" stopColor={trendUp ? "#fca5a5" : "#86efac"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L ${xScale(points.length - 1).toFixed(1)} ${(PAD + innerH).toFixed(1)} L ${xScale(0).toFixed(1)} ${(PAD + innerH).toFixed(1)} Z`}
        fill="url(#sparkGrad)"
      />
      <path d={path} fill="none" stroke={trendUp ? "#fca5a5" : "#86efac"} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}
