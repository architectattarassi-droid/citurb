import { CASABLANCA_TZ } from "./analytics.service";

/**
 * Helpers de fenêtrage temporel en timezone Africa/Casablanca.
 *
 * Le Maroc est globalement à UTC+1 mais bascule à UTC+0 pendant le Ramadan :
 * on ne code donc AUCUN offset en dur. On dérive l'offset réel via Intl à
 * l'instant considéré, ce qui reste correct quelles que soient les bascules.
 */

/** Offset (ms) à ajouter à un instant UTC pour obtenir l'heure murale `timeZone`. */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) map[p.type] = p.value;
  const asIfUTC = Date.UTC(
    +map.year,
    +map.month - 1,
    +map.day,
    +map.hour,
    +map.minute,
    +map.second,
  );
  return asIfUTC - instant.getTime();
}

export type MsWindow = { startMs: number; endMs: number };

/**
 * Bornes [start, end] d'une journée Casablanca, relative à `ref`.
 *  - dayOffset = 0  → aujourd'hui
 *  - dayOffset = -1 → la veille
 */
export function casablancaDayWindow(ref: Date, dayOffset = 0): MsWindow {
  // Date calendaire (Y-M-D) de `ref` telle que vue à Casablanca.
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: CASABLANCA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ref);
  const [y, m, d] = ymd.split("-").map(Number);
  // Minuit mural du jour cible, exprimé comme s'il était UTC…
  const wallMidnight = Date.UTC(y, m - 1, d + dayOffset, 0, 0, 0);
  // …puis corrigé par l'offset réel de la timezone à cet instant.
  const offset = tzOffsetMs(new Date(wallMidnight), CASABLANCA_TZ);
  const startMs = wallMidnight - offset;
  const endMs = startMs + 24 * 60 * 60 * 1000 - 1;
  return { startMs, endMs };
}

/** Fenêtre de N jours pleins se terminant la veille (incluse) de `ref`. */
export function lastNDaysWindow(ref: Date, n: number): MsWindow {
  const end = casablancaDayWindow(ref, -1).endMs; // fin de la veille
  const start = casablancaDayWindow(ref, -n).startMs; // début il y a n jours
  return { startMs: start, endMs: end };
}

/**
 * Parse une borne fournie par l'utilisateur (ISO date `YYYY-MM-DD`, ISO datetime,
 * ou epoch ms). `endOfDay` étend une date nue à la fin de journée Casablanca.
 * Retourne null si non parsable.
 */
export function parseBoundMs(input: string | undefined, endOfDay = false): number | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^\d{13}$/.test(trimmed)) return Number(trimmed); // epoch ms
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-").map(Number);
    const ref = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // midi pour stabilité tz
    const w = casablancaDayWindow(ref, 0);
    return endOfDay ? w.endMs : w.startMs;
  }
  const t = Date.parse(trimmed);
  return Number.isNaN(t) ? null : t;
}
