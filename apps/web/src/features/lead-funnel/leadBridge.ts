/**
 * leadBridge.ts — seul endroit du front qui décide où part un lead.
 *
 * submitLead(input) :
 *   1. POST /api/lead-funnel/capture   TOUJOURS, en premier. Chemin relatif :
 *      l'API en dev (proxy Vite), la Pages Function Cloudflare en production —
 *      donc disponible même API éteinte.
 *   2. POST <apiBase>/p2/intake         best-effort, seulement si la sonde dit
 *      que l'API répond : apporte le Dossier et le compte client.
 *
 * Garanties :
 *   - non bloquant : les deux envois sont des promesses séparées, la capture
 *     part en `keepalive` (survit à la navigation / fermeture d'onglet) ;
 *   - file de reprise : la capture est écrite dans localStorage AVANT l'envoi,
 *     retirée au succès ou sur un 400 de validation, rejouée au démarrage de
 *     l'app et au retour en ligne ;
 *   - idempotence : clé porte + téléphone normalisé ; un leadId déjà obtenu
 *     pour la clé n'est jamais redemandé.
 */

import { useEffect, useState } from "react";
import { apiBase } from "../../tomes/tome4/apiClient";
import { getStoredLang } from "../../i18n/i18n";

export type Porte = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";

/** Corps de POST /api/lead-funnel/capture (cf. lead-funnel.types.ts côté API). */
export interface CaptureBody {
  nom: string;
  telephone: string;
  email?: string;
  projetType?: string;
  budget?: number;
  ville?: string;
  surface?: number;
  delaiMois?: number;
  source: string;
  lang: "fr" | "ar" | "en";
  pageContext?: string;
  utm?: Record<string, string>;
  meta?: { projetLibre?: string; wizard?: Record<string, unknown> };
  /** Pot de miel : laissé vide par un humain. */
  website?: string;
  /**
   * Clé d'idempotence d'UNE soumission : identique à chaque rejeu. L'API
   * renvoie le lead existant au lieu d'en créer un second (un fetch annulé
   * au rechargement peut avoir déjà atteint le serveur).
   */
  idempotencyKey?: string;
}

export type CaptureOutcome =
  | { status: "sent"; leadId: string; score?: number }
  | { status: "already"; leadId?: string }
  | { status: "queued" }
  | { status: "invalid"; code: string };

export interface IntakeOutcome {
  dossierId?: string;
  accessToken?: string;
  message?: string;
}

const QUEUE_KEY = "citurbarea:lead-funnel:queue:v1";
const SENT_KEY = "citurbarea:lead-funnel:sent:v1";
const UTM_KEY = "citurbarea:lead-funnel:utm:v1";
const CAPTURE_URL = "/api/lead-funnel/capture";
const QUEUE_MAX = 20;
const QUEUE_TTL_MS = 60 * 86400_000;
const CAPTURE_TIMEOUT_MS = 10_000;
const INTAKE_TIMEOUT_MS = 20_000;
const PROBE_TIMEOUT_MS = 3_000;
const WIZARD_MAX_BYTES = 8 * 1024;
const WIZARD_STR_MAX = 500;

/** sendingAt : envoi en cours (ms) — verrou partagé entre pages / onglets. */
type QueueItem = { key: string; body: CaptureBody; queuedAt: string; tries: number; sendingAt?: number };
type SentEntry = { leadId: string; at: string };

// ── Stockage ──────────────────────────────────────────────────────────

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota / mode privé */ }
}

const readQueue = () => readJson<QueueItem[]>(QUEUE_KEY, []);
const readSent = () => readJson<Record<string, SentEntry>>(SENT_KEY, {});

function enqueue(key: string, body: CaptureBody): void {
  const q = readQueue().filter((x) => x.key !== key);
  // Écrit déjà « en cours d'envoi » : la capture part juste après.
  q.push({ key, body, queuedAt: new Date().toISOString(), tries: 0, sendingAt: Date.now() });
  writeJson(QUEUE_KEY, q.slice(-QUEUE_MAX));
}

// Au-delà, un envoi « en cours » est considéré comme perdu (onglet fermé…).
const VERROU_MS = CAPTURE_TIMEOUT_MS + 5_000;

/** Prend le verrou d'envoi d'un élément ; faux si une autre page l'a déjà. */
function prendreVerrou(key: string): boolean {
  const q = readQueue();
  const it = q.find((x) => x.key === key);
  if (!it) return false;
  if (it.sendingAt && Date.now() - it.sendingAt < VERROU_MS) return false;
  it.sendingAt = Date.now();
  writeJson(QUEUE_KEY, q);
  return true;
}

