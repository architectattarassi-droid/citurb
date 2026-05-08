/**
 * CC Theme tokens — Studio architecte premium.
 *
 * Palette inspirée des ateliers d'architecture :
 *   - Fond ivoire chaud (papier ancien)
 *   - Bleu nuit profond (encre)
 *   - Or vieilli (marquages, sceaux)
 *   - Sauge / terracotta pour les états
 *
 * Typographie :
 *   - Display (titres) : Playfair Display, serif
 *   - Body : Inter, sans-serif
 *
 * Convention : utilise ces tokens partout dans /command-center pour
 * garder une cohérence visuelle stricte.
 */

export const CC = {
  color: {
    // Fonds
    bg:        "#FAF7F2",   // ivoire principal
    bgRaised:  "#FFFFFF",   // cartes
    bgSoft:    "#F2EDE3",   // bandeaux, KPI bar
    bgDeep:    "#0F2A4A",   // header haut, panneaux navy

    // Bordures
    border:    "#E8E2D5",   // séparateurs principaux
    borderSoft:"#F0EBE0",   // séparateurs très légers
    borderDeep:"#1A3A5C",   // bordures navy

    // Encre
    ink:       "#1A1F2E",   // texte principal
    inkMid:    "#5C6373",   // texte secondaire
    inkMuted:  "#8B91A1",   // texte tertiaire
    inkOnDark: "#FAF7F2",   // texte sur fond navy

    // Accents
    navy:      "#0F2A4A",   // primaire (boutons, liens)
    navyHover: "#1A3A5C",
    or:        "#B08D57",   // accent or vieilli
    orHover:   "#9A7847",
    orSoft:    "#E5D4B5",   // halo or léger

    // États
    success:   "#6B7F5C",   // sauge
    warn:      "#B8633F",   // terracotta
    danger:    "#94292B",   // rouge profond
    info:      "#3D5A80",   // bleu acier

    // Halos états
    successBg: "#EEF2E8",
    warnBg:    "#F5E6DD",
    dangerBg:  "#F2DEDE",
    infoBg:    "#E5ECF4",
  },

  font: {
    display: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
    body:    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    mono:    "'JetBrains Mono', 'IBM Plex Mono', monospace",
  },

  size: {
    radius:    8,
    radiusLg:  12,
    radiusSm:  4,
  },

  shadow: {
    soft:  "0 1px 2px rgba(15, 42, 74, 0.04), 0 1px 3px rgba(15, 42, 74, 0.06)",
    raise: "0 4px 8px rgba(15, 42, 74, 0.06), 0 2px 4px rgba(15, 42, 74, 0.08)",
    deep:  "0 12px 32px rgba(15, 42, 74, 0.10), 0 4px 8px rgba(15, 42, 74, 0.06)",
  },

  ease: "cubic-bezier(0.4, 0.0, 0.2, 1)",
} as const;

/**
 * Phase-engine — labels & descriptions FR pour l'UI.
 * Couvre les 12 phases (BRIEF → PERMIS_HABITER) + phases GO dynamiques.
 */
export const PHASE_META: Record<string, { label: string; short: string; group: "amorce" | "etudes" | "execution" | "aboutissement"; }> = {
  PHASE_00_BRIEF:               { label: "Brief client",            short: "BRIEF",   group: "amorce" },
  PHASE_01_ESQUISSE:            { label: "Esquisse",                short: "ESQ",     group: "etudes" },
  PHASE_02_APS:                 { label: "Avant-Projet Sommaire",   short: "APS",     group: "etudes" },
  PHASE_03_APD:                 { label: "Avant-Projet Détaillé",   short: "APD",     group: "etudes" },
  PHASE_04_MANDAT_BET:          { label: "Mandat BET",              short: "BET",     group: "etudes" },
  PHASE_05_AUTORISATION:        { label: "Autorisation",            short: "AUT",     group: "etudes" },
  PHASE_06_DOSSIER_EXECUTION:   { label: "Dossier d'exécution",     short: "EXE",     group: "execution" },
  PHASE_07_DCE:                 { label: "DCE",                     short: "DCE",     group: "execution" },
  PHASE_08_MANDATS:             { label: "Mandats entreprises",     short: "MAN",     group: "execution" },
  PHASE_09_OUVERTURE_CHANTIER:  { label: "Ouverture chantier",      short: "OUV",     group: "execution" },
  PHASE_RECEPTION_PROVISOIRE:   { label: "Réception provisoire",    short: "RP",      group: "aboutissement" },
  PHASE_RECEPTION_DEFINITIVE:   { label: "Réception définitive",    short: "RD",      group: "aboutissement" },
  PHASE_PERMIS_HABITER:         { label: "Permis d'habiter",        short: "PH",      group: "aboutissement" },
};

export const PHASE_ORDER = Object.keys(PHASE_META);
