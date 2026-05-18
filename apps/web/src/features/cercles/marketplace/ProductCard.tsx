/**
 * ProductCard — carte d'un produit du référentiel marketplace.
 */
import React from "react";
import { Link } from "react-router-dom";
import { CC_THEME } from "../theme";
import { MarketProduct, resolveUploadUrl } from "../api";

export const CORPS_LABELS: Record<string, string> = {
  GROS_OEUVRE: "Gros œuvre", PLOMBERIE: "Plomberie & sanitaire", ELECTRICITE: "Électricité",
  ETANCHEITE: "Étanchéité", ISOLATION: "Isolation", MENUISERIE: "Menuiserie",
  REVETEMENT: "Revêtements & carrelage", MARBRERIE: "Marbrerie & pierre", PEINTURE: "Peinture & enduits",
  CHAUFFAGE_CLIM: "Chauffage & climatisation", VRD: "VRD & extérieurs", QUINCAILLERIE: "Quincaillerie & outillage",
};

export const UNIT_LABELS: Record<string, string> = {
  M3: "m³", M2: "m²", ML: "ml", T: "tonne", KG: "kg", SAC: "sac",
  UNITE: "unité", PALETTE: "palette", ROULEAU: "rouleau", BARRE: "barre",
};

export function priceRange(p: MarketProduct): string {
  const u = UNIT_LABELS[p.unit] || p.unit;
  if (p.indicativePriceMin != null && p.indicativePriceMax != null) {
    if (p.indicativePriceMin === p.indicativePriceMax) return `${p.indicativePriceMin} DH / ${u}`;
    return `${p.indicativePriceMin} – ${p.indicativePriceMax} DH / ${u}`;
  }
  return "Prix sur demande";
}

export default function ProductCard({ product }: { product: MarketProduct }) {
  const photo = resolveUploadUrl(product.photo);
  const offers = product._count?.offers ?? 0;
  return (
    <Link to={`/cercles/marketplace/produit/${product.id}`} style={S.card}>
      <div style={{ ...S.photo, backgroundImage: photo ? `url(${photo})` : undefined }}>
        {!photo && <span style={S.ph}>📦</span>}
        <span style={S.fam}>{product.famille}</span>
      </div>
      <div style={S.body}>
        {product.citCode && <div style={S.code}>{product.citCode}</div>}
        <div style={S.name}>{product.name}</div>
        <div style={S.price}>{priceRange(product)}</div>
        <div style={S.offers}>
          {offers > 0
            ? <span style={{ color: CC_THEME.success, fontWeight: 600 }}>{offers} offre{offers > 1 ? "s" : ""} fournisseur{offers > 1 ? "s" : ""}</span>
            : <span style={{ color: CC_THEME.inkMuted }}>Prix indicatif · pas encore d'offre</span>}
        </div>
      </div>
    </Link>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: { display: "flex", flexDirection: "column", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, overflow: "hidden", textDecoration: "none", color: CC_THEME.ink, boxShadow: CC_THEME.shadowSoft },
  photo: { height: 150, background: CC_THEME.bgSoft, backgroundSize: "cover", backgroundPosition: "center", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" },
  ph: { fontSize: 40, opacity: 0.4 },
  fam: { position: "absolute", top: 8, left: 8, background: "rgba(15,42,74,0.85)", color: CC_THEME.bg, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4 },
  body: { padding: "11px 13px", display: "flex", flexDirection: "column", gap: 4 },
  code: { fontSize: 10, fontWeight: 600, color: CC_THEME.or, fontFamily: CC_THEME.fontMono, letterSpacing: "0.04em" },
  name: { fontSize: 13.5, fontWeight: 600, color: CC_THEME.navy, lineHeight: 1.3 },
  price: { fontSize: 13.5, fontWeight: 700, color: CC_THEME.or },
  offers: { fontSize: 11, marginTop: 2 },
};
