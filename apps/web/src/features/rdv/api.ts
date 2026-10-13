/**
 * Rendez-vous en visio — client des Pages Functions /api/rdv.
 * Le jeton de l'espace client ne transite que vers notre propre origine.
 */
import type { ConfigVisio } from "../visio/SalleVisio";

export const FUSEAU_MAROC = "Africa/Casablanca";

export type JourCreneaux = { date: string; jour: string; creneaux: { debut: string; heure: string }[] };
export type Creneaux = { ok: true; fuseau: string; dureeMin: number; jours: JourCreneaux[] };

export type RdvClient = {
  reference: string; debut: string; dureeMin: number; statut: "CONFIRME" | "ANNULE" | "TERMINE" | "ABSENT";
  nom: string; objet: string; porte: string | null; message: string | null; dossierRdv: Record<string, unknown>;
  visio: { integree: boolean; ouverture: string; fermeture: string; secours: { type: "lien" | "whatsapp"; url: string } };
  peutModifier: boolean;
};

export type Resultat<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

async function appel<T>(url: string, init?: RequestInit): Promise<Resultat<T>> {
  try {
    const r = await fetch(url, { cache: "no-store", ...init, headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}) } });
    const j = (r.headers.get("content-type") || "").includes("json") ? await r.json().catch(() => null) : null;
    if (r.ok && j?.ok) return { ok: true, data: j as T };
    return { ok: false, error: j?.error || `http_${r.status}`, status: r.status };
  } catch {
    return { ok: false, error: "reseau", status: 0 };
  }
}

const enc = encodeURIComponent;
const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const lireCreneaux = () => appel<Creneaux>("/api/rdv/creneaux");

export type Demande = { debut: string; nom: string; telephone: string; email?: string; objet: string; message?: string; consentement: boolean; website?: string; utm?: Record<string, string> };
export const reserver = (d: Demande) => appel<{ ok: true; jeton: string; debut: string; reference: string }>("/api/rdv", post(d));

export const lireRdv = (jeton: string) => appel<{ ok: true; rdv: RdvClient }>(`/api/rdv/${enc(jeton)}`);
export const enregistrerDossier = (jeton: string, reponses: Record<string, unknown>) => appel<{ ok: true; majLe: string }>(`/api/rdv/${enc(jeton)}/dossier`, post({ reponses }));
export const annuler = (jeton: string) => appel<{ ok: true }>(`/api/rdv/${enc(jeton)}/annuler`, post({}));
export const deplacer = (jeton: string, debut: string) => appel<{ ok: true; debut: string }>(`/api/rdv/${enc(jeton)}/deplacer`, post({ debut }));
export const ouvrirVisio = (jeton: string) => appel<{ ok: true; config: ConfigVisio }>(`/api/rdv/${enc(jeton)}/visio`, post({}));

// ── Affichage des dates ────────────────────────────────────────────────

const fmt = (o: Intl.DateTimeFormatOptions, tz?: string) => new Intl.DateTimeFormat("fr-FR", { ...o, ...(tz ? { timeZone: tz } : {}) });

/** « mardi 13 octobre » au Maroc. */
export const jourLong = (iso: string) => fmt({ weekday: "long", day: "numeric", month: "long" }, FUSEAU_MAROC).format(new Date(iso));
/** « mar. 13 » (onglet de jour) — `date` = AAAA-MM-JJ du Maroc. */
export const jourCourt = (date: string) => fmt({ weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
export const moisCourt = (date: string) => fmt({ month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
/** « 10:30 » au Maroc. */
export const heureMaroc = (iso: string) => fmt({ hour: "2-digit", minute: "2-digit" }, FUSEAU_MAROC).format(new Date(iso));

/** Fuseau du navigateur, s'il diffère de l'heure du Maroc à cet instant (MRE). */
export function fuseauLocalDifferent(iso = new Date().toISOString()): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || tz === FUSEAU_MAROC) return null;
    const d = new Date(iso);
    const a = fmt({ hour: "2-digit", minute: "2-digit", day: "numeric" }, tz).format(d);
    const b = fmt({ hour: "2-digit", minute: "2-digit", day: "numeric" }, FUSEAU_MAROC).format(d);
    return a === b ? null : tz;
  } catch {
    return null;
  }
}
/** « 11:30 (Europe/Paris) » — heure locale du navigateur. */
export const heureLocale = (iso: string, tz: string) => fmt({ hour: "2-digit", minute: "2-digit", ...(jourDiffere(iso, tz) ? { weekday: "short" } : {}) }, tz).format(new Date(iso));
const jourDiffere = (iso: string, tz: string) => fmt({ day: "numeric" }, tz).format(new Date(iso)) !== fmt({ day: "numeric" }, FUSEAU_MAROC).format(new Date(iso));

/** Lien « Ajouter à Google Agenda » (même format que l'e-mail). */
export function lienAgenda(debut: string, dureeMin: number, lienEspace: string): string {
  const c = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const t = Date.parse(debut);
  const q = new URLSearchParams({ action: "TEMPLATE", text: "Appel vidéo avec l'architecte — CITURBAREA", dates: `${c(t)}/${c(t + dureeMin * 60_000)}`, details: `Rejoindre l'appel et remplir votre dossier : ${lienEspace}`, location: lienEspace });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export const OBJETS: [string, string, string][] = [
  ["MAISON", "Construire une maison", "Villa, maison, R+1, R+2…"],
  ["PERMIS", "Permis / autorisation", "Permis de construire, régularisation, conformité"],
  ["CHIFFRAGE", "Chiffrage / devis", "Combien va coûter mon projet ?"],
  ["TERRAIN", "Terrain", "Acheter, vérifier, valoriser un terrain"],
  ["AUTRE", "Autre sujet", "Une question pour l'architecte"],
];
export const LIB_OBJET: Record<string, string> = Object.fromEntries(OBJETS.map(([k, l]) => [k, l]));

/** Premier jour ayant au moins un créneau libre (ou le jour courant s'il en a encore). */
export function jourParDefaut(offre: Creneaux, actuel: string): string {
  return offre.jours.some((x) => x.date === actuel && x.creneaux.length) ? actuel : offre.jours.find((x) => x.creneaux.length)?.date || "";
}
