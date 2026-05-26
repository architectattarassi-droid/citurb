import React, { useEffect, useRef, useState } from "react";

/**
 * BottomSheet — feuille modale qui glisse depuis le bas (style iOS / Material).
 *
 * Features :
 *   - 3 hauteurs prédéfinies : small (40 vh), medium (70 vh), full (95 vh)
 *   - drag-to-dismiss : un swipe vertical > 80 px ferme la feuille
 *   - backdrop semi-transparent, tap = fermeture
 *   - focus mis sur le premier élément focusable à l'ouverture (a11y)
 *   - safe-area-inset-bottom respecté
 *   - prefers-reduced-motion → transitions désactivées
 *
 * Usage :
 *   <BottomSheet open={open} onClose={() => setOpen(false)} snap="medium">
 *     ...contenu...
 *   </BottomSheet>
 */

export type BottomSheetSnap = "small" | "medium" | "full";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  snap?: BottomSheetSnap;
  /** Optionnel — titre affiché dans le handle. */
  title?: React.ReactNode;
  /** Cacher le handle drag. */
  hideHandle?: boolean;
  children: React.ReactNode;
}

const SNAP_HEIGHT: Record<BottomSheetSnap, string> = {
  small: "40vh",
  medium: "70vh",
  full: "95vh",
};

const STYLE_ID = "cit-bottomsheet-style";
function ensureStyle(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
.cit-bs-backdrop {
  position: fixed; inset: 0; z-index: 1200;
  background: rgba(15, 23, 42, 0.55);
  opacity: 0;
  transition: opacity .22s ease;
  -webkit-tap-highlight-color: transparent;
}
.cit-bs-backdrop[data-open="true"] { opacity: 1; }
.cit-bs-sheet {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 1201;
  background: #fff;
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
  box-shadow: 0 -12px 36px rgba(0, 0, 0, 0.22);
  display: flex; flex-direction: column;
  max-height: 95vh;
  transform: translateY(100%);
  transition: transform .26s cubic-bezier(.22,.61,.36,1);
  padding-bottom: env(safe-area-inset-bottom, 0);
  overscroll-behavior: contain;
  touch-action: pan-y;
}
.cit-bs-sheet[data-open="true"] { transform: translateY(0); }
.cit-bs-handle {
  flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center;
  padding: 10px 16px 8px;
  cursor: grab;
  user-select: none;
}
.cit-bs-handle:active { cursor: grabbing; }
.cit-bs-handle-bar {
  width: 44px; height: 5px; border-radius: 3px;
  background: #cbd5e1;
}
.cit-bs-title {
  margin-top: 8px;
  font-size: 14px; font-weight: 600; color: #0f172a;
}
.cit-bs-body {
  flex: 1; overflow-y: auto; padding: 6px 18px 22px;
  -webkit-overflow-scrolling: touch;
}
@media (prefers-reduced-motion: reduce) {
  .cit-bs-backdrop, .cit-bs-sheet { transition: none; }
}
`;
  document.head.appendChild(el);
}

export function BottomSheet(props: BottomSheetProps): React.ReactElement | null {
  const { open, onClose, snap = "medium", title, hideHandle, children } = props;
  ensureStyle();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState<boolean>(open);
  const [visualOpen, setVisualOpen] = useState<boolean>(false);
  const [dragY, setDragY] = useState<number>(0);
  const startYRef = useRef<number | null>(null);

  // Cycle de vie : mount → animation in ; close → animation out → unmount
  useEffect(() => {
    if (open) {
      setMounted(true);
      // requestAnimationFrame pour laisser le DOM se peindre avant de trigger l'anim
      const id = window.requestAnimationFrame(() => setVisualOpen(true));
      return () => window.cancelAnimationFrame(id);
    }
    setVisualOpen(false);
    const t = window.setTimeout(() => setMounted(false), 280);
    return () => window.clearTimeout(t);
  }, [open]);

  // Bloque scroll body pendant ouverture
  useEffect(() => {
    if (!mounted || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  // ESC = ferme
  useEffect(() => {
    if (!mounted) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mounted, onClose]);

  // Focus le premier élément focusable
  useEffect(() => {
    if (!visualOpen || !sheetRef.current) return;
    const sel = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
    const first = sheetRef.current.querySelector<HTMLElement>(sel);
    first?.focus();
  }, [visualOpen]);

  if (!mounted) return null;

  // ── Drag-to-dismiss (touch + pointer) ─────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    startYRef.current = e.clientY;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startYRef.current == null) return;
    const dy = e.clientY - startYRef.current;
    if (dy > 0) setDragY(dy);
  };
  const onPointerUp = () => {
    if (dragY > 80) {
      onClose();
    }
    setDragY(0);
    startYRef.current = null;
  };

  const sheetStyle: React.CSSProperties = {
    height: SNAP_HEIGHT[snap],
    // Si on drag, on superpose un translateY supplémentaire pour suivre le doigt
    transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
    transition: dragY > 0 ? "none" : undefined,
  };

  return (
    <>
      <div
        className="cit-bs-backdrop"
        data-open={visualOpen ? "true" : "false"}
        onClick={onClose}
        role="presentation"
      />
      <div
        ref={sheetRef}
        className="cit-bs-sheet"
        data-open={visualOpen ? "true" : "false"}
        style={sheetStyle}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Feuille modale"}
      >
        {!hideHandle && (
          <div
            className="cit-bs-handle"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <span className="cit-bs-handle-bar" />
            {title && <span className="cit-bs-title">{title}</span>}
          </div>
        )}
        <div className="cit-bs-body">{children}</div>
      </div>
    </>
  );
}

export default BottomSheet;
