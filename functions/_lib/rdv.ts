/**
 * Rendez-vous en visio avec l'architecte : logique pure (créneaux à l'heure du
 * Maroc, paramètres, validation, jeton d'accès, liste blanche du dossier,
 * agenda) et accès Neon.
 *
 * Fuseau : Africa/Casablanca, calculé avec Intl (le Maroc change d'heure
 * pendant le Ramadan : jamais de décalage fixe). Stockage en UTC (timestamptz).
 * Tables : docs/sql/rendezvous-neon.sql — jamais créées ici (absentes → 503).
 */

export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

export const FUSEAU = "Africa/Casablanca";
export const STATUTS_RDV = ["CONFIRME", "ANNULE", "TERMINE", "ABSENT"] as const;
export const OBJETS = ["MAISON", "PERMIS", "CHIFFRAGE", "TERRAIN", "AUTRE"] as const;
export const LIB_OBJET: Record<string, string> = {
  MAISON: "Construire une maison", PERMIS: "Permis / autorisation", CHIFFRAGE: "Chiffrage / devis", TERRAIN: "Terrain", AUTRE: "Autre sujet",
};
const PORTES = ["P1", "P2", "P3", "P4", "P5", "P6"];
const PORTE_PAR_OBJET: Record<string, string> = { MAISON: "P1", PERMIS: "P1", CHIFFRAGE: "P1", TERRAIN: "P4", AUTRE: "P1" };
/** Ligne WhatsApp du cabinet (même valeur que apps/web/src/config/contact.ts). */
export const WHATSAPP_CABINET = "212700127892";
/** Annulation / déplacement possibles jusqu'à 2 h avant. */
export const DELAI_MODIF_MS = 2 * 3600_000;

// ── Fuseau du Maroc ─────────────────────────────────────────────────────

const FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSEAU, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
});

function parties(ms: number) {
  const p: Record<string, number> = {};
  for (const x of FORMAT.formatToParts(new Date(ms))) if (x.type !== "literal") p[x.type] = Number(x.value);
  return { a: p.year, m: p.month, j: p.day, h: p.hour === 24 ? 0 : p.hour, mi: p.minute, s: p.second };
}

