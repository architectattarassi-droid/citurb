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
exports.AssociationsController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const associations_service_1 = require("./associations.service");
/**
 * AssociationsController — Sprint I
 *
 * Endpoints d'adhésion aux Cercles ASSOCIATION (SNASP, ANJAUM, ordres pro).
 *  - GET    /api/cercles/:slug/form-schema           (public — schéma formulaire)
 *  - POST   /api/cercles/:cercleId/apply             (auth — soumettre dossier)
 *  - GET    /api/cercles/:cercleId/my-application    (auth — état de ma demande)
 *  - GET    /api/cercles/:cercleId/applications      (modo — liste dossiers)
 *  - GET    /api/cercles/applications/:appId         (modo ou candidat — détail)
 *  - POST   /api/cercles/applications/:appId/approve (modo — valide)
 *  - POST   /api/cercles/applications/:appId/reject  (modo — refuse)
 *  - POST   /api/cercles/:cercleId/cotisation/:userId/mark-paid (modo — cotisation)
 */
let AssociationsController = class AssociationsController {
    assoc;
    constructor(assoc) {
        this.assoc = assoc;
    }
    uid(req) {
        return req?.user?.userId || req?.user?.sub;
    }
    // ── Public ──
    async formSchema(slug) {
        return { ok: true, data: await this.assoc.getFormSchema(slug) };
    }
    // ── Candidat ──
    async apply(req, cercleId, body) {
        return {
            ok: true,
            data: await this.assoc.submitApplication(cercleId, this.uid(req), body.formData, body.memberType),
        };
    }
    async myApp(req, cercleId) {
        return { ok: true, data: await this.assoc.getMyApplication(cercleId, this.uid(req)) };
    }
    async detail(req, appId) {
        return { ok: true, data: await this.assoc.getApplicationDetail(appId, this.uid(req)) };
    }
    // ── Modo ──
    async list(req, cercleId, status) {
        return {
            ok: true,
            data: await this.assoc.listApplications(cercleId, this.uid(req), status),
        };
    }
    async approve(req, appId, body) {
        return { ok: true, data: await this.assoc.approveApplication(appId, this.uid(req), body) };
    }
    async reject(req, appId, body) {
        return { ok: true, data: await this.assoc.rejectApplication(appId, this.uid(req), body.reason) };
    }
    async markPaid(req, cercleId, userId, body) {
        return {
            ok: true,
            data: await this.assoc.markCotisationPaid(cercleId, userId, this.uid(req), new Date(body.expireAt)),
        };
    }
};
exports.AssociationsController = AssociationsController;
__decorate([
    (0, common_1.Get)(":slug/form-schema"),
    __param(0, (0, common_1.Param)("slug")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AssociationsController.prototype, "formSchema", null);
__decorate([
    (0, common_1.Post)(":cercleId/apply"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AssociationsController.prototype, "apply", null);
__decorate([
    (0, common_1.Get)(":cercleId/my-application"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AssociationsController.prototype, "myApp", null);
__decorate([
    (0, common_1.Get)("applications/:appId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("appId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AssociationsController.prototype, "detail", null);
__decorate([
    (0, common_1.Get)(":cercleId/applications"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Query)("status")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AssociationsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)("applications/:appId/approve"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("appId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AssociationsController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)("applications/:appId/reject"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("appId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AssociationsController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(":cercleId/cotisation/:userId/mark-paid"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Param)("userId")),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], AssociationsController.prototype, "markPaid", null);
exports.AssociationsController = AssociationsController = __decorate([
    (0, tome_at_1.Tome)("tome8"),
    (0, common_1.Controller)("api/cercles"),
    __metadata("design:paramtypes", [associations_service_1.AssociationsService])
], AssociationsController);