function dequeue(key: string): void {
  writeJson(QUEUE_KEY, readQueue().filter((x) => x.key !== key));
}

/** Échec réseau : on libère le verrou pour un prochain rejeu. */
function bumpTries(key: string): void {
  writeJson(QUEUE_KEY, readQueue().map((x) => (x.key === key ? { ...x, tries: x.tries + 1, sendingAt: undefined } : x)));
}

function markSent(key: string, leadId: string): void {
  const s = readSent();
  s[key] = { leadId, at: new Date().toISOString() };
  writeJson(SENT_KEY, s);
}

// ── Identité d'un lead ────────────────────────────────────────────────

/** Téléphone réduit à ses chiffres, format national marocain (06…). */
export function normalizePhone(t: string | undefined): string {
  let d = String(t || "").replace(/\D/g, "");
  if (d.startsWith("00212")) d = d.slice(5);
  else if (d.startsWith("212") && d.length === 12) d = d.slice(3);
  if (d.length === 9) d = "0" + d;
  return d;
}

export function leadKey(porte: string | undefined, telephone: string): string {
  return `${porte || "GEN"}:${normalizePhone(telephone)}`;
}

/** Vrai si la capture a déjà abouti ou attend dans la file de reprise. */
export function hasSubmittedLead(key: string): boolean {
  return !!readSent()[key] || readQueue().some((x) => x.key === key);
}

// ── Réseau ────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

type PostResult =
  | { kind: "sent"; leadId: string; score?: number }
  | { kind: "invalid"; code: string }
  | { kind: "retry" };

async function postCapture(body: CaptureBody): Promise<PostResult> {
  try {
    const res = await fetchWithTimeout(
      CAPTURE_URL,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true },
      CAPTURE_TIMEOUT_MS,
    );
    let json: any = null;
    try { json = await res.json(); } catch { /* réponse non JSON : pas de fonction derrière */ }
    if (res.ok && json?.ok && json.leadId) {
      return { kind: "sent", leadId: String(json.leadId), score: Number(json.scoreInitial) || 0 };
    }
    // Seul un 400 de validation est définitif ; tout le reste se rejoue.
    // Le GlobalExceptionFilter de l'API renvoie { error: "<code>" }.
    if (res.status === 400) return { kind: "invalid", code: String(json?.error || json?.message || "payload_invalid") };
    return { kind: "retry" };
  } catch {
    return { kind: "retry" };
  }
}

const inflight = new Set<string>();

function nouvelleCle(): string {
  try { if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID(); } catch { /* contexte non sécurisé */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Envoie la capture d'un lead (écriture en file AVANT l'envoi). */
export async function captureLead(key: string, body: CaptureBody): Promise<CaptureOutcome> {
  const sent = readSent()[key];
  if (sent) {
    dequeue(key);
    return { status: "already", leadId: sent.leadId };
  }
  // Même soumission encore en file : on garde sa clé d'idempotence.
  const enFile = readQueue().find((x) => x.key === key);
  body = { ...body, idempotencyKey: enFile?.body.idempotencyKey || body.idempotencyKey || nouvelleCle() };
  enqueue(key, body);
  if (inflight.has(key)) return { status: "queued" };
  inflight.add(key);
  try {
    const r = await postCapture(body);
    if (r.kind === "sent") {
      dequeue(key);
      markSent(key, r.leadId);
      return { status: "sent", leadId: r.leadId, score: r.score };
    }
    if (r.kind === "invalid") {
      dequeue(key);
      return { status: "invalid", code: r.code };
    }
    bumpTries(key);
    return { status: "queued" };
  } finally {
    inflight.delete(key);
  }
}

let replaying = false;

/** Rejoue la file de reprise. Appelé au démarrage de l'app et au retour en ligne. */
export async function replayLeadQueue(): Promise<void> {
  if (replaying) return;
  replaying = true;
  try {
    const now = Date.now();
    const items = readQueue().filter((x) => now - Date.parse(x.queuedAt) < QUEUE_TTL_MS);
    writeJson(QUEUE_KEY, items);
    for (const it of items) {
      if (inflight.has(it.key)) continue;
      if (readSent()[it.key]) { dequeue(it.key); continue; }
      // Une autre page (ou l'onglet précédent) envoie peut-être déjà cet élément.
      if (!prendreVerrou(it.key)) continue;
      inflight.add(it.key);
      try {
        const r = await postCapture(it.body);
        if (r.kind === "sent") { dequeue(it.key); markSent(it.key, r.leadId); }
        else if (r.kind === "invalid") dequeue(it.key);
        else { bumpTries(it.key); break; } // réseau toujours absent : inutile d'insister
      } finally {
        inflight.delete(it.key);
      }
    }
  } finally {
    replaying = false;
  }
}

let probe: Promise<boolean> | null = null;

/** Sonde légère de l'API, faite une fois et mémorisée pour la page. */
export function apiAvailable(): Promise<boolean> {
  if (!probe) {
    probe = fetchWithTimeout(`${apiBase()}/health`, { cache: "no-store" }, PROBE_TIMEOUT_MS)
      .then(async (r) => {
        if (!r.ok) return false;
        const j = await r.json().catch(() => null);
        return !!(j && j.ok === true);
      })
      .catch(() => false);
  }
  return probe;
}

export function useApiStatus(): "unknown" | "up" | "down" {
  const [status, setStatus] = useState<"unknown" | "up" | "down">("unknown");
  useEffect(() => {
    let alive = true;
    apiAvailable().then((ok) => { if (alive) setStatus(ok ? "up" : "down"); });
    return () => { alive = false; };
  }, []);
  return status;
}

/** Crée le Dossier via /p2/intake. null si l'API est absente ou refuse. */
export async function sendIntake(payload: Record<string, unknown>, token?: string | null): Promise<IntakeOutcome | null> {
  if (!(await apiAvailable())) return null;
  try {
    const res = await fetchWithTimeout(
      `${apiBase()}/p2/intake`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      },
      INTAKE_TIMEOUT_MS,
    );
    const data: any = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return null;
    return { dossierId: data.dossierId || undefined, accessToken: data.access_token || undefined, message: data.message };
  } catch {
    return null;
  }
}

