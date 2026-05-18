/**
 * MarketplacePage — /cercles/marketplace
 * Référentiel matériaux BTP organisé par corps de métier.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CerclesShell from "../CerclesShell";
import { CC_THEME } from "../theme";
import { marketplaceApi, MarketProduct, CorpsMetierNode } from "../api";
import ProductCard from "./ProductCard";

export default function MarketplacePage() {
  const [taxonomy, setTaxonomy] = useState<CorpsMetierNode[]>([]);
  const [total, setTotal] = useState(0);
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [corpsMetier, setCorpsMetier] = useState("");
  const [famille, setFamille] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    marketplaceApi.taxonomy().then(r => { setTaxonomy(r.data.corpsMetier); setTotal(r.data.total); }).catch(() => {});
  }, []);

  const search = (cm = corpsMetier, fam = famille, query = q) => {
    setLoading(true);
    marketplaceApi.browse({ corpsMetier: cm || undefined, famille: fam || undefined, q: query.trim() || undefined })
      .then(r => setProducts(r.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { search(); /* eslint-disable-next-line */ }, []);

  const pickCorps = (code: string) => {
    const next = corpsMetier === code ? "" : code;
    setCorpsMetier(next); setFamille("");
    search(next, "", q);
  };
  const pickFamille = (fam: string) => {
    const next = famille === fam ? "" : fam;
    setFamille(next);
    search(corpsMetier, next, q);
  };

  const activeCorps = taxonomy.find(c => c.code === corpsMetier);

  return (
    <CerclesShell>
      <div style={S.root}>
        <header style={S.header}>
          <div>
            <div style={S.eyebrow}>Marketplace · Matériaux & équipements BTP</div>
            <h1 style={S.title}>Marketplace BTP Maroc</h1>
            <p style={S.lead}>{total} matériaux référencés — du gros œuvre aux finitions, organisés par corps de métier.</p>
          </div>
          <Link to="/cercles/mes-offres" style={S.myBtn}>🏪 Mes offres fournisseur</Link>
        </header>

        <div style={S.searchBar}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") search(); }}
            placeholder="Rechercher un matériau (ciment, fer, carrelage, câble…)"
            style={S.search}
          />
          <button onClick={() => search()} style={S.searchBtn}>Rechercher</button>
        </div>

        <div style={S.layout}>
          {/* Corps de métier */}
          <aside style={S.sidebar}>
            <div style={S.sideTitle}>Corps de métier</div>
            <button onClick={() => pickCorps("")} style={{ ...S.corpsBtn, ...(corpsMetier === "" ? S.corpsActive : {}) }}>
              Tous · {total}
            </button>
            {taxonomy.map(c => (
              <div key={c.code}>
                <button onClick={() => pickCorps(c.code)} style={{ ...S.corpsBtn, ...(corpsMetier === c.code ? S.corpsActive : {}) }}>
                  {c.label} · {c.count}
                </button>
                {corpsMetier === c.code && (
                  <div style={S.familles}>
                    {c.familles.map(f => (
                      <button key={f.famille} onClick={() => pickFamille(f.famille)}
                        style={{ ...S.familleBtn, ...(famille === f.famille ? S.familleActive : {}) }}>
                        {f.famille} ({f.count})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </aside>

          {/* Produits */}
          <main style={S.main}>
            <div style={S.crumb}>
              {activeCorps ? activeCorps.label : "Tous les corps de métier"}
              {famille && ` › ${famille}`}
              <span style={S.crumbCount}> — {products.length} résultat{products.length > 1 ? "s" : ""}</span>
            </div>
            {loading && <div style={S.muted}>Chargement…</div>}
            {!loading && products.length === 0 && (
              <div style={S.empty}>Aucun matériau pour ces critères.</div>
            )}
            {!loading && products.length > 0 && (
              <div style={S.grid}>
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </main>
        </div>
      </div>
    </CerclesShell>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { padding: "26px 28px 60px", maxWidth: 1240, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 16, flexWrap: "wrap" },
  eyebrow: { fontSize: 10.5, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  title: { margin: "6px 0 4px", fontFamily: CC_THEME.fontDisplay, fontSize: 30, fontWeight: 600, color: CC_THEME.navy },
  lead: { color: CC_THEME.inkMid, fontSize: 13.5, fontStyle: "italic", maxWidth: 560 },
  myBtn: { background: CC_THEME.navy, color: CC_THEME.bg, padding: "10px 16px", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" },

  searchBar: { display: "flex", gap: 10, marginBottom: 18 },
  search: { flex: 1, padding: "11px 14px", border: `1px solid ${CC_THEME.border}`, borderRadius: 6, fontSize: 13.5, fontFamily: "inherit", outline: "none", background: CC_THEME.bgRaised },
  searchBtn: { background: CC_THEME.or, color: CC_THEME.bgDeep, border: 0, padding: "11px 22px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },

  layout: { display: "grid", gridTemplateColumns: "260px 1fr", gap: 22, alignItems: "start" },
  sidebar: { display: "flex", flexDirection: "column", gap: 3, position: "sticky" as const, top: 12, background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, padding: 12 },
  sideTitle: { fontSize: 10, color: CC_THEME.or, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, padding: "4px 8px 8px" },
  corpsBtn: { width: "100%", textAlign: "left" as const, background: "transparent", border: 0, padding: "8px 10px", borderRadius: 6, fontSize: 12.5, color: CC_THEME.ink, cursor: "pointer", fontFamily: "inherit" },
  corpsActive: { background: CC_THEME.bgSoft, color: CC_THEME.navy, fontWeight: 700, boxShadow: `inset 2px 0 0 ${CC_THEME.or}` },
  familles: { display: "flex", flexDirection: "column", gap: 1, padding: "2px 0 6px 10px" },
  familleBtn: { textAlign: "left" as const, background: "transparent", border: 0, padding: "5px 8px", borderRadius: 4, fontSize: 11.5, color: CC_THEME.inkMid, cursor: "pointer", fontFamily: "inherit" },
  familleActive: { color: CC_THEME.or, fontWeight: 600 },

  main: { minWidth: 0 },
  crumb: { fontSize: 13, color: CC_THEME.navy, fontWeight: 600, marginBottom: 12 },
  crumbCount: { color: CC_THEME.inkMuted, fontWeight: 400 },
  muted: { color: CC_THEME.inkMuted, fontStyle: "italic", padding: 30 },
  empty: { textAlign: "center", padding: 40, background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, color: CC_THEME.inkMuted, fontStyle: "italic" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 },
};
