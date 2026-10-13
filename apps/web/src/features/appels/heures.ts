/**
 * Heures des appels : toujours l'heure du Maroc (Africa/Casablanca, changement
 * d'heure du Ramadan compris), plus l'heure locale du lecteur quand elle
 * diffère (diaspora). Saisie : <input type="datetime-local"> dans le fuseau du
 * navigateur, converti en instant UTC.
 */
import type { LangueAppel } from "./textes";

export const FUSEAU_MAROC = "Africa/Casablanca";

export function fuseauLocal(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || FUSEAU_MAROC; } catch { return FUSEAU_MAROC; }
}

const loc = (l: LangueAppel) => (l === "ar" ? "ar-MA" : "fr-FR");

/** « mar. 14 oct. · 10:30 » dans un fuseau donné (chiffres latins, lisibles partout). */
export function dateHeure(iso: string, langue: LangueAppel, fuseau = FUSEAU_MAROC): string {
  const d = new Date(iso);
  const jour = new Intl.DateTimeFormat(loc(langue), { timeZone: fuseau, weekday: "short", day: "numeric", month: "short", numberingSystem: "latn" }).format(d);
  return `${jour} · ${heure(iso, fuseau)}`;
}

export const heure = (iso: string, fuseau = FUSEAU_MAROC) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: fuseau, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

/** Le fuseau local donne-t-il une autre heure que le Maroc à cet instant ? */
export const heureLocaleDiffere = (iso: string) => heure(iso) !== heure(iso, fuseauLocal());

/** Valeur d'un datetime-local (heure du navigateur) → ISO UTC ; null si vide/illisible. */
export function localVersIso(v: string): string | null {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** Bornes du sélecteur : maintenant → +30 jours, au format datetime-local. */
export function bornesSaisie(maintenant = Date.now()): { min: string; max: string } {
  const f = (ms: number) => { const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000); return d.toISOString().slice(0, 16); };
  return { min: f(maintenant), max: f(maintenant + 30 * 24 * 3600_000) };
}

/** Proposition par défaut : demain, 10:00 heure locale. */
export function demainDixHeures(maintenant = Date.now()): string {
  const d = new Date(maintenant + 24 * 3600_000);
  d.setHours(10, 0, 0, 0);
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return x.toISOString().slice(0, 16);
}
