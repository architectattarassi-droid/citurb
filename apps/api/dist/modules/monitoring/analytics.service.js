"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = exports.UmamiError = exports.CASABLANCA_TZ = void 0;
const common_1 = require("@nestjs/common");
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
exports.CASABLANCA_TZ = "Africa/Casablanca";
class UmamiError extends Error {
    constructor(message) {
        super(message);
        this.name = "UmamiError";
    }
}
exports.UmamiError = UmamiError;
let AnalyticsService = class AnalyticsService {
    log = new common_1.Logger("AnalyticsService");
    cachedToken = null;
    // ── Config ────────────────────────────────────────────────────
    baseUrl() {
        const raw = process.env.UMAMI_BASE_URL || "";
        return raw.replace(/\/+$/, ""); // sans slash final
    }
    websiteId() {
        return process.env.UMAMI_WEBSITE_ID || "";
    }
    /** True si assez de config pour interroger Umami. */
    isConfigured() {
        const hasAuth = !!process.env.UMAMI_API_KEY ||
            !!(process.env.UMAMI_USERNAME && process.env.UMAMI_PASSWORD);
        return !!this.baseUrl() && !!this.websiteId() && hasAuth;
    }
    assertConfigured() {
        if (!this.baseUrl())
            throw new UmamiError("UMAMI_BASE_URL manquant");
        if (!this.websiteId())
            throw new UmamiError("UMAMI_WEBSITE_ID manquant");
        if (!process.env.UMAMI_API_KEY &&
            !(process.env.UMAMI_USERNAME && process.env.UMAMI_PASSWORD)) {
            throw new UmamiError("Auth Umami manquante (UMAMI_API_KEY ou UMAMI_USERNAME+UMAMI_PASSWORD)");
        }
    }
    // ── Auth ──────────────────────────────────────────────────────
    /** Récupère (et met en cache) un token Bearer via /api/auth/login. */
    async login() {
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
        const data = (await res.json().catch(() => ({})));
        if (!data?.token)
            throw new UmamiError("Umami login: token absent de la réponse");
        this.cachedToken = data.token;
        return data.token;
    }
    /** Headers d'auth (API key prioritaire, sinon token Bearer mis en cache). */
    async authHeaders(forceRelogin = false) {
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
    async authedGet(path, query) {
        this.assertConfigured();
        const qs = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString();
        const url = `${this.baseUrl()}${path}?${qs}`;
        const doFetch = async (headers) => fetch(url, { headers: { ...headers, Accept: "application/json" } });
        let res = await doFetch(await this.authHeaders());
        if (res.status === 401 && !process.env.UMAMI_API_KEY) {
            this.cachedToken = null;
            res = await doFetch(await this.authHeaders(true));
        }
        if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new UmamiError(`Umami GET ${path} ${res.status}: ${txt.slice(0, 200)}`);
        }
        return (await res.json());
    }
    // ── API publique typée ───────────────────────────────────────
    /** Stats agrégées (visiteurs uniques, pageviews, sessions, bounces, temps). */
    async getStats(fromMs, toMs) {
        const raw = await this.authedGet(`/api/websites/${this.websiteId()}/stats`, {
            startAt: fromMs,
            endAt: toMs,
        });
        const val = (k) => {
            const v = raw[k];
            if (typeof v === "number")
                return v;
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
    async getPageviews(fromMs, toMs) {
        const raw = await this.authedGet(`/api/websites/${this.websiteId()}/pageviews`, {
            startAt: fromMs,
            endAt: toMs,
            unit: "day",
            timezone: exports.CASABLANCA_TZ,
        });
        const pv = raw.pageviews ?? [];
        const ss = new Map((raw.sessions ?? []).map((s) => [s.x, s.y]));
        return pv.map((p) => ({ date: p.x, pageviews: p.y, sessions: ss.get(p.x) ?? 0 }));
    }
    /** Classement (top pages / sources / pays). `limit` borne le nombre d'items. */
    async getMetrics(type, fromMs, toMs, limit = 5) {
        const raw = await this.authedGet(`/api/websites/${this.websiteId()}/metrics`, {
            startAt: fromMs,
            endAt: toMs,
            type,
            timezone: exports.CASABLANCA_TZ,
        });
        return (raw || [])
            .map((r) => ({ key: r.x ?? "(direct)", count: r.y }))
            .slice(0, limit);
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)()
], AnalyticsService);