/** Décalage du Maroc par rapport à UTC à cet instant (ms). */
function decalage(ms: number): number {
  const p = parties(ms);
  return Date.UTC(p.a, p.m - 1, p.j, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}

/** Date du jour au Maroc, « AAAA-MM-JJ ». */
export function jourMaroc(ms: number): string {
  const p = parties(ms);
  return `${p.a}-${String(p.m).padStart(2, "0")}-${String(p.j).padStart(2, "0")}`;
}

/** Heure au Maroc, « HH:MM ». */
export function heureMaroc(ms: number): string {
  const p = parties(ms);
  return `${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;
}

/** Instant UTC (ms) d'une heure murale au Maroc. */
export function instantMaroc(jour: string, hhmm: string): number {
  const [a, m, j] = jour.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const naif = Date.UTC(a, m - 1, j, h, mi);
  const t = naif - decalage(naif);
  return naif - decalage(t);
}

const ajouterJours = (jour: string, n: number) => {
  const [a, m, j] = jour.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j + n)).toISOString().slice(0, 10);
};

export const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const;
export type Jour = (typeof JOURS)[number];
const jourSemaine = (jour: string): Jour => {
  const [a, m, j] = jour.split("-").map(Number);
  return JOURS[new Date(Date.UTC(a, m - 1, j)).getUTCDay()];
};

/** « mardi 14 octobre à 10:30 » (heure du Maroc). */
export function dateLisible(ms: number): string {
  const d = new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, weekday: "long", day: "numeric", month: "long" }).format(new Date(ms));
  return `${d} à ${heureMaroc(ms)}`;
}

// ── Paramètres ──────────────────────────────────────────────────────────

export type Plage = [string, string];
export type ParametresRdv = {
  /** Lien de SECOURS (Meet, Zoom, Teams…) si la visio intégrée n'est pas active ; vide → WhatsApp du cabinet. */
  lienVisio: string;
  dureeMin: number;
  delaiMinHeures: number;
  horizonJours: number;
  plages: Record<Jour, Plage[]>;
  fermetures: string[];
};

/** Valeurs par défaut — hypothèse, à régler dans le back-office (/cc/rendez-vous → Paramètres). */
export const PARAMETRES_DEFAUT: ParametresRdv = {
  lienVisio: "",
  dureeMin: 30,
  delaiMinHeures: 12,
  horizonJours: 21,
  plages: {
    lundi: [["10:00", "12:30"], ["15:00", "18:00"]],
    mardi: [["10:00", "12:30"], ["15:00", "18:00"]],
    mercredi: [["10:00", "12:30"], ["15:00", "18:00"]],
    jeudi: [["10:00", "12:30"], ["15:00", "18:00"]],
    vendredi: [["10:00", "12:30"], ["15:00", "18:00"]],
    samedi: [["10:00", "12:30"]],
    dimanche: [],
  },
  fermetures: [],
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const minutes = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const entier = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : undefined);

const VALIDEURS: { [K in keyof ParametresRdv]: (v: unknown) => ParametresRdv[K] | undefined } = {
  lienVisio: (v) => (v === "" ? "" : typeof v === "string" && v.length <= 300 && /^https:\/\/[^\s<>"']+$/.test(v.trim()) ? v.trim() : undefined),
  dureeMin: (v) => { const n = entier(v, 15, 120); return n !== undefined && n % 5 === 0 ? n : undefined; },
  delaiMinHeures: (v) => entier(v, 0, 168),
  horizonJours: (v) => entier(v, 1, 90),
  plages: (v) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
    const o = {} as Record<Jour, Plage[]>;
    for (const j of JOURS) {
      const l = (v as Record<string, unknown>)[j] ?? [];
      if (!Array.isArray(l) || l.length > 6) return undefined;
      for (const p of l) if (!Array.isArray(p) || p.length !== 2 || !HHMM.test(String(p[0])) || !HHMM.test(String(p[1])) || minutes(p[0]) >= minutes(p[1])) return undefined;
      o[j] = l.map((p) => [String(p[0]), String(p[1])] as Plage);
    }
    return o;
  },
  fermetures: (v) => (Array.isArray(v) && v.length <= 366 && v.every((x) => typeof x === "string" && DATE.test(x)) ? [...new Set(v as string[])].sort() : undefined),
};

/** Validation stricte (enregistrement depuis le back-office). */
export function validerParametres(v: unknown): { ok: true; parametres: ParametresRdv } | { ok: false; erreur: string } {
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false, erreur: "payload_invalid" };
  const o = {} as Record<string, unknown>;
  for (const k of Object.keys(VALIDEURS) as (keyof ParametresRdv)[]) {
    const x = VALIDEURS[k]((v as Record<string, unknown>)[k]);
    if (x === undefined) return { ok: false, erreur: `${k}_invalide` };
    o[k] = x;
  }
  return { ok: true, parametres: o as ParametresRdv };
}

/** Lecture tolérante : chaque champ invalide ou absent reprend sa valeur par défaut. */
export function avecDefauts(v: unknown): ParametresRdv {
  const src = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const o = {} as Record<string, unknown>;
  for (const k of Object.keys(VALIDEURS) as (keyof ParametresRdv)[]) o[k] = VALIDEURS[k](src[k]) ?? PARAMETRES_DEFAUT[k];
  return o as ParametresRdv;
}

// ── Créneaux ────────────────────────────────────────────────────────────

export type Occupe = { debut: number; dureeMin: number };
export type JourCreneaux = { date: string; jour: Jour; creneaux: { debut: string; heure: string }[] };

/**
 * Créneaux libres jour par jour (heure du Maroc), du jour courant à l'horizon :
 * hors fermetures, hors créneaux déjà réservés (chevauchement), et pas avant
 * maintenant + délai minimum.
 */
export function genererCreneaux(p: ParametresRdv, maintenant: number, occupes: Occupe[] = []): JourCreneaux[] {
  const premier = jourMaroc(maintenant);
  const limite = maintenant + p.delaiMinHeures * 3600_000;
  const duree = p.dureeMin * 60_000;
  const fermes = new Set(p.fermetures);
  const jours: JourCreneaux[] = [];
  for (let i = 0; i < p.horizonJours; i++) {
    const date = ajouterJours(premier, i);
    const jour = jourSemaine(date);
    const plages = p.plages[jour] ?? [];
    if (fermes.has(date) || !plages.length) continue;
    const creneaux: JourCreneaux["creneaux"] = [];
    for (const [a, b] of plages) {
      for (let m = minutes(a); m + p.dureeMin <= minutes(b); m += p.dureeMin) {
        const heure = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
        const debut = instantMaroc(date, heure);
        if (debut < limite) continue;
        if (occupes.some((o) => o.debut < debut + duree && o.debut + o.dureeMin * 60_000 > debut)) continue;
        creneaux.push({ debut: new Date(debut).toISOString(), heure });
      }
    }
    jours.push({ date, jour, creneaux });
  }
  // Rien à proposer aujourd'hui (délai minimum) : le jour n'est pas affiché.
  return jours.filter((j) => j.creneaux.length || j.date !== premier);
}

/** Le créneau demandé fait-il partie de l'offre (hors réservations) ? */
export function creneauPropose(p: ParametresRdv, debut: number, maintenant: number): boolean {
  if (!Number.isFinite(debut)) return false;
  const iso = new Date(debut).toISOString();
  return genererCreneaux(p, maintenant).some((j) => j.creneaux.some((c) => c.debut === iso));
}

// ── Jeton d'accès client ────────────────────────────────────────────────

export const JETON_RE = /^[A-Za-z0-9_-]{43}$/;

const base64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** 256 bits aléatoires, base64url (43 caractères). Jamais stocké en clair. */
export function nouveauJeton(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

/** Empreinte SHA-256 (hex) du jeton : seule valeur stockée en base. */
export async function hacherJeton(jeton: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(jeton));
  return Array.from(new Uint8Array(h), (x) => x.toString(16).padStart(2, "0")).join("");
}

export const idRdv = () => `rdv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
export const ID_RDV_RE = /^rdv_[a-z0-9]{6,40}$/;

// ── Validation de la réservation ────────────────────────────────────────

const SURROGATE_ISOLE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const textePropre = (s: string) => s.replace(/\u0000/g, "").replace(SURROGATE_ISOLE, "�");
export const clip = (v: unknown, n: number) => (typeof v === "string" ? Array.from(textePropre(v).trim()).slice(0, n).join("") : "");

/** Téléphone marocain ou international (même règle que telephoneLead de capture.ts). */
export function telephoneRdv(t: string): string | null {
  const c = t.replace(/[\s.\-()]/g, "");
  if (/^(\+212|00212|0)[567]\d{8}$/.test(c)) return c.startsWith("00212") ? `+${c.slice(2)}` : c;
  if (/^(\+|00)[1-9]\d{7,14}$/.test(c)) return c.startsWith("00") ? `+${c.slice(2)}` : c;
  return null;
}

export type Reservation = { debut: number; nom: string; telephone: string; email: string | null; porte: string; objet: string; message: string | null };

export function validerReservation(b: Record<string, unknown>): Reservation | { erreur: string } {
  const debut = typeof b.debut === "string" ? Date.parse(b.debut) : NaN;
  if (!Number.isFinite(debut)) return { erreur: "creneau_invalide" };
  const nom = clip(b.nom, 120);
  if (nom.length < 2) return { erreur: "nom_invalide" };
  const telephone = telephoneRdv(clip(b.telephone, 30));
  if (!telephone) return { erreur: "telephone_invalide" };
  const email = clip(b.email, 200).toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { erreur: "email_invalide" };
  if (b.consentement !== true) return { erreur: "consentement_requis" };
  const objet = (OBJETS as readonly string[]).includes(String(b.objet)) ? String(b.objet) : "AUTRE";
  const porte = PORTES.includes(String(b.porte)) ? String(b.porte) : PORTE_PAR_OBJET[objet];
  return { debut, nom, telephone, email, porte, objet, message: clip(b.message, 1500) || null };
}

// ── Dossier rempli pendant l'appel (liste blanche) ──────────────────────

type Champ = { t: "texte"; max: number } | { t: "nombre"; min: number; max: number } | { t: "choix"; valeurs: readonly string[] } | { t: "bool" };

/**
 * Seuls ces champs sont enregistrés. Aucune pièce contractuelle (CIN, RC, ICE,
 * n° de titre foncier) : on demande seulement si le document EXISTE.
 */
export const CHAMPS_DOSSIER: Record<string, Champ> = {
  projetType: { t: "choix", valeurs: ["MAISON", "VILLA", "IMMEUBLE", "EXTENSION", "RENOVATION", "COMMERCE", "AUTRE"] },
  ville: { t: "texte", max: 80 },
  quartier: { t: "texte", max: 80 },
  description: { t: "texte", max: 2000 },
  surfaceTerrain: { t: "nombre", min: 0, max: 10_000_000 },
  situationFonciere: { t: "choix", valeurs: ["TITRE", "REQUISITION", "MELK", "NE_SAIS_PAS"] },
  noteRenseignements: { t: "choix", valeurs: ["OUI", "NON", "EN_COURS"] },
  facades: { t: "nombre", min: 1, max: 4 },
  niveaux: { t: "nombre", min: 1, max: 20 },
  sousSol: { t: "choix", valeurs: ["OUI", "NON", "A_VOIR"] },
  surfaceSouhaitee: { t: "nombre", min: 0, max: 1_000_000 },
  standing: { t: "choix", valeurs: ["ECONOMIQUE", "MOYEN", "STANDING", "HAUT_STANDING"] },
  budget: { t: "nombre", min: 0, max: 10_000_000_000 },
  delai: { t: "choix", valeurs: ["MOINS_6", "6_12", "PLUS_12", "NE_SAIS_PAS"] },
  docTitreFoncier: { t: "bool" },
  docPlanCadastral: { t: "bool" },
  docNru: { t: "bool" },
  docPhotos: { t: "bool" },
  questions: { t: "texte", max: 2000 },
  pret: { t: "bool" },
};

export const DOSSIER_MAX_OCTETS = 16 * 1024;

/** Ne garde que les champs connus, bornés et typés ; renvoie null si l'entrée n'est pas un objet. */
export function filtrerDossier(v: unknown): Record<string, string | number | boolean> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o: Record<string, string | number | boolean> = {};
  for (const [k, c] of Object.entries(CHAMPS_DOSSIER)) {
    const x = (v as Record<string, unknown>)[k];
    if (x === undefined || x === null || x === "") continue;
    if (c.t === "texte") { const s = clip(x, c.max); if (s) o[k] = s; }
    else if (c.t === "nombre") { const n = typeof x === "number" ? x : typeof x === "string" ? Number(x.replace(/[\s ]/g, "").replace(",", ".")) : NaN; if (Number.isFinite(n) && n >= c.min && n <= c.max) o[k] = Math.round(n * 100) / 100; }
    else if (c.t === "choix") { if (typeof x === "string" && c.valeurs.includes(x)) o[k] = x; }
    else if (typeof x === "boolean") o[k] = x;
  }
  return o;
}

// ── Agenda ──────────────────────────────────────────────────────────────

const compact = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Lien « Ajouter à Google Agenda ». */
export function lienGoogleAgenda(debut: number, dureeMin: number, lienEspace: string): string {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: "Appel vidéo avec l'architecte — CITURBAREA",
    dates: `${compact(debut)}/${compact(debut + dureeMin * 60_000)}`,
    details: `Rejoindre l'appel et remplir votre dossier : ${lienEspace}`,
    location: lienEspace,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

const echapperIcs = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Fichier .ics (iCalendar) du rendez-vous. */
export function fichierIcs(id: string, debut: number, dureeMin: number, lienEspace: string, maintenant = Date.now()): string {
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CITURBAREA//Rendez-vous//FR", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${id}@citurbarea.com`, `DTSTAMP:${compact(maintenant)}`, `DTSTART:${compact(debut)}`, `DTEND:${compact(debut + dureeMin * 60_000)}`,
    `SUMMARY:${echapperIcs("Appel vidéo avec l'architecte — CITURBAREA")}`,
    `DESCRIPTION:${echapperIcs(`Rejoindre l'appel et remplir votre dossier : ${lienEspace}`)}`,
    `URL:${lienEspace}`, "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}

/** Base64 d'un texte UTF-8 (pièce jointe Resend). */
export const base64Utf8 = (s: string) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));

// ── Accès Neon ──────────────────────────────────────────────────────────

export async function tablesRdvPresentes(sql: Sql): Promise<boolean> {
  const r = await sql`SELECT to_regclass('public."RendezVous"') IS NOT NULL AS r, to_regclass('public."Parametre"') IS NOT NULL AS p`;
  return !!r[0]?.r && !!r[0]?.p;
}

export async function lireParametres(sql: Sql): Promise<ParametresRdv> {
  const r = await sql`SELECT "valeur" FROM "Parametre" WHERE "cle" = 'rdv' LIMIT 1`;
  return avecDefauts(r[0]?.valeur);
}

const ms = (v: unknown) => (v instanceof Date ? v.getTime() : Date.parse(String(v)));

/** Créneaux confirmés entre deux instants (hors un rendez-vous donné, pour un déplacement). */
export async function creneauxOccupes(sql: Sql, depuis: number, jusqua: number, sauf: string | null = null): Promise<Occupe[]> {
  const r = await sql`SELECT "debut", "dureeMin" FROM "RendezVous" WHERE "statut" = 'CONFIRME'
    AND "debut" >= ${new Date(depuis - 4 * 3600_000).toISOString()}::timestamptz AND "debut" < ${new Date(jusqua).toISOString()}::timestamptz
    AND (${sauf}::text IS NULL OR "id" <> ${sauf}::text)`;
  return r.map((x) => ({ debut: ms(x.debut), dureeMin: Number(x.dureeMin) || 30 }));
}

/** Le créneau [debut, debut + durée[ chevauche-t-il un rendez-vous confirmé ? */
export async function creneauLibre(sql: Sql, debut: number, dureeMin: number, sauf: string | null = null): Promise<boolean> {
  const occ = await creneauxOccupes(sql, debut, debut + dureeMin * 60_000, sauf);
  return !occ.some((o) => o.debut < debut + dureeMin * 60_000 && o.debut + o.dureeMin * 60_000 > debut);
}

export async function rdvParJeton(sql: Sql, jeton: string): Promise<Record<string, unknown> | null> {
  if (!JETON_RE.test(jeton)) return null;
  const h = await hacherJeton(jeton);
  const r = await sql`SELECT * FROM "RendezVous" WHERE "jetonHash" = ${h} LIMIT 1`;
  return r[0] ?? null;
}

export const isoOuNull = (v: unknown) => (v == null ? null : new Date(ms(v)).toISOString());
export const instant = ms;

/** Lien de secours : paramètre lienVisio, sinon WhatsApp du cabinet. */
export function lienSecours(p: ParametresRdv, nom: string, debut: number): { type: "lien" | "whatsapp"; url: string } {
  if (p.lienVisio) return { type: "lien", url: p.lienVisio };
  const msg = `Bonjour, c'est ${nom}, pour notre appel vidéo du ${dateLisible(debut)}.`;
  return { type: "whatsapp", url: `https://wa.me/${WHATSAPP_CABINET}?text=${encodeURIComponent(msg)}` };
}

// ── E-mails (Resend) ────────────────────────────────────────────────────

export interface EnvMail { RESEND_API_KEY?: string; LEAD_NOTIFY_TO?: string; LEAD_NOTIFY_FROM?: string }

export async function envoyerMail(env: EnvMail, m: { to: string[]; subject: string; text: string; html?: string; attachments?: { filename: string; content: string }[] }): Promise<void> {
  if (!env.RESEND_API_KEY || !m.to.length) return;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.LEAD_NOTIFY_FROM || "CITURBAREA <no-reply@citurbarea.com>", ...m }),
    });
    if (!r.ok) console.error(`[rdv] e-mail refusé (${r.status})`);
  } catch {
    console.error("[rdv] e-mail impossible");
  }
}

