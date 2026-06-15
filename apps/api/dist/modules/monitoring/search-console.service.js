"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchConsoleService = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
let SearchConsoleService = class SearchConsoleService {
    log = new common_1.Logger("SearchConsoleService");
    isEnabled() {
        return (process.env.GSC_ENABLED || "").trim().toLowerCase() === "true";
    }
    credentials() {
        const json = process.env.GSC_SERVICE_ACCOUNT_JSON;
        if (json) {
            try {
                const raw = json.trim().startsWith("{")
                    ? json
                    : Buffer.from(json, "base64").toString("utf8");
                const parsed = JSON.parse(raw);
                if (parsed.client_email && parsed.private_key) {
                    return { clientEmail: parsed.client_email, privateKey: parsed.private_key };
                }
            }
            catch (e) {
                this.log.error(`[GSC] GSC_SERVICE_ACCOUNT_JSON illisible: ${e?.message}`);
                return null;
            }
        }
        const clientEmail = process.env.GSC_CLIENT_EMAIL;
        const privateKey = (process.env.GSC_PRIVATE_KEY || "").replace(/\\n/g, "\n");
        if (clientEmail && privateKey)
            return { clientEmail, privateKey };
        return null;
    }
    // ── Auth JWT → access_token ───────────────────────────────────
    b64url(input) {
        return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    async accessToken(creds) {
        const now = Math.floor(Date.now() / 1000);
        const header = this.b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
        const claims = this.b64url(JSON.stringify({
            iss: creds.clientEmail,
            scope: SCOPE,
            aud: TOKEN_URL,
            iat: now,
            exp: now + 3600,
        }));
        const signingInput = `${header}.${claims}`;
        const signature = this.b64url(crypto.createSign("RSA-SHA256").update(signingInput).sign(creds.privateKey));
        const assertion = `${signingInput}.${signature}`;
        const res = await fetch(TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                assertion,
            }),
        });
        if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(`token ${res.status}: ${txt.slice(0, 200)}`);
        }
        const data = (await res.json());
        if (!data.access_token)
            throw new Error("access_token absent");
        return data.access_token;
    }
    // ── Query Search Analytics ────────────────────────────────────
    /** Interroge GSC sur [fromDate, toDate] (YYYY-MM-DD). Skip propre si désactivé. */
    async fetch(fromDate, toDate, rowLimit = 10) {
        if (!this.isEnabled())
            return { enabled: false, reason: "GSC_ENABLED!=true" };
        const siteUrl = process.env.GSC_SITE_URL;
        if (!siteUrl)
            return { enabled: false, reason: "GSC_SITE_URL manquant" };
        const creds = this.credentials();
        if (!creds)
            return { enabled: false, reason: "credentials service-account manquants" };
        try {
            const token = await this.accessToken(creds);
            const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    startDate: fromDate,
                    endDate: toDate,
                    dimensions: ["query"],
                    rowLimit,
                }),
            });
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                return { enabled: false, reason: `GSC ${res.status}: ${txt.slice(0, 200)}` };
            }
            const data = (await res.json());
            const rows = data.rows ?? [];
            const topQueries = rows.map((r) => ({
                query: r.keys?.[0] ?? "(n/a)",
                clicks: r.clicks,
                impressions: r.impressions,
                ctr: Math.round(r.ctr * 1000) / 10,
                position: Math.round(r.position * 10) / 10,
            }));
            const clicks = topQueries.reduce((s, r) => s + r.clicks, 0);
            const impressions = topQueries.reduce((s, r) => s + r.impressions, 0);
            const position = topQueries.length ? topQueries.reduce((s, r) => s + r.position, 0) / topQueries.length : 0;
            return {
                enabled: true,
                range: { from: fromDate, to: toDate },
                clicks,
                impressions,
                ctr: impressions ? Math.round((clicks / impressions) * 1000) / 10 : 0,
                position: Math.round(position * 10) / 10,
                topQueries,
            };
        }
        catch (e) {
            this.log.error(`[GSC] échec: ${e?.message}`);
            return { enabled: false, reason: e?.message || "erreur GSC" };
        }
    }
};
exports.SearchConsoleService = SearchConsoleService;
exports.SearchConsoleService = SearchConsoleService = __decorate([
    (0, common_1.Injectable)()
], SearchConsoleService);
