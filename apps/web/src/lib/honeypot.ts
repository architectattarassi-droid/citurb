import type { CSSProperties } from "react";

/**
 * Style du champ piège anti-robots (« website »), commun à tous les formulaires.
 *
 * Jamais `left: -10000px` : en arabe (dir="rtl"), un débordement à gauche
 * devient défilable — la page s'élargit de 10 000 px et l'écran devient blanc.
 * Ici le champ reste à sa place (1 px), découpé et invisible ; pas de
 * display:none, que certains robots savent ignorer.
 */
export const HONEYPOT_STYLE: CSSProperties = {
  position: "absolute",
  insetInlineStart: 0,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  border: 0,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  opacity: 0,
  pointerEvents: "none",
};
