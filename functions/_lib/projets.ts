/**
 * Espace projet — logique pure : droits, règles des jalons (points d'arrêt),
 * validation (instantané du référentiel, coches, messages, fichiers, documents
 * types), session des membres (cookie signé).
 *
 * Les jalons d'un projet sont générés dans le back-office depuis le référentiel
 * (apps/web/src/domain/referentiel, `jalonsDuProjet`) puis FIGÉS en base à la
 * création (ProjetJalon.definition + Projet.referentiel) : un projet en cours
 * ne change pas quand le référentiel évolue, et les fonctions n'ont pas à
 * embarquer le référentiel (1,5 Mo de JSON chargé par import.meta.glob).
 *
 * Ce fichier n'exporte aucun gestionnaire onRequest : Pages n'en fait pas une route.
 */
import type { ChampModele, Exigence, ModeleDocument, Norme, PointChecklist, Role } from "../../apps/web/src/domain/referentiel/types";

export type { Role } from "../../apps/web/src/domain/referentiel/types";

export const ROLES: readonly Role[] = [
  "CLIENT", "ARCHITECTE", "BET_STRUCTURE", "BET_FLUIDES", "GEOTECHNICIEN", "TOPOGRAPHE", "BUREAU_CONTROLE", "LABORATOIRE",
  "ENTREPRISE", "SOUS_TRAITANT", "COORDINATEUR_SPS", "ADMINISTRATION", "NOTAIRE", "ADMIN_CITURBAREA",
];
export const STATUTS_JALON = ["A_FAIRE", "EN_COURS", "EN_ATTENTE_VALIDATION", "VALIDE", "BLOQUE", "SANS_OBJET"] as const;
export type StatutJalon = (typeof STATUTS_JALON)[number];
export const NATURES = ["PHOTO", "VIDEO", "DOCUMENT", "PLAN", "PV"] as const;
export type Nature = (typeof NATURES)[number];
export const TYPES_PROJET = ["VILLA", "MAISON", "IMMEUBLE", "MIXTE", "ERP", "LOTISSEMENT"] as const;

export const ID_PROJET_RE = /^prj_[a-z0-9]{8,40}$/;
export const ID_MEMBRE_RE = /^pm_[a-z0-9]{8,40}$/;
export const ID_FICHIER_RE = /^pf_[a-z0-9]{8,40}$/;
export const ID_DOCUMENT_RE = /^pd_[a-z0-9]{8,40}$/;
export const ID_MESSAGE_RE = /^pmsg_[a-z0-9]{8,40}$/;
export const CODE_JALON_RE = /^[A-Za-z0-9_.\-]{3,120}$/;
const ID_POINT_RE = /^[A-Za-z0-9_.\-]{1,80}$/;

