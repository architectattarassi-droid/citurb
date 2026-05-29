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
exports.CpsDossierController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const cps_dossier_service_1 = require("./cps-dossier.service");
const actorOf = (req) => ({ userId: req.user?.userId ?? req.user?.sub, role: req.user?.role });
/**
 * Tome 2 — CPS lié au dossier (payant, filigrané, signé).
 *  - POST /api/cps/dossier/:id/generate        CPS gardé (porte P1/P2/P3 + paywall + propriété)
 *  - POST /api/cps/dossier/:id/generate/html   HTML filigrané (aperçu/impression)
 *  - GET  /api/cps/dossier/:id/signatures      signataires requis + état
 *  - POST /api/cps/dossier/:id/sign            apposer une signature scellée
 */
let CpsDossierController = class CpsDossierController {
    service;
    constructor(service) {
        this.service = service;
    }
    async generate(dossierId, body, req) {
        return this.service.generate(dossierId, actorOf(req), body ?? {});
    }
    async generateHtml(dossierId, body, req, res) {
        const doc = await this.service.generate(dossierId, actorOf(req), body ?? {});
        res.send(doc.html);
    }
    async signatures(dossierId, req) {
        return this.service.getSignatures(dossierId, actorOf(req));
    }
    async sign(dossierId, body, req) {
        return this.service.addSignature(dossierId, actorOf(req), body);
    }
};
exports.CpsDossierController = CpsDossierController;
__decorate([
    (0, common_1.Post)(":dossierId/generate"),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CpsDossierController.prototype, "generate", null);
__decorate([
    (0, common_1.Post)(":dossierId/generate/html"),
    (0, common_1.HttpCode)(200),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], CpsDossierController.prototype, "generateHtml", null);
__decorate([
    (0, common_1.Get)(":dossierId/signatures"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CpsDossierController.prototype, "signatures", null);
__decorate([
    (0, common_1.Post)(":dossierId/sign"),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CpsDossierController.prototype, "sign", null);
exports.CpsDossierController = CpsDossierController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("api/cps/dossier"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [cps_dossier_service_1.CpsDossierService])
], CpsDossierController);
