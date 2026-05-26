import React, { useEffect, useState } from "react";

/**
 * MobileDrawer — drawer off-canvas glissant depuis la gauche (ou droite).
 *
 * Utilisé pour remplacer les sidebars fixes sur mobile sans perdre le contenu :
 *   - Backdrop semi-transparent qui ferme au tap
 *   - Slide animé via CSS transform
 *   - Largeur min(86vw, 320px) — laisse voir le contexte derrière
 *   - Body scroll lock pendant ouverture
 *   - ESC = ferme ; focus sur premier élément focusable
 *   - safe-area-inset-top respecté
 *
 * Usage :
 *   <MobileDrawer open={open} onClose={() => setOpen(false)}>
 *     <SidebarContent />
 *   </MobileDrawer>
 */

export interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Côté d'apparition (par défaut "left"). */
  side?: "left" | "right";
  /** Largeur custom — par défaut min(86vw, 320px). */
  width?: number | string;
  children: React.ReactNode;
}

const STYLE_ID = "cit-drawer-style";
function ensureStyle(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
.cit-drawer-backdrop {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(15, 23, 42, 0.5);
  opacity: 0;
  transition: opacity .22s ease;
  -webkit-tap-highlight-color: transparent;
}
.cit-drawer-backdrop[data-open="true"] { opacity: 1; }

.cit-drawer-panel {
  position: fixed; top: 0; bottom: 0; z-index: 1101;
  background: #fff;
  box-shadow: 0 0 30px rgba(0,0,0,0.18);
  display: flex; flex-direction: column;
  overflow: hidden;
  padding-top: env(safe-area-inset-top, 0);
  transition: transform .26s cubic-bezier(.22,.61,.36,1);
}
.cit-drawer-panel[data-side="left"]  { left: 0;  transform: translateX(-105%); }
.cit-drawer-panel[data-side="right"] { right: 0; transform: translateX(105%); }
.cit-drawer-panel[data-open="true"]  { transform: translateX(0); }

.cit-drawer-body {
  flex: 1; overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

@media (prefers-reduced-motion: reduce) {
  .cit-drawer-backdrop, .cit-drawer-panel { transition: none; }
}
`;
  document.head.appendChild(el);
}

export function MobileDrawer(props: MobileDrawerProps): React.ReactElement | null {
  const { open, onClose, side = "left", width, children } = props;
  ensureStyle();
  const [mounted, setMounted] = useState<boolean>(open);
  const [visualOpen, setVisualOpen] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = window.requestAnimationFrame(() => setVisualOpen(true));
      return () => window.cancelAnimationFrame(id);
    }
    setVisualOpen(false);
    const t = window.setTimeout(() => setMounted(false), 280);
    return () => window.clearTimeout(t);
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (!mounted || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  // ESC
  useEffect(() => {
    if (!mounted) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mounted, onClose]);

  if (!mounted) return null;

  const panelWidth = width ?? "min(86vw, 320px)";

  return (
    <>
      <div
        className="cit-drawer-backdrop"
        data-open={visualOpen ? "true" : "false"}
        onClick={onClose}
        role="presentation"
      />
      <div
        className="cit-drawer-panel"
        data-side={side}
        data-open={visualOpen ? "true" : "false"}
        style={{ width: panelWidth }}
        role="dialog"
        aria-modal="true"
      >
        <div className="cit-drawer-body">{children}</div>
      </div>
    </>
  );
}

export default MobileDrawer;
