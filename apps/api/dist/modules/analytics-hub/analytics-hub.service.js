"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AnalyticsHubService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsHubService = void 0;
const common_1 = require("@nestjs/common");
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const path_1 = require("path");
const PORTES = ["P1", "P2", "P3", "P4", "P5", "P6"];
/**
 * AnalyticsHubService — ingestion d'événements en JSONL append-only
 * (rotation quotidienne) + agrégation KPI à la demande.
 *
 * Pas de Prisma (volume potentiellement élevé, append fichier = O(1)).
 * RGPD/Loi 09-08 : sessionId anonyme par défaut, pas d'IP, pas de fingerprint.
 */
let AnalyticsHubService = AnalyticsHubService_1 = class AnalyticsHubService {
    logger = new common_1.Logger(AnalyticsHubService_1.name);
    dir = (0, path_1.join)(process.cwd(), "storage", "analytics");
    fileForToday() {
        const day = new Date().toISOString().slice(0, 10);
        return (0, path_1.join)(this.dir, `events-${day}.jsonl`);
    }
    /** Ingestion fire-and-forget d'un événement. Ne lève jamais. */
    async track(ev) {
        try {
            if (!(0, fs_1.existsSync)(this.dir))
                await (0, promises_1.mkdir)(this.dir, { recursive: true });
            const full = { ...ev, ts: new Date().toISOString() };
            await (0, promises_1.appendFile)(this.fileForToday(), JSON.stringify(full) + "\n", "utf-8");
        }
        catch (e) {
            this.logger.warn(`track failed: ${e?.message}`);
        }
    }
    /** Charge les events des N derniers jours. */
    async loadEvents(days) {
        if (!(0, fs_1.existsSync)(this.dir))
            return [];
        const cutoff = Date.now() - days * 24 * 3600 * 1000;
        const files = (await (0, promises_1.readdir)(this.dir)).filter((f) => f.startsWith("events-") && f.endsWith(".jsonl"));
        const out = [];
        for (const f of files) {
            const dayStr = f.replace("events-", "").replace(".jsonl", "");
            const dayTs = new Date(dayStr).getTime();
            if (isNaN(dayTs) || dayTs < cutoff - 24 * 3600 * 1000)
                continue;
            try {
                const content = await (0, promises_1.readFile)((0, path_1.join)(this.dir, f), "utf-8");
                for (const line of content.split("\n")) {
                    if (!line.trim())
                        continue;
                    try {
                        const ev = JSON.parse(line);
                        if (new Date(ev.ts).getTime() >= cutoff)
                            out.push(ev);
                    }
                    catch { /* skip ligne corrompue */ }
                }
            }
            catch { /* skip fichier */ }
        }
        return out;
    }
    pct(num, den) {
        return den > 0 ? Math.round((num / den) * 1000) / 10 : 0;
    }
    /** Agrège le dashboard complet des 6 portes. */
    async dashboard(period) {
        const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
        const events = await this.loadEvents(days);
        const portes = PORTES.map((porte) => {
            const pe = events.filter((e) => e.porte === porte);
            const count = (t) => pe.filter((e) => e.type === t).length;
            const views = count("view");
            const wizardStarts = count("wizard_start");
            const wizardCompletes = count("wizard_complete");
            const intakeSubmits = count("intake_submit");
            const paymentsInitiated = count("payment_initiated");
            const paymentsReceived = count("payment_received");
            const funnel = {
                porte, views, wizardStarts, wizardCompletes, intakeSubmits, paymentsInitiated, paymentsReceived,
                rateViewToStart: this.pct(wizardStarts, views),
                rateStartToComplete: this.pct(wizardCompletes, wizardStarts),
                rateCompleteToSubmit: this.pct(intakeSubmits, wizardCompletes),
                rateSubmitToPaid: this.pct(paymentsReceived, intakeSubmits),
                rateGlobalViewToPaid: this.pct(paymentsReceived, views),
            };
            // GMV = somme value des payment_received
            const gmvMad = pe.filter((e) => e.type === "payment_received").reduce((s, e) => s + (e.value || 0), 0);
            const payeurs = new Set(pe.filter((e) => e.type === "payment_received" && e.userId).map((e) => e.userId));
            // NPS
            const npsEvents = pe.filter((e) => e.type === "nps_response" && typeof e.value === "number");
            const promoters = npsEvents.filter((e) => (e.value || 0) >= 9).length;
            const detractors = npsEvents.filter((e) => (e.value || 0) <= 6).length;
            const npsScore = npsEvents.length > 0 ? Math.round(((promoters - detractors) / npsEvents.length) * 100) : 0;
            // DAU/MAU (sessions uniques)
            const todayStr = new Date().toISOString().slice(0, 10);
            const dau = new Set(pe.filter((e) => e.ts.slice(0, 10) === todayStr).map((e) => e.sessionId)).size;
            const mau = new Set(pe.map((e) => e.sessionId)).size;
            return {
                porte, dau, mau, gmvMad, npsScore, npsResponses: npsEvents.length,
                payeursUniques: payeurs.size,
                arpuMad: payeurs.size > 0 ? Math.round(gmvMad / payeurs.size) : 0,
                funnel,
            };
        });
        const topByGmv = [...portes].sort((a, b) => b.gmvMad - a.gmvMad)[0];
        const topByConv = [...portes].sort((a, b) => b.funnel.rateGlobalViewToPaid - a.funnel.rateGlobalViewToPaid)[0];
        return {
            period,
            generatedAt: new Date().toISOString(),
            totalEvents: events.length,
            portes,
            topPorteByGmv: topByGmv?.gmvMad > 0 ? topByGmv.porte : undefined,
            topPorteByConversion: topByConv?.funnel.rateGlobalViewToPaid > 0 ? topByConv.porte : undefined,
        };
    }
};
exports.AnalyticsHubService = AnalyticsHubService;
exports.AnalyticsHubService = AnalyticsHubService = AnalyticsHubService_1 = __decorate([
    (0, common_1.Injectable)()
], AnalyticsHubService);
