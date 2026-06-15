import { Injectable, Logger } from "@nestjs/common";

/**
 * AnalyticsService — client de l'API Umami (analytics auto-hébergé, sans cookies).
 *
 * Authentification (cascade, le premier disponible gagne) :
 *  1. **API key** (UMAMI_API_KEY) — header `x-umami-api-key`, recommandé (pas d'expiration).
 *  2. **Login** (UMAMI_USERNAME + UMAMI_PASSWORD) — POST /api/auth/login → token Bearer
 *     mis en cache et renouvelé automatiquement sur 401.
 *
 * Toutes les méthodes retournent des objets typés. Les fenêtres temporelles sont
 * exprimées en millisecondes epoch (UTC) ; le découpage des journées côté Umami
 * utilise la timezone Africa/Casablanca (param `timezone`).
 *
 * Jamais bloquant pour la logique métier : en cas d'erreur réseau / config absente,
 * lève une UmamiError que l'appelant (endpoint test, rapports) catche proprement.
 *
 * Variables d'env requises : UMAMI_BASE_URL, UMAMI_WEBSITE_ID,
 * (UMAMI_API_KEY) OU (UMAMI_USERNAME + UMAMI_PASSWORD).
 */

export const CASABLANCA_TZ = "Africa/Casablanca";

export class UmamiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UmamiError";
  }
}

/** Stats agrégées sur une fenêtre [from, to]. */
export type UmamiStats = {
  visitors: number; // visiteurs uniques
  pageviews: number;
  visits: number; // sessions
  bounces: number;
  totaltimeSec: number; // temps total cumulé (secondes)
};

/** Une journée (ou bucket) de la série temporelle. */
export type UmamiPageviewBucket = {
  date: string; // ISO du début de bucket (renvoyé par Umami)
  pageviews: number;
  sessions: number;
};

export type UmamiMetricType = "url" | "referrer" | "country";

/** Un item de classement (top page, top source, pays…). */
export type UmamiMetricItem = {
  key: string; // ex: "/", "google.com", "MA"
  count: number;
};

@Injectable()
export class AnalyticsService {
  private readonly log = new Logger("AnalyticsService");
  private cachedToken: string | null = null;

  // ── Config ────────────────────────────────────────────────────

  private baseUrl(): string {
    const raw = process.env.UMAMI_BASE_URL || "";
    return raw.replace(/\/+$/, ""); // sans slash final
  }

  private websiteId(): string {
    return process.env.UMAMI_WEBSITE_ID || "";
  }

  /** True si assez de config pour interroger Umami. */
  isConfigured(): boolean {
    const hasAuth =
      !!process.env.UMAMI_API_KEY ||
      !!(process.env.UMAMI_USERNAME && process.env.UMAMI_PASSWORD);
    return !!this.baseUrl() && !!this.websiteId() && hasAuth;
  }

  private assertConfigured() {
    if (!this.baseUrl()) throw new UmamiError("UMAMI_BASE_URL manquant");
    if (!this.websiteId()) throw new UmamiError("UMAMI_WEBSITE_ID manquant");
    if (
      !process.env.UMAMI_API_KEY &&
      !(process.env.UMAMI_USERNAME && process.env.UMAMI_PASSWORD)
    ) {
      throw new UmamiError(
        "Auth Umami manquante (UMAMI_API_KEY ou UMAMI_USERNAME+UMAMI_PASSWORD)",
      );
    }
  }

  // ── Auth ──────────────────────────────────────────────────────

  /** Récupère (et met en cache) un token Bearer via /api/auth/login. */
  private async login(): Promise<string> {
    const res = await fetch(`${this.baseUrl()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: process.env.UMAMI_USERNAME,
        password: process.env.UMAMI_PASSWORD,
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new UmamiError(`Umami login ${res.status}: ${txt.slice(0, 200)}`);
    }
    const data = (await res.json().catch(() => ({}))) as { token?: string };
    if (!data?.token) throw new UmamiError("Umami login: token absent de la réponse");
    this.cachedToken = data.token;
    return data.token;
  }

  /** Headers d'auth (API key prioritaire, sinon token Bearer mis en cache). */
  private async authHeaders(forceRelogin = false): Promise<Record<string, string>> {
    if (process.env.UMAMI_API_KEY) {
      return { "x-umami-api-key": process.env.UMAMI_API_KEY };
    }
    if (forceRelogin || !this.cachedToken) {
      await this.login();
    }
    return { Authorization: `Bearer ${this.cachedToken}` };
  }

  /**
   * GET authentifié sur l'API Umami avec retry unique sur 401
   * (token expiré → re-login transparent).
   */
  private async authedGet<T>(path: string, query: Record<string, string | number>): Promise<T> {
    this.assertConfigured();
    const qs = new URLSearchParams(
      Object.entries(query).map(([k, v]) => [k, String(v)]),
    ).toString();
    const url = `${this.baseUrl()}${path}?${qs}`;

    const doFetch = async (headers: Record<string, string>) =>
      fetch(url, { headers: { ...headers, Accept: "application/json" } });

    let res = await doFetch(await this.authHeaders());
    if (res.status === 401 && !process.env.UMAMI_API_KEY) {
      this.cachedToken = null;
      res = await doFetch(await this.authHeaders(true));
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new UmamiError(`Umami GET ${path} ${res.status}: ${txt.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  // ── API publique typée ───────────────────────────────────────

  /** Stats agrégées (visiteurs uniques, pageviews, sessions, bounces, temps). */
  async getStats(fromMs: number, toMs: number): Promise<UmamiStats> {
    type Raw = Record<string, { value: number; prev?: number } | number>;
    const raw = await this.authedGet<Raw>(`/api/websites/${this.websiteId()}/stats`, {
      startAt: fromMs,
      endAt: toMs,
    });
    const val = (k: string): number => {
      const v = raw[k];
      if (typeof v === "number") return v;
      return v?.value ?? 0;
    };
    return {
      visitors: val("visitors"),
      pageviews: val("pageviews"),
      visits: val("visits"),
      bounces: val("bounces"),
      totaltimeSec: val("totaltime"),
    };
  }

  /** Série temporelle pageviews + sessions, bucket journalier (timezone Casablanca). */
  async getPageviews(fromMs: number, toMs: number): Promise<UmamiPageviewBucket[]> {
    type Raw = { pageviews?: Array<{ x: string; y: number }>; sessions?: Array<{ x: string; y: number }> };
    const raw = await this.authedGet<Raw>(`/api/websites/${this.websiteId()}/pageviews`, {
      startAt: fromMs,
      endAt: toMs,
      unit: "day",
      timezone: CASABLANCA_TZ,
    });
    const pv = raw.pageviews ?? [];
    const ss = new Map((raw.sessions ?? []).map((s) => [s.x, s.y]));
    return pv.map((p) => ({ date: p.x, pageviews: p.y, sessions: ss.get(p.x) ?? 0 }));
  }

  /** Classement (top pages / sources / pays). `limit` borne le nombre d'items. */
  async getMetrics(
    type: UmamiMetricType,
    fromMs: number,
    toMs: number,
    limit = 5,
  ): Promise<UmamiMetricItem[]> {
    type Raw = Array<{ x: string | null; y: number }>;
    const raw = await this.authedGet<Raw>(`/api/websites/${this.websiteId()}/metrics`, {
      startAt: fromMs,
      endAt: toMs,
      type,
      timezone: CASABLANCA_TZ,
    });
    return (raw || [])
      .map((r) => ({ key: r.x ?? "(direct)", count: r.y }))
      .slice(0, limit);
  }
}