export const destinatairesArchitecte = (env: EnvMail) => (env.LEAD_NOTIFY_TO || "").split(",").map((x) => x.trim()).filter(Boolean);

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Alerte au cabinet : nouveau rendez-vous, annulation ou déplacement. */
export function messageArchitecte(evenement: "nouveau" | "annule" | "deplace", r: { nom: string; telephone: string; email: string | null; objet: string; message: string | null; debut: number }) {
  const titre = { nouveau: "Nouveau rendez-vous visio", annule: "Rendez-vous annulé", deplace: "Rendez-vous déplacé" }[evenement];
  const lignes = [`${titre} : ${r.nom}, ${dateLisible(r.debut)} (heure du Maroc)`, `Téléphone : ${r.telephone}`, `E-mail : ${r.email || "—"}`, `Sujet : ${LIB_OBJET[r.objet] ?? r.objet}`, ...(r.message ? [`Message : ${r.message}`] : []), "", "https://admin.citurbarea.com/cc/rendez-vous"];
  return { subject: `${titre} — ${r.nom}, ${dateLisible(r.debut)}`, text: lignes.join("\n") };
}

/** Confirmation au client (lien d'espace, agenda). */
export function messageClient(r: { nom: string; debut: number; dureeMin: number }, lienEspace: string, lienAgenda: string) {
  const quand = dateLisible(r.debut);
  const text = `Bonjour ${r.nom},\n\nVotre appel vidéo gratuit avec l'architecte est confirmé : ${quand} (heure du Maroc), ${r.dureeMin} min.\n\nVotre espace rendez-vous (gardez ce lien, il est personnel) :\n${lienEspace}\nVous y rejoindrez l'appel et remplirez votre dossier pendant l'échange. Vous pouvez aussi annuler ou déplacer le rendez-vous jusqu'à 2 h avant.\n\nAjouter à Google Agenda : ${lienAgenda}\n\nCITURBAREA — architecte inscrit à l'Ordre`;
  const html = `<div style="font-family:sans-serif;font-size:15px;line-height:1.5;color:#0B1B3A">
<p>Bonjour ${echapper(r.nom)},</p>
<p>Votre appel vidéo gratuit avec l'architecte est confirmé :<br><strong>${echapper(quand)}</strong> (heure du Maroc), ${r.dureeMin} min.</p>
<p><a href="${echapper(lienEspace)}" style="display:inline-block;background:#C9A227;color:#0B1B3A;padding:12px 18px;border-radius:8px;font-weight:bold;text-decoration:none">Ouvrir mon espace rendez-vous</a></p>
<p style="font-size:13px;color:#475569">Ce lien est personnel : il donne accès à votre rendez-vous. Vous y rejoindrez l'appel et remplirez votre dossier pendant l'échange ; annulation ou déplacement possibles jusqu'à 2 h avant.</p>
<p><a href="${echapper(lienAgenda)}">Ajouter à Google Agenda</a> · fichier agenda (.ics) joint</p>
<p>CITURBAREA — architecte inscrit à l'Ordre</p></div>`;
  return { subject: `Votre appel vidéo avec l'architecte — ${quand}`, text, html };
}

