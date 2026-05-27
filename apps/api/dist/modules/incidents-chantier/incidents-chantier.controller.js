"use strict";
/**
 * incidents-chantier.controller.ts — Endpoints REST du module Incidents
 * Chantier + bouton SOS (Tome 3).
 *
 * À ajouter à l'allow-list MutationGate : `/api/incidents-chantier`
 * (cf. INTEGRATION.md).
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentsChantierController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-at/security/jwt-auth.guard");
const incidents_chantier_service_1 = require("./incidents-chantier.service");
const sos_service_1 = require("./sos.service");
const weather_replan_service_1 = require("./weather-replan.service");
let IncidentsChantierController = class IncidentsChantierController {
    svc;
    sos;
    weather;
    constructor(svc, sos, weather) {
        this.svc = svc;
        this.sos = sos;
        this.weather = weather;
    }
    // ── Métadonnées (types + contacts) ────────────────────────────
    async getTypes() {
        const types = await this.svc.getTypes();
        return { ok: true, types };
    }
    async getContacts() {
        const contacts = await this.svc.getEmergencyContacts();
        return { ok: true, contacts };
    }
    // ── CRUD incidents ────────────────────────────────────────────
    async listByDossier(dossierId) {
        const incidents = this.svc.listByDossier(dossierId);
        return { ok: true, incidents, total: incidents.length };
    }
    async getOne(incidentId) {
        const incident = this.svc.get(incidentId);
        if (!incident)
            throw new common_1.NotFoundException("incident_not_found");
        return { ok: true, incident };
    }
    async declare(dossierId, body, req) {
        if (!body?.type)
            throw new common_1.BadRequestException("type_required");
        if (!body?.description || body.description.trim().length < 3) {
            throw new common_1.BadRequestException("description_required");
        }
        const actor = {
            userId: req?.user?.userId || req?.user?.sub,
            role: req?.user?.role,
        };
        const incident = await this.svc.declare(dossierId, body, actor);
        // Auto-register dossier dans weather watch si geoloc présente
        if (incident.geoloc) {
            this.weather.registerDossier({
                dossierId,
                geoloc: incident.geoloc,
            });
        }
        return { ok: true, incident };
    }
    async addAction(incidentId, body, req) {
        if (!body?.type)
            throw new common_1.BadRequestException("action_type_required");
        const actor = {
            userId: req?.user?.userId || req?.user?.sub,
            role: req?.user?.role,
        };
        const updated = await this.svc.addAction(incidentId, body, actor);
        if (!updated)
            throw new common_1.NotFoundException("incident_not_found");
        return { ok: true, incident: updated };
    }
    async resolve(incidentId, body, req) {
        const actor = {
            userId: req?.user?.userId || req?.user?.sub,
            role: req?.user?.role,
        };
        const updated = await this.svc.resolve(incidentId, body || {}, actor);
        if (!updated)
            throw new common_1.NotFoundException("incident_not_found");
        return { ok: true, incident: updated };
    }
    // ── SOS ───────────────────────────────────────────────────────
    async triggerSos(incidentId, body, req) {
        const actor = {
            userId: req?.user?.userId || req?.user?.sub,
            role: req?.user?.role,
        };
        const result = await this.sos.trigger(incidentId, body?.contacts || {}, actor);
        if (!result.incident) {
            throw new common_1.NotFoundException("incident_not_found");
        }
        return {
            ok: result.ok,
            incident: result.incident,
            notifiedCount: result.notifiedParties.length,
            emergencyCodesUsed: result.emergencyCodesUsed,
            errors: result.errors,
        };
    }
    // ── Weather replan ────────────────────────────────────────────
    async weatherAlerts(dossierId, req) {
        // Optionnel : lat/lng en query si pas encore registered
        const lat = Number(req?.query?.lat);
        const lng = Number(req?.query?.lng);
        const geoloc = isFinite(lat) && isFinite(lng) ? { lat, lng } : null;
        const tasks = Array.isArray(req?.query?.tasks)
            ? req.query.tasks.map((c) => ({
                code: c,
                sensitiveCategory: c,
            }))
            : undefined;
        const suggestion = await this.weather.getSuggestion(dossierId, geoloc, tasks);
        return { ok: true, suggestion };
    }
    async acceptReplan(dossierId) {
        const r = this.weather.acceptReplan(dossierId);
        return { ok: r.ok, replanCount: r.replanCount, alerts: r.alerts };
    }
};
exports.IncidentsChantierController = IncidentsChantierController;
__decorate([
    (0, common_1.Get)("meta/types"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IncidentsChantierController.prototype, "getTypes", null);
__decorate([
    (0, common_1.Get)("meta/emergency-contacts"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IncidentsChantierController.prototype, "getContacts", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IncidentsChantierController.prototype, "listByDossier", null);
__decorate([
    (0, common_1.Get)(":incidentId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("incidentId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IncidentsChantierController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/declarer"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(201),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], IncidentsChantierController.prototype, "declare", null);
__decorate([
    (0, common_1.Post)(":incidentId/action"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)("incidentId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], IncidentsChantierController.prototype, "addAction", null);
__decorate([
    (0, common_1.Post)(":incidentId/resolve"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)("incidentId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], IncidentsChantierController.prototype, "resolve", null);
__decorate([
    (0, common_1.Post)(":incidentId/sos"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)("incidentId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], IncidentsChantierController.prototype, "triggerSos", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId/weather-alerts"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IncidentsChantierController.prototype, "weatherAlerts", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/weather-replan/accept"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IncidentsChantierController.prototype, "acceptReplan", null);
exports.IncidentsChantierController = IncidentsChantierController = __decorate([
    (0, tome_at_1.Tome)("tome3"),
    (0, common_1.Controller)("api/incidents-chantier"),
    __metadata("design:paramtypes", [incidents_chantier_service_1.IncidentsChantierService,
        sos_service_1.SosService,
        weather_replan_service_1.WeatherReplanService])
], IncidentsChantierController);
