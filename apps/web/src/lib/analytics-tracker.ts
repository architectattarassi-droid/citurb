/**
 * analytics-tracker.ts — Client d'instrumentation léger (fire-and-forget).
 *
 * RGPD/Loi 09-08 : sessionId anonyme (UUID localStorage), pas d'IP, pas de
 * fingerprint. Si user connecté + opt-in, on attache userId.
 */
import { apiBase } from "../tomes/tome4/apiClient";

type PorteId = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
type EventType =
  | "view" | "page_leave" | "wizard_start" | "wizard_step" | "wizard_complete"
  | "intake_submit" | "payment_initiated" | "payment_received"
  | "nps_response" | "phase_completed";

const SESSION_KEY = "citurbarea.analytics.sid";

function getSessionId(): string {
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `anon-${Date.now()}`;
  }
}

function optedInUserId(): string | undefined {
  try {
    // opt-in tracking : si le user a accepté + est connecté
    const optIn = localStorage.getItem("citurbarea.analytics.optin") === "1";
    if (!optIn) return undefined;
    const raw = localStorage.getItem("citurbarea.auth.user");
    if (!raw) return undefined;
    return JSON.parse(raw)?.id;
  } catch {
    return undefined;
  }
}

/** Track un événement (silent fail via sendBeacon). */
export function track(type: EventType, payload?: { porte?: PorteId; path?: string; value?: number; meta?: Record<string, any> }): void {
  try {
    const body = JSON.stringify({
      type,
      sessionId: getSessionId(),
      userId: optedInUserId(),
      path: payload?.path ?? (typeof location !== "undefined" ? location.pathname : undefined),
      porte: payload?.porte,
      value: payload?.value,
      meta: payload?.meta,
    });
    const url = `${apiBase()}/api/analytics-hub/event`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    } else {
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* silent */ }
}

/** Helper : détecte la porte depuis un path. */
export function porteFromPath(path: string): PorteId | undefined {
  const m = path.match(/\/p([1-6])\b/i);
  return m ? (`P${m[1]}` as PorteId) : undefined;
}

let premiereVue = true;

/** Auto-track une vue de page (à appeler sur change de route). La première
 *  vue du chargement porte la provenance (origine du référent seulement). */
export function trackView(path: string): void {
  let referrer: string | undefined;
  if (premiereVue) {
    premiereVue = false;
    try {
      const r = document.referrer ? new URL(document.referrer) : null;
      if (r && r.hostname !== location.hostname) referrer = r.hostname;
    } catch { /* référent illisible */ }
  }
  track("view", { path, porte: porteFromPath(path), meta: referrer ? { referrer } : undefined });
}

/**
 * Suivi des formulaires, sans aucune valeur saisie : premier focus sur un
 * champ → wizard_start ; champ modifié → wizard_step { champ: nom du champ }.
 * Une fois par page et par champ. Permet de voir les formulaires commencés
 * puis abandonnés. Renvoie la fonction de nettoyage.
 */
export function suivreFormulaires(estSuivi: (path: string) => boolean): () => void {
  const vus = new Set<string>();
  const nomChamp = (el: Element): string | null => {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) return null;
    if (el instanceof HTMLInputElement && ["hidden", "password", "submit", "button"].includes(el.type)) return null;
    const nom = el.name || el.id || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.tagName.toLowerCase();
    return nom === "website" ? null : nom.slice(0, 60); // « website » = pot de miel
  };
  const surFocus = (e: FocusEvent) => {
    const path = location.pathname;
    if (!estSuivi(path) || !e.target || !nomChamp(e.target as Element) || vus.has(`start:${path}`)) return;
    vus.add(`start:${path}`);
    track("wizard_start", { path, porte: porteFromPath(path) });
  };
  const surChange = (e: Event) => {
    const path = location.pathname;
    const champ = e.target ? nomChamp(e.target as Element) : null;
    if (!estSuivi(path) || !champ || vus.has(`${path}|${champ}`)) return;
    vus.add(`${path}|${champ}`);
    track("wizard_step", { path, porte: porteFromPath(path), meta: { champ } });
  };
  document.addEventListener("focusin", surFocus, true);
  document.addEventListener("change", surChange, true);
  return () => {
    document.removeEventListener("focusin", surFocus, true);
    document.removeEventListener("change", surChange, true);
  };
}

/** Track la sortie d'une page avec le temps passé (ms). */
export function trackPageLeave(path: string, durationMs: number): void {
  if (!path || durationMs < 500) return; // ignore les passages < 0,5s (rebonds techniques)
  track("page_leave", { path, porte: porteFromPath(path), meta: { durationMs: Math.round(durationMs) } });
}
