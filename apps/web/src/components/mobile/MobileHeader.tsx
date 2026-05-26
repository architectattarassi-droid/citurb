import React from "react";
import { useIsMobile } from "./useBreakpoint";

/**
 * MobileHeader — barre d'en-tête sticky pour les vues mobiles.
 *
 * Affichée UNIQUEMENT en mobile (≤ 768 px). Sur desktop, le composant renvoie
 * null pour ne pas perturber les layouts existants.
 *
 * Hauteur 56 px + safe-area-inset-top. Trois slots :
 *   - leftSlot  : flèche back, hamburger, logo…
 *   - title     : titre central (texte ou node)
 *   - rightSlot : actions (kebab menu, recherche, profil…)
 */

export interface MobileHeaderProps {
  title?: React.ReactNode;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  /** Force l'affichage même en desktop (rare). */
  alwaysShow?: boolean;
  /** Style additionnel root. */
  style?: React.CSSProperties;
}

export function MobileHeader(props: MobileHeaderProps): React.ReactElement | null {
  const { title, leftSlot, rightSlot, alwaysShow, style } = props;
  const isMobile = useIsMobile();

  if (!isMobile && !alwaysShow) return null;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 80,
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "saturate(180%) blur(16px)",
        WebkitBackdropFilter: "saturate(180%) blur(16px)",
        borderBottom: "1px solid #e2e8f0",
        paddingTop: "env(safe-area-inset-top, 0)",
        ...style,
      }}
      role="banner"
    >
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          gap: 8,
        }}
      >
        <div style={{ minWidth: 44, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
          {leftSlot}
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: "center",
            fontSize: 16,
            fontWeight: 600,
            color: "#0f172a",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        <div style={{ minWidth: 44, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          {rightSlot}
        </div>
      </div>
    </header>
  );
}

/**
 * IconButton — bouton 44×44 pour usage dans les slots du MobileHeader.
 * Tap target conforme aux guidelines mobile (≥ 44 px).
 */
export function HeaderIconButton(props: {
  onClick?: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  to?: string;
}): React.ReactElement {
  const { onClick, ariaLabel, children } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: 44,
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: "#0f172a",
        fontSize: 20,
        borderRadius: 8,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  );
}

export default MobileHeader;
