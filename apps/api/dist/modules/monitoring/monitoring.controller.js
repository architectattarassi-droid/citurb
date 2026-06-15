"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const roles_decorator_1 = require("../../tomes/tome-5/auth/roles.decorator");
const roles_guard_1 = require("../../tomes/tome-5/auth/roles.guard");
const analytics_service_1 = require("./analytics.service");
const reports_service_1 = require("./reports.service");
const date_windows_1 = require("./date-windows");
/**
 * MonitoringController — endpoints internes (OPS/OWNER/ADMIN) de supervision.
 *
 * Monté sous /api/* pour bypasser le fallback SPA (cf. main.ts) et la mutation-gate
 * (allow-list /api/monitoring). B1 n'expose que de la lecture analytics ; les
 * déclencheurs manuels de rapports arrivent en B3/B4.
 */
let MonitoringController = class MonitoringController {
    analytics;
    reports;
    constructor(analytics, reports) {
        this.analytics = analytics;
        this.reports = reports;
    }
    /**
     * GET /api/monitoring/analytics?from&to
     * Fenêtre par défaut : 7 derniers jours pleins (Casablanca).
     * `from`/`to` acceptent `YYYY-MM-DD`, ISO datetime ou epoch ms.
     */
    async getAnalytics(from, to) {
        if (!this.analytics.isConfigured()) {
            return {
                ok: false,
                configured: false,
                message: "Umami non configuré (UMAMI_BASE_URL / UMAMI_WEBSITE_ID / auth manquants).",
            };
        }
        const now = new Date();
        let startMs = (0, date_windows_1.parseBoundMs)(from, false);
        let endMs = (0, date_windows_1.parseBoundMs)(to, true);
        if (from && startMs === null)
            throw new common_1.BadRequestException("`from` invalide");
        if (to && endMs === null)
            throw new common_1.BadRequestException("`to` invalide");
        if (startMs === null || endMs === null) {
            const w = (0, date_windows_1.lastNDaysWindow)(now, 7);
            startMs = startMs ?? w.startMs;
            endMs = endMs ?? w.endMs;
        }
        if (startMs > endMs)
            throw new common_1.BadRequestException("`from` postérieur à `to`");
        try {
            const [stats, series, topPages, topSources, topCountries] = await Promise.all([
                this.analytics.getStats(startMs, endMs),
                this.analytics.getPageviews(startMs, endMs),
                this.analytics.getMetrics("url", startMs, endMs, 10),
                this.analytics.getMetrics("referrer", startMs, endMs, 10),
                this.analytics.getMetrics("country", startMs, endMs, 10),
            ]);
            return {
                ok: true,
                configured: true,
                window: { from: new Date(startMs).toISOString(), to: new Date(endMs).toISOString() },
                stats,
                series,
                topPages,
                topSources,
                topCountries,
            };
        }
        catch (e) {
            if (e instanceof analytics_service_1.UmamiError) {
                return { ok: false, configured: true, error: e.message };
            }
            throw e;
        }
    }
    /**
     * POST /api/monitoring/reports/daily/run
     * Déclenche manuellement le rapport quotidien (visites de la veille) et l'envoie
     * sur Email + Telegram. Utile pour tester sans attendre le cron.
     */
    async runDailyReport() {
        return this.reports.runDaily();
    }
};
exports.MonitoringController = MonitoringController;
__decorate([
    (0, common_1.Get)("analytics"),
    __param(0, (0, common_1.Query)("from")),
    __param(1, (0, common_1.Query)("to")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Post)("reports/daily/run"),
    (0, common_1.HttpCode)(200),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "runDailyReport", null);
exports.MonitoringController = MonitoringController = __decorate([
    (0, tome_at_1.Tome)("tome9"),
    (0, common_1.Controller)("api/monitoring"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("OPS", "OWNER", "ADMIN"),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService,
        reports_service_1.ReportsService])
], MonitoringController);
