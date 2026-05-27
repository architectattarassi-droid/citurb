"use strict";
/**
 * weather-replan.service.ts — Replan automatique des tâches météo-sensibles.
 *
 * Tome 3. Source météo : Open-Meteo (https://open-meteo.com) — API publique
 * gratuite, sans clé. La variable d'env OPENMETEO_API_KEY est tolérée mais
 * inutilisée (placeholder pour passer plus tard sur une offre payante).
 *
 * Cinématique cron :
 *  - 06:00 Africa/Casablanca chaque jour
 *  - Pour chaque dossier actif géolocalisé (`registerDossier(...)`),
 *    fetch prévisions 7 jours, calcule risques, génère replan suggestions
 *  - Notifie le chef chantier (placeholder via probative log — NotificationsHub
 *    branché par INTEGRATION.md)
 *
 * Cache mémoire : 1h par couple (lat,lng) pour éviter de spammer l'API.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherReplanService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const probative_log_service_1 = require("../kernel/services/probative-log.service");
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const OPENMETEO_URL = "https://api.open-meteo.com/v1/forecast";
let WeatherReplanService = class WeatherReplanService {
    probative;
    log = new common_1.Logger("WeatherReplanService");
    registered = new Map();
    cache = new Map();
    lastSuggestions = new Map();
    constructor(probative) {
        this.probative = probative;
    }
    // ── Enregistrement des dossiers à surveiller ────────────────────
    registerDossier(input) {
        if (!input.geoloc || input.geoloc.lat == null || input.geoloc.lng == null)
            return;
        this.registered.set(input.dossierId, input);
    }
    unregisterDossier(dossierId) {
        this.registered.delete(dossierId);
    }
    // ── Cron quotidien 06:00 Africa/Casablanca ──────────────────────
    async dailyReplan() {
        this.log.log(`[WeatherReplan] daily run (${this.registered.size} dossiers)`);
        for (const dossier of this.registered.values()) {
            try {
                const suggestion = await this.computeSuggestion(dossier);
                this.lastSuggestions.set(dossier.dossierId, suggestion);
                if (suggestion.alerts.length) {
                    await this.probative.append({
                        type: "WEATHER_ALERT_GENERATED",
                        dossierId: dossier.dossierId,
                        alertCount: suggestion.alerts.length,
                        ts: new Date().toISOString(),
                    });
                }
            }
            catch (e) {
                this.log.warn(`[WeatherReplan] dossier=${dossier.dossierId} compute failed: ${e?.message}`);
            }
        }
    }
    // ── Lecture suggestions ────────────────────────────────────────
    async getSuggestion(dossierId, geoloc, activeTasks) {
        // Si déjà calculé récemment, on retourne le cache
        const cached = this.lastSuggestions.get(dossierId);
        if (cached && Date.now() - new Date(cached.generatedAt).getTime() < CACHE_TTL_MS) {
            return cached;
        }
        if (!geoloc)
            return null;
        const suggestion = await this.computeSuggestion({
            dossierId,
            geoloc,
            activeTasks,
        });
        this.lastSuggestions.set(dossierId, suggestion);
        return suggestion;
    }
    acceptReplan(dossierId) {
        const last = this.lastSuggestions.get(dossierId);
        if (!last)
            return { ok: false, replanCount: 0, alerts: [] };
        // V1 : on log seulement — la mutation effective du planning va dans
        // project-calendar/sous-phase quand les hooks seront en place.
        this.probative.append({
            type: "WEATHER_REPLAN_ACCEPTED",
            dossierId,
            replanCount: last.alerts.length,
            ts: new Date().toISOString(),
        }).catch(() => undefined);
        return {
            ok: true,
            replanCount: last.alerts.length,
            alerts: last.alerts,
        };
    }
    // ── Calcul d'une suggestion à partir d'un fetch Open-Meteo ──────
    async computeSuggestion(dossier) {
        const forecast = await this.fetchForecast(dossier.geoloc);
        const alerts = [];
        for (const f of forecast) {
            const isChergui = f.cherguiRisk;
            const isRain = f.rainRisk;
            if (!isChergui && !isRain)
                continue;
            const affectedTasks = this.findAffectedTasks(dossier, isChergui, isRain);
            if (!affectedTasks.length)
                continue;
            const replanTo = this.findClearWindow(forecast, f.date);
            const type = isChergui ? "CHERGUI" : "PLUIE";
            alerts.push({
                date: f.date,
                type,
                affectedTasks,
                suggestion: replanTo && replanTo !== f.date
                    ? `Replan recommandé : décaler à ${replanTo}`
                    : `Aucune fenêtre claire sous 7j — bâcher / protéger`,
                replanToDate: replanTo && replanTo !== f.date ? replanTo : undefined,
            });
        }
        return {
            generatedAt: new Date().toISOString(),
            forecast,
            alerts,
        };
    }
    findAffectedTasks(dossier, chergui, rain) {
        const fromTasks = (dossier.activeTasks || [])
            .map((t) => t.sensitiveCategory)
            .filter(Boolean);
        if (fromTasks.length)
            return Array.from(new Set(fromTasks));
        // Defaults : si on n'a pas d'info, on suppose lot gros œuvre BTP
        if (rain)
            return ["BETONNAGE", "ETANCHEITE", "PEINTURE_EXTERIEURE", "TOITURE"];
        if (chergui)
            return ["BETONNAGE", "PEINTURE_EXTERIEURE"];
        return [];
    }
    findClearWindow(forecast, fromDate) {
        let passed = false;
        for (const f of forecast) {
            if (!passed) {
                if (f.date === fromDate)
                    passed = true;
                continue;
            }
            if (!f.cherguiRisk && !f.rainRisk)
                return f.date;
        }
        return null;
    }
    // ── Fetch Open-Meteo (avec cache 1h) ───────────────────────────
    async fetchForecast(geoloc) {
        const key = `${geoloc.lat.toFixed(3)}_${geoloc.lng.toFixed(3)}`;
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
            return cached.forecast;
        }
        try {
            const url = new URL(OPENMETEO_URL);
            url.searchParams.set("latitude", String(geoloc.lat));
            url.searchParams.set("longitude", String(geoloc.lng));
            url.searchParams.set("daily", [
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_sum",
                "precipitation_probability_max",
                "windspeed_10m_max",
                "weathercode",
            ].join(","));
            url.searchParams.set("timezone", "Africa/Casablanca");
            url.searchParams.set("forecast_days", "7");
            const res = await fetch(url.toString());
            if (!res.ok) {
                this.log.warn(`[WeatherReplan] OpenMeteo HTTP ${res.status}`);
                return [];
            }
            const data = await res.json();
            const dates = data?.daily?.time || [];
            const tMax = data?.daily?.temperature_2m_max || [];
            const tMin = data?.daily?.temperature_2m_min || [];
            const precip = data?.daily?.precipitation_sum || [];
            const precipProb = data?.daily?.precipitation_probability_max || [];
            const wind = data?.daily?.windspeed_10m_max || [];
            const code = data?.daily?.weathercode || [];
            const forecast = dates.map((d, i) => {
                const tempMaxC = Number(tMax[i] ?? 0);
                const precipMm = Number(precip[i] ?? 0);
                const precipProbabilityPct = Number(precipProb[i] ?? 0);
                return {
                    date: d,
                    tempMaxC,
                    tempMinC: Number(tMin[i] ?? 0),
                    precipMm,
                    precipProbabilityPct,
                    windKmh: Number(wind[i] ?? 0),
                    weatherCode: Number(code[i] ?? 0),
                    cherguiRisk: tempMaxC >= 40,
                    rainRisk: precipProbabilityPct >= 60 || precipMm >= 5,
                };
            });
            this.cache.set(key, { ts: Date.now(), forecast });
            return forecast;
        }
        catch (e) {
            this.log.warn(`[WeatherReplan] fetch failed: ${e?.message}`);
            return [];
        }
    }
};
exports.WeatherReplanService = WeatherReplanService;
__decorate([
    (0, schedule_1.Cron)("0 6 * * *", { timeZone: "Africa/Casablanca" }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WeatherReplanService.prototype, "dailyReplan", null);
exports.WeatherReplanService = WeatherReplanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [probative_log_service_1.ProbativeLogService])
], WeatherReplanService);
