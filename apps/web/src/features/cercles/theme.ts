/**
 * Tokens visuels du module Cercles — alignés sur le design atelier premium
 * (ivoire / navy / or). Un seul point de vérité pour les couleurs/typo.
 */
export const CC_THEME = {
  bg:        "#FAF7F2",
  bgRaised:  "#FFFFFF",
  bgSoft:    "#F2EDE3",
  bgDeep:    "#0F2A4A",

  border:    "#E8E2D5",
  borderSoft:"#F0EBE0",

  ink:       "#1A1F2E",
  inkMid:    "#5C6373",
  inkMuted:  "#8B91A1",
  inkOnDark: "#FAF7F2",

  navy:      "#0F2A4A",
  navyHover: "#1A3A5C",
  or:        "#B08D57",
  orHover:   "#9A7847",
  orSoft:    "#E5D4B5",

  success:   "#6B7F5C",
  warn:      "#B8633F",
  danger:    "#94292B",
  info:      "#3D5A80",

  successBg: "#EEF2E8",
  warnBg:    "#F5E6DD",
  dangerBg:  "#F2DEDE",
  infoBg:    "#E5ECF4",

  fontDisplay: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
  fontBody:    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  fontMono:    "'JetBrains Mono', 'IBM Plex Mono', monospace",

  shadowSoft: "0 1px 2px rgba(15,42,74,0.04), 0 1px 3px rgba(15,42,74,0.06)",
  shadowRaise:"0 4px 8px rgba(15,42,74,0.06), 0 2px 4px rgba(15,42,74,0.08)",

  ease: "cubic-bezier(0.4, 0.0, 0.2, 1)",
} as const;

/** Hook ensure Google Fonts loaded (Playfair + Inter). Idempotent. */
export const ensureFonts = () => {
  if (typeof document === "undefined") return;
  const id = "cercles-fonts";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap";
  document.head.appendChild(link);
};
