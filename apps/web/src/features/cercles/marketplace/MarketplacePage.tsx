/**
 * MarketplacePage — /cercles/marketplace
 * Catalogue transversal : tous les produits des fournisseurs BTP.
 * Recherche + filtres catégorie / région.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CerclesShell from "../CerclesShell";
import { CC_THEME } from "../theme";
import { marketplaceApi, SupplierProduct } from "../api";
import ProductCard, { CATEGORY_LABELS } from "./ProductCard";

const REGIONS = [
  "Tanger-Tétouan-Al Hoceïma", "Oriental", "Fès-Meknès", "Rabat-Salé-Kénitra",
  "Béni Mellal-Khénifra", "Casablanca-Settat", "Marrakech-Safi", "Drâa-Tafilalet",
  "Souss-Massa", "Guelmim-Oued Noun", "Laâyoune-Sakia El Hamra", "Dakhla-Oued Ed-Dahab",
];

export default function MarketplacePage() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    marketplaceApi.meta().then(r => setCategories(r.data.categories)).catch(() => {});
  }, []);

  const search = () => {
    setLoading(true);
    marketplaceApi.browse({ q: q.trim() || undefined, category: category || undefined, region: region || undefined })
      .then(r => { setProducts(r.data); setTotal(r.meta.total); })
      .catch(() => { setProducts([]); setTotal(0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { search(); /* eslint-disable-next-line */ }, [category, region]);

  return (
    <CerclesShell>
      <div style={S.root}>
        <header style={S.header}>
          <div>
            <div style={S.eyebrow}>Marketplace · Matériaux & équipements BTP</div>
            <h1 style={S.title}>Marketplace BTP Maroc</h1>
            <p style={S.lead}>Ciment, acier, étanchéité, carrelage, menuiserie… les produits des fournisseurs de la communauté.</p>
          </div>
          <Link to="/cercles/ma-vitrine" style={S.myStoreBtn}>🏪 Ma vitrine fournisseur</Link>
        </header>

        <div style={S.filters}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") search(); }}
            placeholder="Rechercher un produit, une référence…"
            style={S.search}
          />
          <select value={category} onChange={e => setCategory(e.target.value)} style={S.select}>
            <option value="">Toutes catégories</option>
            {categories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
          </select>
          <select value={region} onChange={e => setRegion(e.target.value)} style={S.select}>
            <option value="">Toutes régions</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={search} style={S.searchBtn}>Rechercher</button>
        </div>

        {loading && <div style={S.muted}>Chargement…</div>}
        {!loading && (
          <div style={S.count}>{total} produit{total > 1 ? "s" : ""}</div>
        )}
        {!loading && products.length === 0 && (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏗</div>
            <div style={S.emptyTitle}>Aucun produit pour ces critères</div>
            <p style={S.emptyBody}>
              Tu es fournisseur ? <Link to="/cercles/ma-vitrine" style={{ color: CC_THEME.or, fontWeight: 600 }}>Crée ta vitrine</Link> et publie tes produits.
            </p>
          </div>
        )}
        {!loading && products.length > 0 && (
          <div style={S.grid}>
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </CerclesShell>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { padding: "28px 32px 60px", maxWidth: 1180, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 20, flexWrap: "wrap" },
  eyebrow: { fontSize: 10.5, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  title: { margin: "6px 0 4px", fontFamily: CC_THEME.fontDisplay, fontSize: 30, fontWeight: 600, color: CC_THEME.navy },
  lead: { color: CC_THEME.inkMid, fontSize: 13.5, fontStyle: "italic", maxWidth: 560 },
  myStoreBtn: { background: CC_THEME.navy, color: CC_THEME.bg, padding: "10px 16px", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" },

  filters: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
  search: { flex: 1, minWidth: 220, padding: "10px 13px", border: `1px solid ${CC_THEME.border}`, borderRadius: 6, fontSize: 13, fontFamily: "inherit", outline: "none", background: CC_THEME.bgRaised },
  select: { padding: "10px 12px", border: `1px solid ${CC_THEME.border}`, borderRadius: 6, fontSize: 13, background: CC_THEME.bgRaised, fontFamily: "inherit", cursor: "pointer" },
  searchBtn: { background: CC_THEME.or, color: CC_THEME.bgDeep, border: 0, padding: "10px 20px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },

  muted: { color: CC_THEME.inkMuted, fontStyle: "italic", padding: "20px 0" },
  count: { fontSize: 12, color: CC_THEME.inkMuted, marginBottom: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 18 },
  empty: { textAlign: "center", padding: "50px 20px", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12 },
  emptyTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 18, color: CC_THEME.navy, fontWeight: 600 },
  emptyBody: { color: CC_THEME.inkMid, fontSize: 13, marginTop: 6 },
};