/**
 * Point de sortie d'un lead. La capture est lancée en premier ; l'appelant
 * n'attend que ce dont il a besoin (souvent l'intake, borné par la sonde).
 */
export function submitLead(input: {
  key: string;
  capture: CaptureBody;
  intake?: Record<string, unknown>;
  token?: string | null;
}): { capture: Promise<CaptureOutcome>; intake: Promise<IntakeOutcome | null> } {
  const capture = captureLead(input.key, input.capture);
  const intake = input.intake ? sendIntake(input.intake, input.token) : Promise.resolve(null);
  return { capture, intake };
}

// ── Contexte : langue, page, UTM ─────────────────────────────────────

export function rememberUtm(): void {
  try {
    const p = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    p.forEach((v, k) => { if (/^utm_/i.test(k) && v) utm[k.slice(4).toLowerCase()] = v.slice(0, 200); });
    if (Object.keys(utm).length) sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
  } catch { /* hors navigateur */ }
}

export function currentUtm(): Record<string, string> | undefined {
  rememberUtm();
  try {
    const raw = sessionStorage.getItem(UTM_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function contexte(): Pick<CaptureBody, "lang" | "pageContext" | "utm"> {
  return {
    lang: getStoredLang(),
    pageContext: typeof window !== "undefined" ? window.location.pathname : undefined,
    utm: currentUtm(),
  };
}

// ── meta.wizard : filtrage et borne ──────────────────────────────────

// Pièces de dossier contractuel : elles restent dans le draft local et dans
// Dossier (/p2/intake), jamais dans la table de prospection. Noms de champs
// d'écran et leurs équivalents de draft / de brief.
const EXCLUS = new Set([
  "q_phys_id_number", "q_phys_id_type", "q_company_ice", "q_company_rc", "q_tf_number", "rc", "ice",
  "physidnumber", "physidtype", "companyice", "companyrc", "tfnumber",
  "titrefonciernum", "titlefoncier", "patente", "agrementmetlenumero",
]);
// Coordonnées déjà portées en tête du lead : inutile de les dupliquer.
const CONTACT = new Set(["clientnom", "clienttel", "clientemail", "firstname", "lastname", "phone", "email"]);

// Postgres refuse en jsonb le caractère nul et les demi-paires UTF-16 (22P05) :
// on les retire, et on coupe par caractère réel pour ne jamais scinder un emoji.
const SURROGATE_ISOLE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function texte(s: string): string {
  const propre = s.replace(/\u0000/g, "").replace(SURROGATE_ISOLE, "�");
  const car = Array.from(propre);
  return car.length > WIZARD_STR_MAX ? car.slice(0, WIZARD_STR_MAX).join("") : propre;
}

function nettoyer(v: unknown, profondeur: number): unknown {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") return texte(v);
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "boolean") return v;
  if (profondeur >= 4) return undefined;
  if (Array.isArray(v)) {
    return v.slice(0, 50).map((x) => nettoyer(x, profondeur + 1)).filter((x) => x !== undefined);
  }
  if (typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      const lk = k.toLowerCase();
      if (EXCLUS.has(lk) || (profondeur === 0 && CONTACT.has(lk))) continue;
      const c = nettoyer(x, profondeur + 1);
      if (c !== undefined && c !== "") o[k] = c;
    }
    return o;
  }
  return undefined;
}

const octets = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).length;