/** Identifiant aléatoire (horodatage + 64 bits). */
export function nouvelId(prefixe: "prj_" | "pm_" | "pf_" | "pd_" | "pmsg_" | "pev_"): string {
  const a = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefixe}${Date.now().toString(36)}${a}`;
}

// ── Textes ──────────────────────────────────────────────────────────────

const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const SURROGATE_ISOLE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const BALISE = /<\/?[a-zA-Z!][^<>]*>/g;

/** Texte nettoyé : sans caractères de contrôle ni balises HTML, borné (en caractères). */
export function nettoyer(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const s = v.replace(/\r\n?/g, "\n").replace(CONTROLE, "").replace(SURROGATE_ISOLE, "�").replace(BALISE, "").trim();
  return Array.from(s).slice(0, max).join("");
}

/** Nom de fichier affichable : sans chemin ni caractères spéciaux. */
export function nomFichier(v: unknown): string {
  const s = nettoyer(v, 150).replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ");
  return s && s !== "." && s !== ".." ? s : "fichier";
}

// ── Instantané du référentiel ───────────────────────────────────────────

export type DefJalon = {
  code: string; phase: string; phaseGabarit?: string; niveau?: string; lot?: string; ordre: number;
  titre: string; objectif: string; prerequis: string[]; acteurs: Role[]; validateurs: Role[];
  exigences: string[]; checklist: PointChecklist[]; documents: string[]; pointArret: boolean;
};
export type Dictionnaire = {
  exigences: Record<string, Exigence>; normes: Record<string, Norme>; modeles: Record<string, ModeleDocument>; phases: Record<string, string>;
};
export type Caracteristiques = {
  type: (typeof TYPES_PROJET)[number]; sousSols: number; etagesHorsSol: number; hauteurM?: number; zoneSismique?: number;
  erp: boolean; ascenseur: boolean; piscine: boolean;
};

const estObjet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const roles = (v: unknown): Role[] | null => (Array.isArray(v) && v.length <= ROLES.length && v.every((r) => ROLES.includes(r as Role)) ? [...new Set(v as Role[])] : null);
const chaines = (v: unknown, max: number, re?: RegExp): string[] | null =>
  v === undefined ? [] : Array.isArray(v) && v.length <= max && v.every((x) => typeof x === "string" && x.length <= 200 && (!re || re.test(x))) ? (v as string[]) : null;
const taille = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).length;

export const MAX_JALONS = 2000;
export const MAX_OCTETS_INSTANTANE = 8 * 1024 * 1024;

export function validerCaracteristiques(v: unknown): Caracteristiques | null {
  if (!estObjet(v) || !TYPES_PROJET.includes(v.type as never)) return null;
  const entier = (x: unknown, max: number) => (x === undefined || x === null || x === "" ? 0 : Number.isInteger(Number(x)) && Number(x) >= 0 && Number(x) <= max ? Number(x) : NaN);
  const sousSols = entier(v.sousSols, 6), etagesHorsSol = entier(v.etagesHorsSol, 60);
  if (Number.isNaN(sousSols) || Number.isNaN(etagesHorsSol)) return null;
  const c: Caracteristiques = { type: v.type as Caracteristiques["type"], sousSols, etagesHorsSol, erp: v.erp === true, ascenseur: v.ascenseur === true, piscine: v.piscine === true };
  if (v.hauteurM !== undefined && v.hauteurM !== null && v.hauteurM !== "") {
    const h = Number(v.hauteurM);
    if (!Number.isFinite(h) || h < 0 || h > 400) return null;
    c.hauteurM = Math.round(h * 10) / 10;
  }
  if (v.zoneSismique !== undefined && v.zoneSismique !== null && v.zoneSismique !== "") {
    const z = Number(v.zoneSismique);
    if (!Number.isInteger(z) || z < 0 || z > 4) return null;
    c.zoneSismique = z;
  }
  return c;
}

/**
 * Contrôle de l'instantané envoyé par le back-office : forme, rôles, références
 * internes. Les prérequis hors projet (jalons non applicables) sont retirés.
 */
export function validerInstantane(jalons: unknown, dico: unknown): { ok: true; jalons: DefJalon[]; dictionnaire: Dictionnaire } | { ok: false; erreur: string } {
  if (!Array.isArray(jalons) || jalons.length > MAX_JALONS) return { ok: false, erreur: "jalons_invalides" };
  if (!estObjet(dico)) return { ok: false, erreur: "dictionnaire_invalide" };
  if (taille({ jalons, dico }) > MAX_OCTETS_INSTANTANE) return { ok: false, erreur: "instantane_trop_gros" };
  const d: Dictionnaire = {
    exigences: estObjet(dico.exigences) ? (dico.exigences as Dictionnaire["exigences"]) : {},
    normes: estObjet(dico.normes) ? (dico.normes as Dictionnaire["normes"]) : {},
    modeles: estObjet(dico.modeles) ? (dico.modeles as Dictionnaire["modeles"]) : {},
    phases: estObjet(dico.phases) ? (dico.phases as Dictionnaire["phases"]) : {},
  };
  for (const m of Object.values(d.modeles)) if (!estObjet(m) || !Array.isArray(m.sections) || !roles(m.signataires)) return { ok: false, erreur: "modele_invalide" };
  const codes = new Set<string>();
  const out: DefJalon[] = [];
  for (const j of jalons) {
    if (!estObjet(j) || typeof j.code !== "string" || !CODE_JALON_RE.test(j.code) || codes.has(j.code)) return { ok: false, erreur: "jalon_invalide" };
    codes.add(j.code);
    const acteurs = roles(j.acteurs), validateurs = roles(j.validateurs);
    const prerequis = chaines(j.prerequis, 50, CODE_JALON_RE), documents = chaines(j.documents, 50), exigences = chaines(j.exigences, 300);
    if (!acteurs || !validateurs || !prerequis || !documents || !exigences) return { ok: false, erreur: `jalon_invalide:${j.code}` };
    if (typeof j.phase !== "string" || typeof j.titre !== "string" || !Array.isArray(j.checklist) || j.checklist.length > 300) return { ok: false, erreur: `jalon_invalide:${j.code}` };
    const ids = new Set<string>();
    for (const p of j.checklist as unknown[]) {
      if (!estObjet(p) || typeof p.id !== "string" || !ID_POINT_RE.test(p.id) || ids.has(p.id) || !ROLES.includes(p.responsable as Role)) return { ok: false, erreur: `point_invalide:${j.code}` };
      ids.add(p.id);
    }
    if (documents.some((x) => !d.modeles[x])) return { ok: false, erreur: `modele_inconnu:${j.code}` };
    if (taille(j) > 128 * 1024) return { ok: false, erreur: `jalon_trop_gros:${j.code}` };
    out.push({
      code: j.code, phase: j.phase, ordre: Number(j.ordre) || 0, titre: nettoyer(j.titre, 300), objectif: nettoyer(j.objectif, 2000),
      ...(typeof j.phaseGabarit === "string" ? { phaseGabarit: j.phaseGabarit } : {}),
      ...(typeof j.niveau === "string" ? { niveau: nettoyer(j.niveau, 40) } : {}),
      ...(typeof j.lot === "string" ? { lot: j.lot } : {}),
      prerequis, acteurs, validateurs, exigences, documents, checklist: j.checklist as PointChecklist[], pointArret: j.pointArret === true,
    });
  }
  for (const j of out) j.prerequis = j.prerequis.filter((c) => codes.has(c) && c !== j.code);
  return { ok: true, jalons: out, dictionnaire: d };
}

// ── Acteurs et droits ───────────────────────────────────────────────────

export type Acteur =
  | { kind: "admin"; email: string }
  | { kind: "membre"; id: string; projetId: string; role: Role; nom: string };

export const roleDe = (a: Acteur): Role => (a.kind === "admin" ? "ADMIN_CITURBAREA" : a.role);
export const nomDe = (a: Acteur): string => (a.kind === "admin" ? "CITURBAREA (administration)" : a.nom);
export const libelleAuteur = (a: Acteur): string => (a.kind === "admin" ? `admin:${a.email || "cabinet"}` : `membre:${a.id}`);

/** Architecte du projet ou administration : tous les droits. */
export const superviseur = (a: Acteur) => a.kind === "admin" || a.role === "ARCHITECTE" || a.role === "ADMIN_CITURBAREA";

type JalonDroits = Pick<DefJalon, "acteurs" | "validateurs" | "pointArret">;

/** Le rôle est-il acteur ou validateur du jalon ? */
export const participe = (a: Acteur, j: JalonDroits) => superviseur(a) || j.acteurs.includes(roleDe(a)) || j.validateurs.includes(roleDe(a));

/** Écrire dans la discussion / déposer une photo : client partout, prestataire sur ses jalons. */
export const peutContribuer = (a: Acteur, j: JalonDroits | null) => superviseur(a) || roleDe(a) === "CLIENT" || (!!j && participe(a, j));

/** Cocher un point : client = ses propres points ; prestataire = jalons où il intervient. */
export function peutCocher(a: Acteur, j: JalonDroits, p: Pick<PointChecklist, "responsable">): boolean {
  if (superviseur(a)) return true;
  if (roleDe(a) === "CLIENT") return p.responsable === "CLIENT";
  return participe(a, j);
}

/** Créer / remplir un document type. */
export const peutRediger = (a: Acteur, j: JalonDroits) => superviseur(a) || (roleDe(a) !== "CLIENT" && participe(a, j));

/** Signer : rôle signataire du modèle, ou superviseur. */
export const peutSigner = (a: Acteur, m: Pick<ModeleDocument, "signataires">) => superviseur(a) || m.signataires.includes(roleDe(a));

export type EtatJalon = { code: string; statut: StatutJalon; definition: Pick<DefJalon, "pointArret"> };

/** Points d'arrêt prérequis non levés (ni VALIDE ni SANS_OBJET) : ils bloquent le passage à VALIDE. */
export function pointsArretBloquants(j: Pick<DefJalon, "prerequis">, etats: Map<string, EtatJalon>): string[] {
  return j.prerequis.filter((c) => {
    const e = etats.get(c);
    return !!e && e.definition.pointArret && e.statut !== "VALIDE" && e.statut !== "SANS_OBJET";
  });
}

/**
 * Changement de statut. Superviseur : tout ; validateur : VALIDE (sauf point
 * d'arrêt, réservé à l'architecte) ; acteur : A_FAIRE ↔ EN_COURS ↔ EN_ATTENTE_VALIDATION.
 * Seul un superviseur rouvre un jalon VALIDE, BLOQUE ou SANS_OBJET.
 */
export function peutChangerStatut(a: Acteur, j: JalonDroits, de: StatutJalon, vers: StatutJalon): boolean {
  if (superviseur(a)) return true;
  if (de === "VALIDE" || de === "BLOQUE" || de === "SANS_OBJET") return false;
  if (vers === "BLOQUE" || vers === "SANS_OBJET") return false;
  if (vers === "VALIDE") return !j.pointArret && j.validateurs.includes(roleDe(a));
  return participe(a, j);
}

export type Verdict = { ok: true } | { ok: false; status: number; erreur: string; bloquants?: string[] };

/** Règle complète, appliquée côté serveur avant tout UPDATE de statut. */
export function verifierTransition(a: Acteur, j: DefJalon, de: StatutJalon, vers: StatutJalon, etats: Map<string, EtatJalon>): Verdict {
  if (!STATUTS_JALON.includes(vers)) return { ok: false, status: 400, erreur: "statut_invalide" };
  if (!peutChangerStatut(a, j, de, vers)) return { ok: false, status: 403, erreur: "interdit" };
  if (vers === "VALIDE") {
    const b = pointsArretBloquants(j, etats);
    if (b.length) return { ok: false, status: 409, erreur: "point_arret_non_leve", bloquants: b };
  }
  return { ok: true };
}

// ── Coche d'un point ────────────────────────────────────────────────────

export type EtatPoint = { fait: boolean; par: string; role: Role; le: string; preuveIds: string[]; commentaire: string };

export function validerCoche(v: unknown): { pointId: string; fait: boolean; preuveIds: string[]; commentaire: string } | null {
  if (!estObjet(v) || typeof v.id !== "string" || !ID_POINT_RE.test(v.id) || typeof v.fait !== "boolean") return null;
  const preuves = chaines(v.preuveIds, 20, ID_FICHIER_RE);
  if (!preuves) return null;
  return { pointId: v.id, fait: v.fait, preuveIds: [...new Set(preuves)], commentaire: nettoyer(v.commentaire, 1000) };
}

// ── Messages ────────────────────────────────────────────────────────────

export const MESSAGE_MAX = 4000;
export function validerMessage(v: unknown): { texte: string; pieceIds: string[] } | null {
  if (!estObjet(v)) return null;
  const texte = nettoyer(v.texte, MESSAGE_MAX);
  const pieces = chaines(v.pieceIds, 10, ID_FICHIER_RE);
  if (!pieces || (!texte && !pieces.length)) return null;
  return { texte, pieceIds: [...new Set(pieces)] };
}

// ── Fichiers ────────────────────────────────────────────────────────────

type Famille = "image" | "video" | "pdf" | "office";
/** Liste blanche des types MIME acceptés. */
export const TYPES_FICHIER: Record<string, Famille> = {
  "image/jpeg": "image", "image/png": "image", "image/webp": "image", "image/heic": "image", "image/heif": "image",
  "video/mp4": "video", "video/quicktime": "video", "video/webm": "video", "video/3gpp": "video",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "office",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "office",
};

export interface EnvFichiers { FICHIERS_MAX_PHOTO_MO?: string; FICHIERS_MAX_VIDEO_MO?: string; FICHIERS_MAX_DOCUMENT_MO?: string }
export type Limites = { photo: number; video: number; document: number };
const MO = 1024 * 1024;
export function limites(env: EnvFichiers = {}): Limites {
  const lire = (v: string | undefined, d: number) => (v && Number(v) > 0 && Number(v) <= 1000 ? Number(v) : d) * MO;
  return { photo: lire(env.FICHIERS_MAX_PHOTO_MO, 15), video: lire(env.FICHIERS_MAX_VIDEO_MO, 200), document: lire(env.FICHIERS_MAX_DOCUMENT_MO, 30) };
}

export function validerFichier(f: { type: string; taille: number; nature?: string | null }, l: Limites): { ok: true; type: string; nature: Nature } | { ok: false; status: number; erreur: string } {
  const type = (f.type || "").split(";")[0].trim().toLowerCase();
  const famille = TYPES_FICHIER[type];
  if (!famille) return { ok: false, status: 415, erreur: "type_refuse" };
  if (!Number.isInteger(f.taille) || f.taille <= 0) return { ok: false, status: 411, erreur: "taille_requise" };
  const max = famille === "image" ? l.photo : famille === "video" ? l.video : l.document;
  if (f.taille > max) return { ok: false, status: 413, erreur: "trop_gros" };
  const declaree = NATURES.includes(f.nature as Nature) ? (f.nature as Nature) : null;
  let nature: Nature;
  if (famille === "video") nature = "VIDEO";
  else if (famille === "image") nature = declaree && declaree !== "VIDEO" ? declaree : "PHOTO";
  else nature = declaree && declaree !== "PHOTO" && declaree !== "VIDEO" ? declaree : "DOCUMENT";
  return { ok: true, type, nature };
}

/** Affiché dans le navigateur (images, vidéos, PDF) ; le reste est téléchargé. */
export const enLigne = (type: string) => /^(image|video)\//.test(type) || type === "application/pdf";

// ── Documents types (PV) ────────────────────────────────────────────────

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const VALEURS_MAX_OCTETS = 64 * 1024;

function valeurChamp(c: ChampModele, x: unknown): unknown {
  switch (c.type) {
    case "texte": return nettoyer(x, 500) || undefined;
    case "texte_long": return nettoyer(x, 5000) || undefined;
    case "nombre": { const n = typeof x === "number" ? x : typeof x === "string" && x.trim() ? Number(x.replace(",", ".")) : NaN; return Number.isFinite(n) && Math.abs(n) < 1e12 ? n : undefined; }
    case "date": return typeof x === "string" && DATE_RE.test(x) ? x : undefined;
    case "case": return typeof x === "boolean" ? x : undefined;
    case "choix": return typeof x === "string" && (c.options ?? []).includes(x) ? x : undefined;
    case "photo": { const l = chaines(Array.isArray(x) ? x : x ? [x] : [], 20, ID_FICHIER_RE); return l && l.length ? l : undefined; }
    case "tableau": {
      if (!Array.isArray(x)) return undefined;
      const n = Math.max(1, (c.colonnes ?? []).length);
      const lignes = x.slice(0, 200).filter(Array.isArray).map((l) => Array.from({ length: n }, (_, i) => nettoyer((l as unknown[])[i], 500)));
      const pleines = lignes.filter((l) => l.some(Boolean));
      return pleines.length ? pleines : undefined;
    }
    case "signature": return undefined; // les signatures passent par « signer » (horodatage + membre connecté)
    default: return undefined;
  }
}

/** Ne garde que les champs du modèle, typés et bornés. */
export function filtrerValeurs(m: ModeleDocument, v: unknown): Record<string, unknown> | null {
  if (!estObjet(v)) return null;
  const o: Record<string, unknown> = {};
  for (const s of m.sections ?? []) for (const c of s.champs ?? []) {
    if (!(c.id in v)) continue;
    const x = valeurChamp(c, v[c.id]);
    if (x !== undefined) o[c.id] = x;
  }
  return taille(o) <= VALEURS_MAX_OCTETS ? o : null;
}

export type Signature = { membreId: string | null; nom: string; role: Role; le: string };

/** Ajoute la signature de l'acteur ; SIGNE quand tous les rôles signataires ont signé. */
export function signer(m: ModeleDocument, signatures: Signature[], a: Acteur, maintenant = new Date().toISOString()): { ok: true; signatures: Signature[]; statut: "BROUILLON" | "SIGNE" } | { ok: false; status: number; erreur: string } {
  if (!peutSigner(a, m)) return { ok: false, status: 403, erreur: "interdit" };
  const id = a.kind === "membre" ? a.id : null;
  const role = roleDe(a);
  if (signatures.some((s) => (id ? s.membreId === id : s.membreId === null && s.role === role))) return { ok: false, status: 409, erreur: "deja_signe" };
  const out = [...signatures, { membreId: id, nom: nomDe(a), role, le: maintenant }];
  const signes = new Set(out.map((s) => s.role));
  return { ok: true, signatures: out, statut: m.signataires.every((r) => signes.has(r)) ? "SIGNE" : "BROUILLON" };
}

// ── Session des membres (cookie signé) ──────────────────────────────────

export const COOKIE_PROJET = "projet_session";
export const DUREE_SESSION_S = 30 * 24 * 3600;
const enc = new TextEncoder();
const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export interface EnvSession { PROJET_SESSION_SECRET?: string; ADMIN_SESSION_SECRET?: string }
/** Secret de signature (≥ 32 caractères) ; à défaut celui du back-office (séparé par le préfixe « projet: »). */
export function secretSession(env: EnvSession): string | null {
  const s = (env.PROJET_SESSION_SECRET || env.ADMIN_SESSION_SECRET || "").trim();
  return s.length >= 32 ? s : null;
}

async function mac(secret: string, donnees: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`projet:${donnees}`))));
}

/**
 * Cookie = p1.<exp>.<membreId>.<empreinte>.<hmac>. L'empreinte (16 premiers
 * caractères du hash du jeton) invalide les sessions quand le lien est régénéré.
 */
export async function creerSession(membreId: string, jetonHash: string, secret: string, maintenant = Date.now()): Promise<string> {
  const corps = `p1.${Math.floor(maintenant / 1000) + DUREE_SESSION_S}.${membreId}.${jetonHash.slice(0, 16)}`;
  return `${corps}.${await mac(secret, corps)}`;
}

export async function lireSession(valeur: string, secret: string, maintenant = Date.now()): Promise<{ membreId: string; empreinte: string } | null> {
  const p = valeur.split(".");
  if (p.length !== 5 || p[0] !== "p1" || !/^\d+$/.test(p[1]) || !ID_MEMBRE_RE.test(p[2]) || !/^[0-9a-f]{16}$/.test(p[3])) return null;
  const attendu = await mac(secret, p.slice(0, 4).join("."));
  if (attendu.length !== p[4].length) return null;
  let d = 0;
  for (let i = 0; i < attendu.length; i++) d |= attendu.charCodeAt(i) ^ p[4].charCodeAt(i);
  if (d !== 0) return null;
  const exp = Number(p[1]), s = Math.floor(maintenant / 1000);
  if (exp < s || exp > s + DUREE_SESSION_S + 60) return null;
  return { membreId: p[2], empreinte: p[3] };
}

export const cookieSession = (valeur: string, maxAge: number) =>
  `${COOKIE_PROJET}=${valeur}; Path=/api/projets; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

export function cookieDe(req: Request): string {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE_PROJET}=([^;]+)`).exec(req.headers.get("cookie") || "");
  return m ? m[1] : "";
}
