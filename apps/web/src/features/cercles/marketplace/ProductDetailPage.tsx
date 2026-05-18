/**
 * ProductDetailPage — /cercles/marketplace/produit/:id
 * Fiche d'un produit du référentiel + offres fournisseurs (identité masquée
 * tant que le contrat n'est pas signé). Contact strictement via la marketplace.
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import CerclesShell from "../CerclesShell";
import { CC_THEME } from "../theme";
import { marketplaceApi, MarketProduct, resolveUploadUrl } from "../api";
import { CORPS_LABELS, CORPS_ICONS, UNIT_LABELS, priceRange } from "./ProductCard";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<MarketProduct | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    marketplaceApi.product(id)
      .then(r => setProduct(r.data))
      .catch((e: any) => setErr(e?.message || "Produit introuvable"));
  }, [id]);

  if (err) return <CerclesShell><div style={S.root}><div style={S.muted}>{err}</div></div></CerclesShell>;
  if (!product) return <CerclesShell><div style={S.root}><div style={S.muted}>Chargement…</div></div></CerclesShell>;

  const photo = resolveUploadUrl(product.photo);
  const offers = (product.offers || []).slice().sort((a, b) => a.priceDH - b.priceDH);
  const unit = UNIT_LABELS[product.unit] || product.unit;

  return (
    <CerclesShell>
      <div style={S.root}>
        <Link to="/cercles/marketplace" style={S.back}>← Marketplace</Link>

        <div style={S.top}>
          <div style={{ ...S.photo, backgroundImage: photo ? `url(${photo})` : undefined }}>
            {!photo && <span style={{ fontSize: 72, opacity: 0.4 }}>{CORPS_ICONS[product.corpsMetier] || "📦"}</span>}
          </div>
          <div>
            <span style={S.corpsBadge}>{CORPS_LABELS[product.corpsMetier] || product.corpsMetier} · {product.famille}</span>
            {product.citCode && <div style={S.citCode}>Code CITURBAREA : <strong>{product.citCode}</strong></div>}
            <h1 style={S.name}>{product.name}</h1>
            <div style={S.indicative}>
              <span style={S.indLabel}>Prix indicatif marché</span>
              <span style={S.indPrice}>{priceRange(product)}</span>
            </div>
            {product.description && <p style={S.desc}>{product.description}</p>}
            <div style={S.unitNote}>Unité de vente : <strong>{unit}</strong></div>
          </div>
        </div>

        {/* Offres fournisseurs */}
        <section style={S.offersSection}>
          <h2 style={S.offersTitle}>
            Offres fournisseurs {offers.length > 0 && <span style={S.offersCount}>({offers.length})</span>}
          </h2>

          {offers.length === 0 && (
            <div style={S.noOffer}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>🏗</div>
              <div style={{ fontWeight: 600, color: CC_THEME.navy }}>Aucune offre fournisseur pour l'instant</div>
              <p style={{ color: CC_THEME.inkMid, fontSize: 13, marginTop: 6 }}>
                Le prix affiché est une fourchette indicative. Les offres réelles des fournisseurs
                apparaîtront ici dès qu'ils auront référencé ce produit.
              </p>
              <Link to="/cercles/mes-offres" style={S.becomeSupplier}>Vous êtes fournisseur ? Proposez ce produit →</Link>
            </div>
          )}

          {offers.map((o, i) => (
            <div key={o.id} style={S.offer}>
              {i === 0 && offers.length > 1 && <span style={S.bestBadge}>Meilleure offre</span>}
              <div style={S.offerMain}>
                <div style={S.offerPrice}>{o.priceDH.toLocaleString("fr-MA")} <span style={S.offerUnit}>DH / {unit}</span></div>
                <div style={S.offerSupplier}>
                  {o.contracted ? "🟢 " : "🔒 "}
                  {o.supplier.displayName}
                  {o.supplier.isVerified && <span style={{ color: CC_THEME.success }}> ✓</span>}
                  {o.supplier.villePrincipale && <span style={S.offerCity}> · {o.supplier.villePrincipale}</span>}
                  {!o.contracted && <span style={S.maskedNote}> — identité dévoilée après contrat</span>}
                </div>
              </div>
              <div style={S.offerSpecs}>
                {o.quantityAvailable != null && <span>Stock : {o.quantityAvailable}</span>}
                {o.minOrder != null && <span>Min : {o.minOrder}</span>}
                {o.deliveryZones?.length > 0 && <span>🚚 {o.deliveryZones.length} région(s)</span>}
                {o.deliveryIncluded && <span style={{ color: CC_THEME.success }}>Livraison incluse</span>}
              </div>
              {o.offerRef && <div style={S.offerRef}>Réf. offre : {o.offerRef}</div>}
              <div style={S.offerActions}>
                {o.contracted && o.supplier.id ? (
                  <button onClick={() => navigate(`/cercles/messages/new/${o.supplier.id}`)} style={S.contactBtn}>
                    💬 Contacter via la marketplace
                  </button>
                ) : (
                  <div style={S.contactNote}>Contact via la marketplace — disponible après signature du contrat fournisseur</div>
                )}
              </div>
            </div>
          ))}
        </section>

        <div style={S.phase2}>
          🛒 Panier &amp; commande en ligne (paiement, dépôt chèque, Cash Plus, Wafa Cash) — Phase suivante
        </div>
      </div>
    </CerclesShell>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { padding: "24px 32px 60px", maxWidth: 980, margin: "0 auto" },
  back: { color: CC_THEME.inkMid, textDecoration: "none", fontSize: 13, display: "inline-block", marginBottom: 16 },
  muted: { color: CC_THEME.inkMuted, fontStyle: "italic", padding: 40 },

  top: { display: "grid", gridTemplateColumns: "340px 1fr", gap: 26, alignItems: "start", marginBottom: 24 },
  photo: { width: "100%", height: 280, background: CC_THEME.bgSoft, backgroundSize: "cover", backgroundPosition: "center", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${CC_THEME.border}` },
  corpsBadge: { display: "inline-block", background: CC_THEME.bgDeep, color: CC_THEME.bg, fontSize: 10.5, fontWeight: 600, padding: "4px 10px", borderRadius: 4 },
  citCode: { fontSize: 12, color: CC_THEME.inkMid, marginTop: 8, fontFamily: CC_THEME.fontMono },
  name: { fontFamily: CC_THEME.fontDisplay, fontSize: 26, fontWeight: 600, color: CC_THEME.navy, margin: "10px 0 12px", lineHeight: 1.2 },
  indicative: { display: "flex", flexDirection: "column", gap: 2, background: CC_THEME.bgSoft, borderRadius: 8, padding: "10px 14px", marginBottom: 12 },
  indLabel: { fontSize: 10.5, color: CC_THEME.inkMuted, letterSpacing: "0.06em", textTransform: "uppercase" as const },
  indPrice: { fontSize: 20, fontWeight: 700, color: CC_THEME.or },
  desc: { fontSize: 13.5, color: CC_THEME.ink, lineHeight: 1.6, marginBottom: 10 },
  unitNote: { fontSize: 12.5, color: CC_THEME.inkMid },

  offersSection: { marginBottom: 20 },
  offersTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 19, color: CC_THEME.navy, fontWeight: 600, marginBottom: 12 },
  offersCount: { color: CC_THEME.inkMuted, fontSize: 14 },
  noOffer: { textAlign: "center", padding: "32px 20px", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10 },
  becomeSupplier: { display: "inline-block", marginTop: 12, color: CC_THEME.or, textDecoration: "none", fontWeight: 600, fontSize: 13 },

  offer: { position: "relative", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 10 },
  bestBadge: { position: "absolute", top: -9, left: 14, background: CC_THEME.success, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 4, letterSpacing: "0.04em" },
  offerMain: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" },
  offerPrice: { fontSize: 19, fontWeight: 700, color: CC_THEME.navy },
  offerUnit: { fontSize: 12, fontWeight: 500, color: CC_THEME.inkMid },
  offerSupplier: { fontSize: 12.5, color: CC_THEME.ink },
  offerCity: { color: CC_THEME.inkMuted },
  maskedNote: { color: CC_THEME.inkMuted, fontStyle: "italic" },
  offerSpecs: { display: "flex", gap: 14, fontSize: 11.5, color: CC_THEME.inkMid, marginTop: 6, flexWrap: "wrap" },
  offerRef: { fontSize: 10.5, color: CC_THEME.inkMuted, fontFamily: CC_THEME.fontMono, marginTop: 5 },
  offerActions: { marginTop: 10 },
  contactBtn: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "9px 16px", borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  contactNote: { fontSize: 11.5, color: CC_THEME.inkMuted, fontStyle: "italic" },

  phase2: { textAlign: "center", fontSize: 12, color: CC_THEME.inkMuted, fontStyle: "italic", padding: "14px", background: CC_THEME.bgSoft, borderRadius: 8 },
};
