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
exports.AvanceTresorerieController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const avance_tresorerie_service_1 = require("./avance-tresorerie.service");
/**
 * AvanceTresorerieController — avance de trésorerie chef de chantier (Tome 3).
 */
let AvanceTresorerieController = class AvanceTresorerieController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    uid(req) {
        return req?.user?.id || req?.user?.sub || req?.user?.userId;
    }
    async eligibility(req) {
        const rep = await this.svc.computeReputation(this.uid(req));
        return { ok: true, ...rep };
    }
    async demande(body, req) {
        const avance = await this.svc.demander({ ...body, userId: this.uid(req) });
        return { ok: true, avance };
    }
    async list(dossierId) {
        const avances = await this.svc.listForDossier(dossierId);
        return { ok: true, avances };
    }
    async accepter(d, a) {
        return { ok: true, avance: await this.svc.accepter(d, a) };
    }
    async disburser(d, a) {
        return { ok: true, avance: await this.svc.disburser(d, a) };
    }
};
exports.AvanceTresorerieController = AvanceTresorerieController;
__decorate([
    (0, common_1.Get)("eligibility"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AvanceTresorerieController.prototype, "eligibility", null);
__decorate([
    (0, common_1.Post)("demande"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AvanceTresorerieController.prototype, "demande", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AvanceTresorerieController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(":dossierId/:avanceId/accepter"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Param)("avanceId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AvanceTresorerieController.prototype, "accepter", null);
__decorate([
    (0, common_1.Post)(":dossierId/:avanceId/disburser"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Param)("avanceId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AvanceTresorerieController.prototype, "disburser", null);
exports.AvanceTresorerieController = AvanceTresorerieController = __decorate([
    (0, tome_at_1.Tome)("tome3"),
    (0, common_1.Controller)("api/avance-tresorerie"),
    __metadata("design:paramtypes", [avance_tresorerie_service_1.AvanceTresorerieService])
], AvanceTresorerieController);
