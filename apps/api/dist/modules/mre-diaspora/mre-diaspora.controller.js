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
exports.MreDiasporaController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const mre_diaspora_service_1 = require("./mre-diaspora.service");
/**
 * MreDiasporaController — parcours MRE (Pivot Visa du foncier).
 * Tome 2 (portes). Toutes les mutations sont JWT-gated.
 */
let MreDiasporaController = class MreDiasporaController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    uid(req) {
        return req?.user?.id || req?.user?.sub || req?.user?.userId;
    }
    async upgradeProfile(body, req) {
        const profile = await this.svc.upgradeProfile(this.uid(req), body);
        return { ok: true, profile };
    }
    async dashboard(req) {
        const dashboard = await this.svc.getDashboard(this.uid(req));
        return { ok: true, dashboard };
    }
    async createProcuration(body, req) {
        const proc = await this.svc.createProcuration({ ...body, mreUserId: this.uid(req) });
        return { ok: true, procuration: proc };
    }
    async signProcuration(dossierId, procId, body) {
        const proc = await this.svc.signProcuration(dossierId, procId, body.signatureDataUrl, body.country);
        return { ok: true, procuration: proc };
    }
    async apostille(dossierId, procId) {
        const proc = await this.svc.requestApostille(dossierId, procId);
        return { ok: true, procuration: proc };
    }
    async getEscrow(dossierId) {
        const escrow = await this.svc.getEscrow(dossierId);
        return { ok: true, escrow };
    }
    async initEscrow(dossierId, body, req) {
        const escrow = await this.svc.initEscrow(dossierId, this.uid(req), body.milestones);
        return { ok: true, escrow };
    }
    async releaseMilestone(dossierId, milestoneId, body) {
        const escrow = await this.svc.releaseMilestone(dossierId, milestoneId, body.preuveDocIds || []);
        return { ok: true, escrow };
    }
};
exports.MreDiasporaController = MreDiasporaController;
__decorate([
    (0, common_1.Post)("profile/upgrade"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MreDiasporaController.prototype, "upgradeProfile", null);
__decorate([
    (0, common_1.Get)("dashboard"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MreDiasporaController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Post)("procuration"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MreDiasporaController.prototype, "createProcuration", null);
__decorate([
    (0, common_1.Post)("procuration/:dossierId/:procId/sign"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Param)("procId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MreDiasporaController.prototype, "signProcuration", null);
__decorate([
    (0, common_1.Post)("procuration/:dossierId/:procId/apostille"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Param)("procId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MreDiasporaController.prototype, "apostille", null);
__decorate([
    (0, common_1.Get)("escrow/:dossierId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MreDiasporaController.prototype, "getEscrow", null);
__decorate([
    (0, common_1.Post)("escrow/:dossierId/init"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MreDiasporaController.prototype, "initEscrow", null);
__decorate([
    (0, common_1.Post)("escrow/:dossierId/release/:milestoneId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Param)("milestoneId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MreDiasporaController.prototype, "releaseMilestone", null);
exports.MreDiasporaController = MreDiasporaController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("api/mre-diaspora"),
    __metadata("design:paramtypes", [mre_diaspora_service_1.MreDiasporaService])
], MreDiasporaController);
