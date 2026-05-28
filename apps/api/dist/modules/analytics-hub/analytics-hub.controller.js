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
exports.AnalyticsHubController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const analytics_hub_service_1 = require("./analytics-hub.service");
/**
 * AnalyticsHubController — ingestion events (public, fire-and-forget) +
 * dashboard KPI 6 portes (OPS, JWT-gated).
 */
let AnalyticsHubController = class AnalyticsHubController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    /** Ingestion publique d'un événement (sendBeacon depuis le front). */
    async event(body) {
        if (!body?.type || !body?.sessionId)
            return { ok: false };
        await this.svc.track(body);
        return { ok: true };
    }
    /** Dashboard KPI des 6 portes (OPS). */
    async dashboard(period) {
        const dashboard = await this.svc.dashboard(period || "30d");
        return { ok: true, dashboard };
    }
};
exports.AnalyticsHubController = AnalyticsHubController;
__decorate([
    (0, common_1.Post)("event"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsHubController.prototype, "event", null);
__decorate([
    (0, common_1.Get)("dashboard"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)("period")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnalyticsHubController.prototype, "dashboard", null);
exports.AnalyticsHubController = AnalyticsHubController = __decorate([
    (0, tome_at_1.Tome)("tome0"),
    (0, common_1.Controller)("api/analytics-hub"),
    __metadata("design:paramtypes", [analytics_hub_service_1.AnalyticsHubService])
], AnalyticsHubController);
