/**
 * TOME@4 — API client (web)
 * Doctrine: front orchestre, backend = source de vérité.
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

export type LoginResponse = {
  access_token: string;
  user: { id: string; email: string; role: string };
};

export type MeResponse = {
  user: {
    userId: string;
    email: string;
    role: string;
    caps?: string[];
    entitlements?: { plan: string; features: Record<string, boolean> };
  };
};

const TOKEN_KEY = "citurbarea.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (!token) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function apiBase(): string {
  // default aligns with apps/api (PORT=4000)
  return (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";
}

export function getCurrentFirmSlug(): string | null {
  if (typeof window === "undefined") return null;
  const parts = window.location.hostname.split(".");
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub !== "www" && sub !== "citurbarea" && sub !== "localhost") return sub;
  }
  return null;
}

export async function apiFetch<T>(
  path: string,
  opts: { method?: HttpMethod; body?: unknown; token?: string | null; headers?: Record<string, string> } = {}
): Promise<T> {
  const url = `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const method = opts.method ?? "GET";
  const token = opts.token ?? getToken();
  const firmSlug = getCurrentFirmSlug();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(firmSlug ? { "X-Firm-Slug": firmSlug } : {}),
    ...(opts.headers ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    // Token expiré ou invalide → clear + redirect login
    if (res.status === 401) {
      setToken(null);
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/cc")) {
        window.location.href = "/cc/login";
        return null as T;
      }
    }
    const err: ApiError = {
      status: res.status,
      message:
        (payload && typeof payload === "object" && (payload.message || payload.error)) ||
        res.statusText ||
        "API error",
      details: payload,
    };
    throw err;
  }

  return payload as T;
}

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/auth/login", { method: "POST", body: { email, password } });
}

export function me() {
  return apiFetch<MeResponse>("/auth/me", { method: "GET" });
}

// ─────────────────────────────────────────────────────────────────────────────
// P1 — Packs email confirmation (V1)
// Doctrine:
// - Packs are not public
// - Unlock requires explicit confirmation + code delivered via email
// - Backend can fallback to console logs if SMTP isn't configured
// ─────────────────────────────────────────────────────────────────────────────

export type PacksEmailRequestBody = {
  order: {
    door: "P1";
    requester: { displayName?: string | null; email?: string | null };
    project: {
      type?: string;
      city?: string;
      surfaceM2?: number | null;
      constructionLevel?: string | null;
    };
    pricing: {
      pack?: "ESSENTIEL" | "AVANCE" | "COMPLET";
      packLabel?: string | null;
      packMAD?: number | null;
      remoteFollowMAD?: number | null;
      betMAD?: number | null;
      modMAD?: number | null;
      decoMAD?: number | null;
      totalMAD?: number | null;
      totalMADRounded?: number | null;
      currency: "MAD";
    };
    services: {
      addRemoteFollow: boolean;
      betMode: "PLATFORM" | "EXTERNAL";
      mandateEntreprise: boolean;
      modEnabled: boolean;
      decoEnabled: boolean;
    };
    clientConfirmations: { truthOk: boolean; termsOk: boolean };
    ts: number;
  };
};

export type PacksEmailRequestResponse =
  | { ok: true; expiresInSec: number; devCode?: string }
  | { ok: false; message: string };

export type PacksEmailVerifyResponse =
  | { ok: true }
  | { ok: false; message: string };

export function requestP1PacksEmailCode(body: PacksEmailRequestBody) {
  return apiFetch<PacksEmailRequestResponse>("/p1/packs/email/request", { method: "POST", body });
}

export function verifyP1PacksEmailCode(code: string, caseId?: string) {
  return apiFetch<PacksEmailVerifyResponse>("/p1/packs/email/verify", { method: "POST", body: { code, caseId } });
}

// ─────────────────────────────────────────────────────────────────────────────
// P1 — Packs SMS OTP (optional; DEV falls back to console)
// ─────────────────────────────────────────────────────────────────────────────

export type PacksSmsRequestBody = {
  caseId?: string;
  phone?: string;
};

export type PacksSmsRequestResponse =
  | { ok: true; expiresInSec: number; devCode?: string }
  | { ok: false; message: string };

export type PacksSmsVerifyResponse =
  | { ok: true }
  | { ok: false; message: string };

export function requestP1PacksSmsCode(body: PacksSmsRequestBody) {
  return apiFetch<PacksSmsRequestResponse>("/p1/packs/sms/request", { method: "POST", body });
}

export function verifyP1PacksSmsCode(code: string, caseId?: string) {
  return apiFetch<PacksSmsVerifyResponse>("/p1/packs/sms/verify", { method: "POST", body: { code, caseId } });
}

// ─────────────────────────────────────────────────────────────────────────────
// P1 — Packs quote (no engine disclosure)
// ─────────────────────────────────────────────────────────────────────────────

export type P1PacksQuoteInput = {
  surfaceM2: number;
  hasBasement?: boolean;
  constructionLevel: "ECONOMIQUE" | "STANDING" | "HAUT_STANDING" | "PREMIUM" | "BLACK";
  pack: "ESSENTIEL" | "AVANCE" | "COMPLET";
  addRemoteFollow: boolean;
  betMode: "PLATFORM" | "EXTERNAL";
  mandateEntreprise: boolean;
  modEnabled: boolean;
  decoEnabled: boolean;
  blackBudgetMAD?: number | null;
};

export type P1PacksQuoteResponse = {
  ok: true;
  currency: "MAD";
  meta: {
    pack: "ESSENTIEL" | "AVANCE" | "COMPLET";
    constructionLevel: string;
    betMode: "PLATFORM" | "EXTERNAL";
    mandateEntrepriseAllowed: boolean;
  };
  amounts: {
    packMAD: number;
    remoteFollowMAD: number;
    betMAD: number;
    modMAD: number;
    decoMAD: number;
    totalMAD: number;
    totalMADRounded: number;
  };
  notes: string[];
};

export function quoteP1Packs(input: P1PacksQuoteInput) {
  return apiFetch<P1PacksQuoteResponse>("/p1/packs/quote", { method: "POST", body: { input } });
}
