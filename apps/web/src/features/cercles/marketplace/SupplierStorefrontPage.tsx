/**
 * SupplierStorefrontPage — /cercles/storefront/:supplierId
 * Vitrine publique d'un fournisseur : son profil + ses produits actifs.
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import CerclesShell from "../CerclesShell";
import { CC_THEME } from "../theme";
import { marketplaceApi, SupplierProduct, resolveUploadUrl } from "../api";
import ProductCard from "./ProductCard";

export default function SupplierStorefrontPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<any>(null);
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supplierId) return;
    marketplaceApi.storefront(supplierId)
      .then(r => { setSupplier(r.data.supplier); setProducts(r.data.products); })
      .catch((e: any) => setErr(e?.message || "Vitrine introuvable"))
      .finally(() => setLoading(false));
  }, [supplierId]);

  const pp = supplier?.proProfile;
  const name = pp?.displayName || supplier?.username || "Fournisseur";
  const avatar = resolveUploadUrl(pp?.avatarUrl);

  return (
    <CerclesShell>
      <div style={S.root}>
        <Link to="/cercles/marketplace" style={S.back}>← Marketplace</Link>

        {loading && <div style={S.muted}>Chargement…</div>}
        {err && <div style={S.muted}>{err}</div>}

        {supplier && (
          <>
            <header style={S.head}>
              <div style={{ ...S.avatar, backgroundImage: avatar ? `url(${avatar})` : undefined }}>
                {!avatar && name.slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.eyebrow}>Vitrine fournisseur</div>
                <h1 style={S.name}>
                  {name}
                  {pp?.isVerified && <span title="Vérifié" style={{ color: CC_THEME.success, fontSize: 18 }}> ✓</span>}
                </h1>
                <div style={S.sub}>
                  {pp?.cabinetName && <span>{pp.cabinetName}</span>}
                  {pp?.villePrincipale && <span> · {pp.villePrincipale}</span>}
                </div>
                {pp?.bio && <p style={S.bio}>{pp.bio}</p>}
              </div>
              <div style={S.headActions}>
                {supplier.id && (
                  <>
                    <button onClick={() => navigate(`/cercles/messages/new/${supplier.id}`)} style={S.contactBtn}>💬 Contacter</button>
                    <Link to={`/cercles/profile/${supplier.id}`} style={S.profileLink}>Voir le profil pro →</Link>
                  </>
                )}
              </div>
            </header>

            <div style={S.count}>{products.length} produit{products.length > 1 ? "s" : ""} en vitrine</div>

            {products.length === 0 && (
              <div style={S.empty}>Ce fournisseur n'a pas encore publié de produits.</div>
            )}
            {products.length > 0 && (
              <div style={S.grid}>
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </>
        )}
      </div>
    </CerclesShell>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { padding: "24px 32px 60px", maxWidth: 1180, margin: "0 auto" },
  back: { color: CC_THEME.inkMid, textDecoration: "none", fontSize: 13, display: "inline-block", marginBottom: 18 },
  muted: { color: CC_THEME.inkMuted, fontStyle: "italic", padding: 40 },

  head: { display: "flex", gap: 18, alignItems: "flex-start", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12, padding: 24, marginBottom: 20, flexWrap: "wrap" },
  avatar: { width: 80, height: 80, borderRadius: "50%", background: CC_THEME.orSoft, color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontWeight: 700, fontSize: 32, flexShrink: 0, backgroundSize: "cover", backgroundPosition: "center", border: `2px solid ${CC_THEME.or}` },
  eyebrow: { fontSize: 10, color: CC_THEME.or, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 },
  name: { fontFamily: CC_THEME.fontDisplay, fontSize: 26, fontWeight: 600, color: CC_THEME.navy, margin: "4px 0" },
  sub: { fontSize: 13, color: CC_THEME.inkMid },
  bio: { fontSize: 13, color: CC_THEME.inkMid, lineHeight: 1.55, marginTop: 8, maxWidth: 600 },
  headActions: { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" },
  contactBtn: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "10px 18px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  profileLink: { fontSize: 12, color: CC_THEME.or, textDecoration: "none", fontWeight: 600 },

  count: { fontSize: 12, color: CC_THEME.inkMuted, marginBottom: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 18 },
  empty: { textAlign: "center", padding: "40px", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12, color: CC_THEME.inkMuted, fontStyle: "italic" },
};
