/**
 * Client API pour l'app admin (sub-domaine admin.citurbarea.com).
 *
 * Toutes les requêtes :
 *  - Envoient le header X-Device-FP (fingerprint client)
 *  - Stockent le sessionToken (pendant login multi-étape) en sessionStorage
 *  - Stockent le JWT final (après FULLY_AUTH) en sessionStorage
 *
 * Session storage (pas localStorage) = effacé à la fermeture du navigateur.
 */

import { apiBase } from "../../tomes/tome4/apiClient";

const SESSION_KEY = "citurbarea.admin.sessionToken";
const JWT_KEY = "citurbarea.admin.jwt";
const FP_KEY = "citurbarea.admin.fingerprint";

// ── Device fingerprint client ──────────────────────────────────

export function computeFingerprint(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const cached = sessionStorage.getItem(FP_KEY);
    if (cached) return cached;
    const canvas = document.createElement("canvas");
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "16px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("CITURBAREA-ADMIN-FP", 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("CITURBAREA-ADMIN-FP", 4, 17);
    }
    const canvasData = canvas.toDataURL();

    const gl = document.createElement("canvas").getContext("webgl") as WebGLRenderingContext | null;
    let glInfo = "no-gl";
    if (gl) {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      glInfo = dbg ? (gl.getParameter((dbg as any).UNMASKED_RENDERER_WEBGL) as string) : (gl.getParameter(gl.RENDERER) as string);
    }

    const raw = JSON.stringify({
      ua: navigator.userAgent,
      lang: navigator.language,
      langs: (navigator.languages || []).join(","),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      tzOffset: new Date().getTimezoneOffset(),
      screen: `${screen.width}x${screen.height}@${(window.devicePixelRatio || 1)}`,
      colorDepth: screen.colorDepth,
      hwc: navigator.hardwareConcurrency || 0,
      platform: (navigator as any).platform || "",
      canvas: canvasData.slice(-256),
      gl: glInfo,
    });
    // Hash simple SHA-256 si disponible
    const fp = simpleHash(raw);
    sessionStorage.setItem(FP_KEY, fp);
    return fp;
  } catch {
    return "fallback-" + Date.now();
  }
}

