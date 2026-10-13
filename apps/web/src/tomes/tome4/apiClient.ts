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
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl;
  // En production l'API et la SPA sont servies par le même origin (Railway).
  // Utilise un chemin relatif pour éviter le « Failed to fetch » dû à
  // localhost:4000 figé dans le bundle au build.
  if (typeof window !== "undefined" && window.location && window.location.hostname !== "localhost") {
    return window.location.origin;
  }
  return "http://localhost:4000";
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

// Connexion (/auth/login, /auth/me), codes e-mail/SMS et devis des packs P1
// (/p1/packs/*) : routes de l'API NestJS éteinte, retirées. Les devis P1 sont
// calculés par domain/p1/quote.engine (quoteLocal) ; le compte client léger est
// le lot 3a de docs/architecture/plan-rebranchement.md.