/** Filtre les pièces sensibles, coupe les chaînes, borne à 8 Ko (tronque, ne rejette pas). */
export function sanitizeWizard(src: Record<string, unknown>): Record<string, unknown> {
  const out = (nettoyer(src, 0) || {}) as Record<string, unknown>;
  const retires: string[] = [];
  while (octets(out) > WIZARD_MAX_BYTES) {
    const cles = Object.keys(out).filter((k) => k !== "_tronque");
    if (!cles.length) break;
    const plusGros = cles.reduce((a, b) => (octets(out[a]) >= octets(out[b]) ? a : b));
    delete out[plusGros];
    retires.push(plusGros);
    out._tronque = retires;
  }
  return out;
}

// ── Mappers : draft de porte → capture ───────────────────────────────

// Délai déclaré → mois (point milieu de la tranche ; < 6 = projet immédiat
// au sens de lead-scoring.ts). « flexible » et vide : non renseigné.
const DELAI_MOIS: Record<string, number> = {
  // P1 (q_timeline)
  immediate: 0, lt3m: 2, "3-6m": 4.5, gt6m: 9,
  // P2 (timeline)
  "0-6m": 3, "6-12m": 9, "12-24m": 18, "24m+": 30,
};

export function delaiMoisDepuis(timeline: string | undefined): number | undefined {
  return timeline ? DELAI_MOIS[timeline] : undefined;
}

function positif(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Montant d'un devis serveur, quelle que soit sa forme (P2/P3 honoraires, P4/P5 amounts). */
export function montantDevis(q: any): number | undefined {
  return positif(q?.honoraires?.totalTTC) ?? positif(q?.amounts?.totalTTC);
}

/** P1 : draft local (+ valeurs d'écran) → capture. */
export function captureFromP1(d: Record<string, any>): { key: string; body: CaptureBody } {
  const telephone = String(d.phone || "").trim();
  const body: CaptureBody = {
    nom: [d.firstname, d.lastname].filter(Boolean).join(" ").trim() || String(d.companyName || "").trim(),
    telephone,
    email: d.email || undefined,
    projetType: "P1",
    budget: positif(d.constructionBudgetMAD) ?? positif(d.budgetMaxMAD) ?? positif(d.budget),
    ville: d.commune || undefined,
    surface: positif(d.terrainArea),
    delaiMois: delaiMoisDepuis(d.timeline),
    source: "WEB_P1_PACKS",
    ...contexte(),
    meta: { wizard: sanitizeWizard(d) },
  };
  return { key: leadKey("P1", telephone), body };
}

/**
 * P2–P6 : payload /p2/intake → capture.
 * budget = budget prévisionnel déclaré par le visiteur (absent → vide, jamais
 * de repli) ; les honoraires calculés vont dans meta.wizard.honoraires.
 */
export function captureFromIntake(
  porte: Exclude<Porte, "P1">,
  intake: Record<string, any>,
  opts: { budget?: number | null; honoraires?: number; delaiMois?: number } = {},
): { key: string; body: CaptureBody } {
  const telephone = String(intake.clientTel || "").trim();
  const body: CaptureBody = {
    nom: String(intake.clientNom || intake.representant || intake.raisonSociale || "").trim(),
    telephone,
    email: intake.clientEmail || undefined,
    projetType: porte,
    budget: positif(opts.budget),
    ville: intake.commune || undefined,
    // Selon la porte, la surface est en tête du payload ou seulement dans le brief.
    surface: positif(intake.surfacePlancher) ?? positif(intake.surfaceTerrain)
      ?? positif(intake.brief?.surfacePlancherM2) ?? positif(intake.brief?.surfaceTerrainM2),
    delaiMois: opts.delaiMois,
    source: `WEB_${porte}_WIZARD`,
    ...contexte(),
    meta: { wizard: sanitizeWizard({ ...intake, ...(opts.honoraires ? { honoraires: opts.honoraires } : {}) }) },
  };
  return { key: leadKey(porte, telephone), body };
}

/** À appeler une fois au démarrage : mémorise les UTM et rejoue la file. */
let demarre = false;
export function initLeadBridge(): void {
  if (demarre || typeof window === "undefined") return;
  demarre = true;
  rememberUtm();
  void replayLeadQueue();
  window.addEventListener("online", () => { void replayLeadQueue(); });
}
