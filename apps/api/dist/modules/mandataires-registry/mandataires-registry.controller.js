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
exports.MandatairesRegistryController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const mandataires_registry_service_1 = require("./mandataires-registry.service");
/**
 * MandatairesRegistryController — annuaire mandataires agréés (Tome 2).
 * Recherche publique ; missions JWT-gated.
 */
let MandatairesRegistryController = class MandatairesRegistryController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    uid(req) { return req?.user?.id || req?.user?.sub || req?.user?.userId; }
    search(ville, specialite, minNote, maxTarif, profession) {
        const results = this.svc.search({
            ville, specialite, profession,
            minNote: minNote ? +minNote : undefined,
            maxTarif: maxTarif ? +maxTarif : undefined,
        });
        return { ok: true, count: results.length, results };
    }
    getProfile(slug) {
        const m = this.svc.getBySlug(slug);
        if (!m)
            return { ok: false, error: "Mandataire introuvable" };
        return { ok: true, mandataire: m };
    }
    async requestMission(id, body, req) {
        const mission = await this.svc.requestMission({ ...body, mandataireId: id, clientUserId: this.uid(req) });
        return { ok: true, mission };
    }
    async accept(d, m) {
        return { ok: true, mission: await this.svc.transitionMission(d, m, "ACCEPTED") };
    }
    async livrer(d, m, body) {
        return { ok: true, mission: await this.svc.transitionMission(d, m, "DELIVERED", { livrablesDocIds: body.livrablesDocIds || [] }) };
    }
    async valider(d, m) {
        return { ok: true, mission: await this.svc.transitionMission(d, m, "VALIDATED") };
    }
    async listMissions(dossierId) {
        return { ok: true, missions: await this.svc.listMissions(dossierId) };
    }
};
exports.MandatairesRegistryController = MandatairesRegistryController;
__decorate([
    (0, common_1.Get)("search"),
    __param(0, (0, common_1.Query)("ville")),
    __param(1, (0, common_1.Query)("specialite")),
    __param(2, (0, common_1.Query)("minNote")),
    __param(3, (0, common_1.Query)("maxTarif")),
    __param(4, (0, common_1.Query)("profession")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], MandatairesRegistryController.prototype, "search", null);
__decorate([
    (0, common_1.Get)(":slug"),
    __param(0, (0, common_1.Param)("slug")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MandatairesRegistryController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Post)(":id/mission-request"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MandatairesRegistryController.prototype, "requestMission", null);
__decorate([
    (0, common_1.Post)("missions/:dossierId/:missionId/accept"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Param)("missionId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MandatairesRegistryController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)("missions/:dossierId/:missionId/livrer"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Param)("missionId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MandatairesRegistryController.prototype, "livrer", null);
__decorate([
    (0, common_1.Post)("missions/:dossierId/:missionId/valider"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Param)("missionId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MandatairesRegistryController.prototype, "valider", null);
__decorate([
    (0, common_1.Get)("missions/dossier/:dossierId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MandatairesRegistryController.prototype, "listMissions", null);
exports.MandatairesRegistryController = MandatairesRegistryController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("api/mandataires"),
    __metadata("design:paramtypes", [mandataires_registry_service_1.MandatairesRegistryService])
], MandatairesRegistryController);
