import React from "react";

/**
 * FAB — Floating Action Button (Material / iOS style).
 *
 * Bouton circulaire 56 × 56 px positionné fixe en bas (br ou bl), au-dessus
 * de la BottomNav (z-index 50). Respecte safe-area-inset-bottom et -right/left.
 *
 * Variantes :
 *   - sans `label` → bouton rond compact
 *   - avec `label` → bouton oblong "extended FAB" (icône + texte)
 *
 * Accessibilité : aria-label requis si pas de label visible.
 */

export interface FABProps {
  /** Icône (svg, emoji, node React). */
  icon: React.ReactNode;
  /** Texte optionnel — transforme le FAB en extended FAB. */
  label?: string;
  /** Position : bottom-right (defaut) ou bottom-left. */
  position?: "br" | "bl";
  /** Hauteur supplémentaire à réserver pour ne pas se cacher derrière BottomNav. */
  bottomOffset?: number;
  /** Pour a11y si pas de label visible. */
  ariaLabel?: string;
  onClick: () => void;
  /** Style supplémentaire (couleur custom etc.). */
  style?: React.CSSProperties;
  disabled?: boolean;
}

export function FAB(props: FABProps): React.ReactElement {
  const {
    icon,
    label,
    position = "br",
    bottomOffset = 80, // au-dessus de BottomNav (64 px) + safe-area
    ariaLabel,
    onClick,
    style,
    disabled,
  } = props;

  const positionStyle: React.CSSProperties = position === "br"
    ? { right: `max(16px, env(safe-area-inset-right, 16px))` }
    : { left: `max(16px, env(safe-area-inset-left, 16px))` };

  const sizeStyle: React.CSSProperties = label
    ? { padding: "0 22px", height: 56, borderRadius: 28, gap: 10 }
    : { width: 56, height: 56, borderRadius: 28, padding: 0 };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || (typeof label === "string" ? label : "Action")}
      style={{
        position: "fixed",
        bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))`,
        ...positionStyle,
        ...sizeStyle,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: disabled ? "#94a3b8" : "#0d3566",
        color: "#fff",
        border: "none",
        boxShadow: "0 8px 24px rgba(13,53,102,0.35), 0 2px 6px rgba(0,0,0,0.12)",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        fontWeight: 600,
        fontSize: 15,
        zIndex: 50,
        WebkitTapHighlightColor: "transparent",
        transition: "transform .15s ease, box-shadow .15s ease",
        ...style,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
        {icon}
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}

export default FAB;
