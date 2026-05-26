import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "../../i18n/i18n";
import { fmtMad, fmtUnit, type MaterialWithPrice } from "./materials.api";

/**
 * MaterialCard — card dense desktop-class d'un matériau.
 * - Icône catégorie + label
 * - Top-2 marques en pills
 * - Prix moyen large + min-max sous-ligne
 * - Variation colorée + flèche
 * - Hover: shadow élevée + scale 1.02
 * - Badge EcoLabel déterministe (30% des codes)
 * - Highlight des matches recherche (opt)
 */
export default function MaterialCard({
  material,
  searchQuery,
}: {
  material: MaterialWithPrice;
  searchQuery?: string;
}) {
  const t = useT();
  const [hover, setHover] = useState(false);

  const price = material.currentPrice;
  const variation = material.variationPct ?? 0;
  const variationColor =
    variation > 1.5 ? "#dc2626" : variation < -1.5 ? "#16a34a" : "#6b7280";
  const variationArrow = variation > 0.5 ? "↑" : variation < -0.5 ? "↓" : "→";

  // Eco-label déterministe (≈30%)
  const eco = isEco(material.code);

  // Top-2 marques
  const topBrands = (material.marquesCourantes || []).slice(0, 2);

  return (
    <Link
      to={`/materiaux/${encodeURIComponent(material.code)}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "block",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        transform: hover ? "scale(1.02)" : "scale(1)",
        boxShadow: hover
          ? "0 10px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)"
          : "0 1px 2px rgba(0,0,0,0.04)",
        transition: "transform .18s ease, box-shadow .18s ease",
        position: "relative",
      }}
    >
      {/* Badge EcoLabel */}
      {eco && (
        <span
          aria-label={t("mat.ecolabel")}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "#16a34a",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 7px",
            borderRadius: 999,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            zIndex: 2,
            boxShadow: "0 2px 6px rgba(22,163,74,0.3)",
          }}
        >
          ♻ {t("mat.ecolabel")}
        </span>
      )}

      {/* Visuel catégorie */}
      <div
        style={{
          height: 110,
          background: `linear-gradient(135deg, ${gradientFor(material.category)})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 44,
          color: "#fff",
          textShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }}
        aria-hidden
      >
        {iconForCategory(material.category)}
      </div>

      <div style={{ padding: 12 }}>
        <div
          style={{
            fontSize: 10,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 4,
            fontWeight: 600,
          }}
        >
          {material.category}
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            lineHeight: 1.3,
            minHeight: 36,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {highlight(material.label, searchQuery)}
        </div>

        {/* Top brands */}
        {topBrands.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
            {topBrands.map((b) => (
              <span
                key={b}
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  background: "#eef2ff",
                  color: "#4338ca",
                  borderRadius: 999,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  maxWidth: 100,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={b}
              >
                {b}
              </span>
            ))}
          </div>
        )}

        {price ? (
          <>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#111827",
                marginTop: 10,
                lineHeight: 1.1,
              }}
            >
              {fmtMad(price.prixMoyen, false)}
              <span
                style={{
                  fontSize: 10,
                  color: "#6b7280",
                  fontWeight: 500,
                  marginLeft: 4,
                }}
              >
                MAD HT {fmtUnit(material.unit)}
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#6b7280",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
              }}
            >
              <span>
                {fmtMad(price.prixMin, false)}–{fmtMad(price.prixMax, false)}
              </span>
              <span
                style={{
                  color: variationColor,
                  fontWeight: 700,
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 999,
                  background:
                    variation > 1.5
                      ? "#fef2f2"
                      : variation < -1.5
                      ? "#f0fdf4"
                      : "#f3f4f6",
                }}
              >
                {variationArrow} {Math.abs(variation).toFixed(1)}%
              </span>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 10 }}>
            —
          </div>
        )}
      </div>
    </Link>
  );
}

/** Highlight les fragments de query dans le label. */
function highlight(text: string, q?: string): React.ReactNode {
  if (!q || !q.trim()) return text;
  const tokens = q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((s) => s.length >= 2);
  if (tokens.length === 0) return text;

  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Naïf mais OK : split sur le premier token trouvé puis récursif
  function splitOnce(s: string): void {
    const lower = s.toLowerCase();
    let foundIdx = -1;
    let foundLen = 0;
    for (const tok of tokens) {
      const i = lower.indexOf(tok);
      if (i !== -1 && (foundIdx === -1 || i < foundIdx)) {
        foundIdx = i;
        foundLen = tok.length;
      }
    }
    if (foundIdx === -1) {
      parts.push(s);
      return;
    }
    if (foundIdx > 0) parts.push(s.slice(0, foundIdx));
    parts.push(
      <mark
        key={`hl-${key++}`}
        style={{
          background: "#fef9c3",
          color: "#854d0e",
          padding: "0 1px",
          borderRadius: 2,
        }}
      >
        {s.slice(foundIdx, foundIdx + foundLen)}
      </mark>,
    );
    splitOnce(s.slice(foundIdx + foundLen));
  }
  splitOnce(remaining);
  return parts;
}

/** Eco-label déterministe : (code.length + charCode[0]) % 3 === 0. */
export function isEco(code: string): boolean {
  if (!code) return false;
  return (code.length + code.charCodeAt(0)) % 3 === 0;
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

/** Gradient catégorie (cohérent visuellement). */
function gradientFor(c: string): string {
  switch (c) {
    case "ciment":           return "#9ca3af 0%, #6b7280 100%";
    case "acier":            return "#64748b 0%, #334155 100%";
    case "granulats":        return "#a8a29e 0%, #78716c 100%";
    case "beton":            return "#94a3b8 0%, #475569 100%";
    case "maconnerie":       return "#d6a26b 0%, #b45309 100%";
    case "etancheite":       return "#0891b2 0%, #0e7490 100%";
    case "enduits":          return "#fde68a 0%, #d97706 100%";
    case "peinture":         return "#f472b6 0%, #db2777 100%";
    case "menuiserie_alu":   return "#9ca3af 0%, #4b5563 100%";
    case "menuiserie_bois":  return "#a16207 0%, #713f12 100%";
    case "sanitaire":        return "#67e8f9 0%, #0e7490 100%";
    case "electrique":       return "#facc15 0%, #ca8a04 100%";
    case "revetement":       return "#fcd34d 0%, #a16207 100%";
    default:                 return "#e5e7eb 0%, #9ca3af 100%";
  }
}
