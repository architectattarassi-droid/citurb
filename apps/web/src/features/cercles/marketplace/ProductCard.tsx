/**
 * ProductCard — carte produit réutilisée (marketplace + vitrine fournisseur).
 */
import React from "react";
import { Link } from "react-router-dom";
import { CC_THEME } from "../theme";
import { SupplierProduct, resolveUploadUrl } from "../api";

export const CATEGORY_LABELS: Record<string, string> = {
  CIMENT_BETON: "Ciment & Béton", AGGLOMERES: "Agglomérés", ACIER: "Acier", BOIS: "Bois",
  ETANCHEITE: "Étanchéité", ISOLATION: "Isolation", PLOMBERIE: "Plomberie", ELECTRICITE: "Électricité",
  CARRELAGE: "Carrelage", REVETEMENT_SOL: "Revêtement de sol", PEINTURE: "Peinture",
  MENUISERIE_ALU: "Menuiserie Alu", MENUISERIE_BOIS: "Menuiserie Bois", QUINCAILLERIE: "Quincaillerie",
  CHAUFFAGE_CLIM: "Chauffage & Clim", AUTRE: "Autre",
};

export const UNIT_LABELS: Record<string, string> = {
  M3: "m³", M2: "m²", ML: "ml", T: "tonne", KG: "kg", SAC: "sac", UNITE: "unité", PALETTE: "palette",
};

export function formatPrice(p: SupplierProduct): string {
  if (p.priceDH == null) return "Prix sur demande";
  return `${p.priceDH.toLocaleString("fr-MA")} DH / ${UNIT_LABELS[p.unit] || p.unit}`;
}

export default function ProductCard({ product }: { product: SupplierProduct }) {
  const photo = resolveUploadUrl(product.photos?.[0]);
  const supplierName = product.supplier?.proProfile?.displayName || product.supplier?.username || "Fournisseur";
  return (
    <Link to={`/cercles/marketplace/produit/${product.id}`} style={S.card}>
      <div style={{ ...S.photo, backgroundImage: photo ? `url(${photo})` : undefined }}>
        {!photo && <span style={S.photoPlaceholder}>📦</span>}
        <span style={S.catBadge}>{CATEGORY_LABELS[product.category] || product.category}</span>
      </div>
      <div style={S.body}>
        <div style={S.name}>{product.name}</div>
        <div style={S.price}>{formatPrice(product)}</div>
        <div style={S.meta}>
          {product.quantityAvailable != null && <span>Stock : {product.quantityAvailable}</span>}
          {product.deliveryIncluded && <span style={S.deliv}>🚚 Livraison incluse</span>}
        </div>
        <div style={S.supplier}>
          {supplierName}
          {product.supplier?.proProfile?.isVerified && <span style={{ color: CC_THEME.success }}> ✓</span>}
          {product.supplier?.proProfile?.villePrincipale && (
            <span style={S.city}> · {product.supplier.proProfile.villePrincipale}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: { display: "flex", flexDirection: "column", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, overflow: "hidden", textDecoration: "none", color: CC_THEME.ink, boxShadow: CC_THEME.shadowSoft },
  photo: { height: 160, background: CC_THEME.bgSoft, backgroundSize: "cover", backgroundPosition: "center", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" },
  photoPlaceholder: { fontSize: 44, opacity: 0.4 },
  catBadge: { position: "absolute", top: 8, left: 8, background: "rgba(15,42,74,0.85)", color: CC_THEME.bg, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, letterSpacing: "0.03em" },
  body: { padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 },
  name: { fontSize: 14, fontWeight: 600, color: CC_THEME.navy, lineHeight: 1.3 },
  price: { fontSize: 14.5, fontWeight: 700, color: CC_THEME.or },
  meta: { display: "flex", gap: 10, fontSize: 11, color: CC_THEME.inkMuted, flexWrap: "wrap" as const },
  deliv: { color: CC_THEME.success, fontWeight: 500 },
  supplier: { fontSize: 11.5, color: CC_THEME.inkMid, marginTop: 4, paddingTop: 6, borderTop: `1px solid ${CC_THEME.borderSoft}` },
  city: { color: CC_THEME.inkMuted },
};