function simpleHash(str: string): string {
  // Hash FNV-1a 32 bits → hex 16 chars (suffisant pour identité avec sel HMAC serveur)
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let h2 = 0xdeadbeef;
  for (let i = str.length - 1; i >= 0; i--) {
    h2 ^= str.charCodeAt(i);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return (h >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

// ── Storage ─────────────────────────────────────────────────────

export function getSessionToken(): string | null {
  try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
}
export function setSessionToken(t: string | null) {
  try { t ? sessionStorage.setItem(SESSION_KEY, t) : sessionStorage.removeItem(SESSION_KEY); } catch {}
}
export function getAdminJwt(): string | null {
  try { return sessionStorage.getItem(JWT_KEY); } catch { return null; }
}
export function setAdminJwt(t: string | null) {
  try { t ? sessionStorage.setItem(JWT_KEY, t) : sessionStorage.removeItem(JWT_KEY); } catch {}
}

// ── Fetch helper ───────────────────────────────────────────────

async function adminFetch<T>(
  path: string,
  opts: { method?: string; body?: unknown; useJwt?: boolean; useSessionToken?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Device-FP": computeFingerprint(),
  };
  if (opts.useJwt) {
    const tok = getAdminJwt();
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
  } else if (opts.useSessionToken) {
    const tok = getSessionToken();
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
  }

  const res = await fetch(`${apiBase()}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "omit",
  });
  const text = await res.text();
  let json: any;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { error: text }; }
  if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
  return json as T;
}

// ── Auth API ───────────────────────────────────────────────────

export type AuthStepResponse = { sessionToken?: string; step: string; nextStep: string; message: string };
export type FinalLoginResponse = {
  access_token: string;
  expiresAt: string;
  admin: { id: string; email: string; displayName: string; role: string };
};

export const adminAuthApi = {
  login: (email: string, password: string) =>
    adminFetch<{ ok: boolean; data: AuthStepResponse }>("/admin/auth/login", { method: "POST", body: { email, password } }),

  verifyEmailOtp: (code: string) =>
    adminFetch<{ ok: boolean; data: AuthStepResponse }>("/admin/auth/email-otp/verify", { method: "POST", body: { code }, useSessionToken: true }),

  verifySmsOtp: (code: string) =>
    adminFetch<{ ok: boolean; data: AuthStepResponse }>("/admin/auth/sms-otp/verify", { method: "POST", body: { code }, useSessionToken: true }),

  webauthnAuthBegin: () =>
    adminFetch<{ ok: boolean; data: any }>("/admin/auth/webauthn/auth-begin", { method: "POST", body: {}, useSessionToken: true }),

  webauthnAuthFinish: (body: any) =>
    adminFetch<{ ok: boolean; data: FinalLoginResponse }>("/admin/auth/webauthn/auth-finish", { method: "POST", body, useSessionToken: true }),

  webauthnRegisterBegin: (deviceType: string) =>
    adminFetch<{ ok: boolean; data: any }>("/admin/auth/webauthn/register-begin", { method: "POST", body: { deviceType }, useJwt: true }),

  webauthnRegisterFinish: (body: any, deviceType: string) =>
    adminFetch<{ ok: boolean; data: any }>("/admin/auth/webauthn/register-finish", { method: "POST", body: { ...body, deviceType }, useJwt: true }),

  me: () => adminFetch<{ ok: boolean; data: any }>("/admin/auth/me", { useJwt: true }),
  logout: () => adminFetch<{ ok: boolean }>("/admin/auth/logout", { method: "POST", body: {}, useJwt: true }),
};

// ── Dashboard API ─────────────────────────────────────────────

export const adminDashboardApi = {
  kpi: () => adminFetch<any>("/admin/dashboard/kpi", { useJwt: true }),
  audit: (limit = 100, opts?: { category?: string; severity?: string }) => {
    const sp = new URLSearchParams();
    sp.set("limit", String(limit));
    if (opts?.category) sp.set("category", opts.category);
    if (opts?.severity) sp.set("severity", opts.severity);
    return adminFetch<any>(`/admin/dashboard/audit?${sp}`, { useJwt: true });
  },
  verifyAudit: () => adminFetch<any>("/admin/dashboard/audit/verify", { useJwt: true }),
  alerts: (unreadOnly = false) =>
    adminFetch<any>(`/admin/dashboard/alerts?unreadOnly=${unreadOnly}`, { useJwt: true }),
  sessions: () => adminFetch<any>("/admin/dashboard/sessions", { useJwt: true }),
};

// ── Actions API ───────────────────────────────────────────────

export const adminActionsApi = {
  listUsers: (q?: string, limit = 50) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    sp.set("limit", String(limit));
    return adminFetch<any>(`/admin/users?${sp}`, { useJwt: true });
  },
  suspendUser: (userId: string, reason: string) =>
    adminFetch<any>(`/admin/users/${userId}/suspend`, { method: "POST", body: { reason }, useJwt: true }),
  unsuspendUser: (userId: string) =>
    adminFetch<any>(`/admin/users/${userId}/unsuspend`, { method: "POST", body: {}, useJwt: true }),
  suspendCercle: (cercleId: string, reason: string) =>
    adminFetch<any>(`/admin/cercles/${cercleId}/suspend`, { method: "POST", body: { reason }, useJwt: true }),
  deletePost: (postId: string, reason?: string) =>
    adminFetch<any>(`/admin/cercles/posts/${postId}`, { method: "DELETE", body: { reason }, useJwt: true }),
  impersonate: (userId: string, reason: string) =>
    adminFetch<any>(`/admin/impersonate/${userId}`, { method: "POST", body: { reason }, useJwt: true }),
  exportRgpd: (userId: string) =>
    adminFetch<any>(`/admin/export-rgpd/${userId}`, { useJwt: true }),
  listAdmins: () =>
    adminFetch<any>("/admin/admins", { useJwt: true }),
  createSubAdmin: (input: { email: string; displayName: string; phoneE164: string; role: string; initialPassword: string }) =>
    adminFetch<any>("/admin/admins", { method: "POST", body: input, useJwt: true }),
  myIps: () => adminFetch<any>("/admin/my-ips", { useJwt: true }),
  addMyIp: (cidr: string, label: string) =>
    adminFetch<any>("/admin/my-ips", { method: "POST", body: { cidr, label }, useJwt: true }),
  revokeIp: (id: string) =>
    adminFetch<any>(`/admin/my-ips/${id}`, { method: "DELETE", useJwt: true }),
};