// ── Réponses ────────────────────────────────────────────────────────────

export type Reponse = { status: number; json: Record<string, unknown> };
export const repondre = (r: Reponse) => new Response(JSON.stringify(r.json), { status: r.status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
export const indisponible = (): Reponse => ({ status: 503, json: { ok: false, error: "rdv_unavailable" } });

/** Limite en mémoire par isolat (filet best-effort, comme capture.ts). */
const passages = new Map<string, number[]>();
export function accepter(cle: string, max: number, fenetreMs: number, maintenant = Date.now()): boolean {
  const l = (passages.get(cle) || []).filter((t) => maintenant - t < fenetreMs);
  if (l.length >= max) { passages.set(cle, l); return false; }
  l.push(maintenant);
  passages.set(cle, l);
  if (passages.size > 5000) passages.clear();
  return true;
}

// ── Vue client ──────────────────────────────────────────────────────────

/** Visio du client : ouverte de 15 min avant à 2 h après le début. */
export const OUVERTURE_VISIO_MS = 15 * 60_000;
export const FERMETURE_VISIO_MS = 2 * 3600_000;

/** Ce que voit le titulaire du jeton : son rendez-vous seulement, sans identifiants internes ni jeton. */
export function vueClient(r: Record<string, unknown>, p: ParametresRdv, visioIntegree: boolean, maintenant = Date.now()) {
  const debut = instant(r.debut);
  const statut = String(r.statut);
  const confirme = statut === "CONFIRME";
  return {
    reference: String(r.id),
    debut: new Date(debut).toISOString(),
    dureeMin: Number(r.dureeMin) || p.dureeMin,
    statut,
    nom: String(r.nom),
    objet: String(r.objet ?? "AUTRE"),
    porte: r.porte ? String(r.porte) : null,
    message: r.message ? String(r.message) : null,
    dossierRdv: (r.dossierRdv && typeof r.dossierRdv === "object" ? r.dossierRdv : {}) as Record<string, unknown>,
    visio: {
      integree: visioIntegree,
      ouverture: new Date(debut - OUVERTURE_VISIO_MS).toISOString(),
      fermeture: new Date(debut + FERMETURE_VISIO_MS).toISOString(),
      secours: lienSecours(p, String(r.nom), debut),
    },
    peutModifier: confirme && debut - maintenant > DELAI_MODIF_MS,
  };
}
