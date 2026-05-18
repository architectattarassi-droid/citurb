/**
 * ProductDetailPage — /cercles/marketplace/produit/:id
 * Fiche produit complète + infos fournisseur + contact.
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import CerclesShell from "../CerclesShell";
import { CC_THEME } from "../theme";
import { marketplaceApi, SupplierProduct, resolveUploadUrl } from "../api";
import { CATEGORY_LABELS, UNIT_LABELS } from "./ProductCard";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<SupplierProduct | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    if (!id) return;
    marketplaceApi.product(id)
      .then(r => setProduct(r.data))
      .catch((e: any) => setErr(e?.message || "Produit introuvable"));
  }, [id]);

  if (err) return <CerclesShell><div style={S.root}><div style={S.muted}>{err}</div></div></CerclesShell>;
  if (!product) return <CerclesShell><div style={S.root}><div style={S.muted}>Chargement…</div></div></CerclesShell>;

  const sup = product.supplier;
  const supName = sup?.proProfile?.displayName || sup?.username || "Fournisseur";
  const photos = (product.photos || []).map(resolveUploadUrl).filter(Boolean) as string[];

  return (
    <CerclesShell>
      <div style={S.root}>
        <Link to="/cercles/marketplace" style={S.back}>← Marketplace</Link>

        <div style={S.layout}>
          {/* Galerie photos */}
          <div>
            <div style={{ ...S.mainPhoto, backgroundImage: photos[activePhoto] ? `url(${photos[activePhoto]})` : undefined }}>
              {photos.length === 0 && <span style={{ fontSize: 64, opacity: 0.3 }}>📦</span>}
            </div>
            {photos.length > 1 && (
              <div style={S.thumbs}>
                {photos.map((p, i) => (
                  <div key={i} onClick={() => setActivePhoto(i)}
                    style={{ ...S.thumb, backgroundImage: `url(${p})`, outline: i === activePhoto ? `2px solid ${CC_THEME.or}` : "none" }} />
                ))}
              </div>
            )}
          </div>

          {/* Infos */}
          <div>
            <span style={S.catBadge}>{CATEGORY_LABELS[product.category] || product.category}</span>
            <h1 style={S.name}>{product.name}</h1>
            {product.reference && <div style={S.ref}>Réf. {product.reference}</div>}
            <div style={S.price}>
              {product.priceDH != null
                ? <>{product.priceDH.toLocaleString("fr-MA")} <span style={S.priceUnit}>DH / {UNIT_LABELS[product.unit] || product.unit}</span></>
                : "Prix sur demande"}
            </div>

            {product.description && <p style={S.desc}>{product.description}</p>}

            <div style={S.specs}>
              {product.quantityAvailable != null && <Spec k="Stock disponible" v={`${product.quantityAvailable} ${UNIT_LABELS[product.unit] || product.unit}`} />}
              {product.minOrder != null && <Spec k="Commande minimum" v={`${product.minOrder} ${UNIT_LABELS[product.unit] || product.unit}`} />}
              {(product.showroomAddress || product.showroomCity) && (
                <Spec k="Showroom" v={[product.showroomAddress, product.showroomCity].filter(Boolean).join(", ")} />
              )}
              {product.deliveryZones?.length > 0 && <Spec k="Zones de livraison" v={product.deliveryZones.join(", ")} />}
              {product.deliveryDelayHours != null && <Spec k="Délai de livraison" v={`~ ${product.deliveryDelayHours} h`} />}
              <Spec k="Livraison" v={product.deliveryIncluded ? "Incluse dans le prix" : (product.deliveryCostDH != null ? `${product.deliveryCostDH.toLocaleString("fr-MA")} DH` : "Sur devis")} />
            </div>

            {/* Fournisseur */}
            <div style={S.supplierBox}>
              <div style={S.supAvatar}>{supName.slice(0, 1).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={S.supName}>
                  {supName}
                  {sup?.proProfile?.isVerified && <span style={{ color: CC_THEME.success }}> ✓</span>}
                </div>
                {sup?.proProfile?.villePrincipale && <div style={S.supCity}>{sup.proProfile.villePrincipale}</div>}
              </div>
              {sup && (
                <Link to={`/cercles/storefront/${sup.id}`} style={S.supLink}>Voir la vitrine →</Link>
              )}
            </div>

            <div style={S.actions}>
              {sup && (
                <button onClick={() => navigate(`/cercles/messages/new/${sup.id}`)} style={S.contactBtn}>
                  💬 Contacter le fournisseur
                </button>
              )}
              <div style={S.phase2Note}>🛒 Panier &amp; commande en ligne — bientôt disponible</div>
            </div>
          </div>
        </div>
      </div>
    </CerclesShell>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div style={S.spec}>
      <span style={S.specK}>{k}</span>
      <span style={S.specV}>{v}</span>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { padding: "24px 32px 60px", maxWidth: 1100, margin: "0 auto" },
  back: { color: CC_THEME.inkMid, textDecoration: "none", fontSize: 13, display: "inline-block", marginBottom: 18 },
  muted: { color: CC_THEME.inkMuted, fontStyle: "italic", padding: 40 },
  layout: { display: "grid", gridTemplateColumns: "minmax(0, 460px) 1fr", gap: 32, alignItems: "start" },

  mainPhoto: { width: "100%", height: 360, background: CC_THEME.bgSoft, backgroundSize: "cover", backgroundPosition: "center", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${CC_THEME.border}` },
  thumbs: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  thumb: { width: 64, height: 64, borderRadius: 6, backgroundSize: "cover", backgroundPosition: "center", cursor: "pointer", border: `1px solid ${CC_THEME.border}` },

  catBadge: { display: "inline-block", background: CC_THEME.bgDeep, color: CC_THEME.bg, fontSize: 10.5, fontWeight: 600, padding: "4px 10px", borderRadius: 4, letterSpacing: "0.04em" },
  name: { fontFamily: CC_THEME.fontDisplay, fontSize: 28, fontWeight: 600, color: CC_THEME.navy, margin: "10px 0 4px", lineHeight: 1.2 },
  ref: { fontSize: 12, color: CC_THEME.inkMuted, marginBottom: 8 },
  price: { fontSize: 26, fontWeight: 700, color: CC_THEME.or, margin: "8px 0 14px" },
  priceUnit: { fontSize: 14, fontWeight: 500, color: CC_THEME.inkMid },
  desc: { fontSize: 14, color: CC_THEME.ink, lineHeight: 1.65, whiteSpace: "pre-wrap" as const, marginBottom: 16 },

  specs: { display: "flex", flexDirection: "column", gap: 1, background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 16 },
  spec: { display: "flex", justifyContent: "space-between", padding: "9px 14px", fontSize: 13, borderBottom: `1px solid ${CC_THEME.borderSoft}`, gap: 12 },
  specK: { color: CC_THEME.inkMid },
  specV: { color: CC_THEME.ink, fontWeight: 500, textAlign: "right" as const },

  supplierBox: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: CC_THEME.bgSoft, borderRadius: 8, marginBottom: 16 },
  supAvatar: { width: 40, height: 40, borderRadius: "50%", background: CC_THEME.orSoft, color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontWeight: 700, fontSize: 16, flexShrink: 0 },
  supName: { fontSize: 14, fontWeight: 600, color: CC_THEME.navy },
  supCity: { fontSize: 11.5, color: CC_THEME.inkMuted },
  supLink: { fontSize: 12, color: CC_THEME.or, textDecoration: "none", fontWeight: 600 },

  actions: { display: "flex", flexDirection: "column", gap: 10 },
  contactBtn: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "13px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  phase2Note: { fontSize: 11.5, color: CC_THEME.inkMuted, fontStyle: "italic", textAlign: "center" as const },
};
