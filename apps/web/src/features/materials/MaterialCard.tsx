import React from "react";
import { Link } from "react-router-dom";
import { fmtMad, fmtUnit, type MaterialWithPrice } from "./materials.api";

/**
 * MaterialCard — card responsive d'un matériau dans la grid catalog.
 * Mobile-first: 2 colonnes en mobile, 3 en tablette, 4 en desktop (géré côté grid).
 *
 * Affiche: image placeholder + label + unité + prix moyen + variation % vs M-1.
 */
export default function MaterialCard({ material }: { material: MaterialWithPrice }) {
  const price = material.currentPrice;
  const variation = material.variationPct ?? 0;
  const variationColor = variation > 1.5 ? "#dc2626" : variation < -1.5 ? "#16a34a" : "#6b7280";
  const variationArrow = variation > 0.5 ? "↑" : variation < -0.5 ? "↓" : "→";

  return (
    <Link
      to={`/materiaux/${encodeURIComponent(material.code)}`}
      style={{
        display: "block",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        transition: "box-shadow .15s ease",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)")}
    >
      <div
        style={{
          height: 110,
          background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 38,
          color: "#9ca3af",
        }}
        aria-hidden
      >
        {iconForCategory(material.category)}
      </div>
      <div style={{ padding: 12 }}>
        <div
          style={{
            fontSize: 11,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 4,
          }}
        >
          {material.category}
        </div>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            lineHeight: 1.3,
            minHeight: 36,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {material.label}
        </div>
        {price ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginTop: 8 }}>
              {fmtMad(price.prixMoyen, false)}
              <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 400, marginLeft: 4 }}>
                MAD HT {fmtUnit(material.unit)}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              {fmtMad(price.prixMin, false)}–{fmtMad(price.prixMax, false)}
              <span style={{ color: variationColor, fontWeight: 600, marginLeft: 6 }}>
                {variationArrow} {Math.abs(variation).toFixed(1)}%
              </span>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>Prix non disponible</div>
        )}
      </div>
    </Link>
  );
}

/** Icon emoji helper per category (placeholder visual). */
function iconForCategory(c: string): string {
  switch (c) {
    case "ciment":           return "■";
    case "acier":            return "▌";
    case "granulats":        return "•";
    case "beton":            return "▣";
    case "maconnerie":       return "▥";
    case "etancheite":       return "≋";
    case "enduits":          return "▤";
    case "peinture":         return "◐";
    case "menuiserie_alu":   return "▭";
    case "menuiserie_bois":  return "▢";
    case "sanitaire":        return "◯";
    case "electrique":       return "⚡";
    case "revetement":       return "▦";
    default:                 return "◇";
  }
}
