/**
 * Thème admin distinct du thème Cercles — fond sombre, accents rouges/dorés
 * pour bien différencier visuellement quand on est en mode admin.
 */
export const ADMIN_THEME = {
  bg: "#0A0E1A",          // bleu nuit ultra-sombre
  bgPanel: "#13182A",     // panneau légèrement plus clair
  bgRaised: "#1A2138",
  border: "#2A3450",
  borderSoft: "#1F2740",

  ink: "#E8ECF7",         // texte principal blanc cassé
  inkMid: "#9AA3BD",
  inkMuted: "#6B7390",

  accent: "#B08D57",      // or CITURBAREA
  accentHover: "#9A7847",
  danger: "#E53E3E",
  dangerBg: "rgba(229, 62, 62, 0.12)",
  warn: "#D69E2E",
  warnBg: "rgba(214, 158, 46, 0.12)",
  success: "#48BB78",
  successBg: "rgba(72, 187, 120, 0.12)",
  info: "#4299E1",
  infoBg: "rgba(66, 153, 225, 0.12)",

  fontDisplay: "'Playfair Display', Georgia, serif",
  fontBody: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontMono: "'JetBrains Mono', 'IBM Plex Mono', monospace",

  shadow: "0 4px 24px rgba(0,0,0,0.4)",
} as const;

export function ensureAdminFonts() {
  if (typeof document === "undefined") return;
  const id = "admin-fonts";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap";
  document.head.appendChild(link);
}
