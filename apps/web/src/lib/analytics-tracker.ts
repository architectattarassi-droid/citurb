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

/** Auto-track une vue de page (à appeler sur change de route). */
export function trackView(path: string): void {
  track("view", { path, porte: porteFromPath(path) });
}

/** Track la sortie d'une page avec le temps passé (ms). */
export function trackPageLeave(path: string, durationMs: number): void {
  if (!path || durationMs < 500) return; // ignore les passages < 0,5s (rebonds techniques)
  track("page_leave", { path, porte: porteFromPath(path), meta: { durationMs: Math.round(durationMs) } });
}
