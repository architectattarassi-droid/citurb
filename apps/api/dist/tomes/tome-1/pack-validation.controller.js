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
exports.PackValidationController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../tome-at");
const jwt_auth_guard_1 = require("../tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../tome-5/auth/roles.guard");
const roles_decorator_1 = require("../tome-5/auth/roles.decorator");
const pack_validation_service_1 = require("./pack-validation.service");
/**
 * PackValidationController — API admin pour la workflow de validation des packs.
 *
 * Endpoints (tous sous /api/cc/pack-validation, auth ADMIN/OWNER/OPS):
 *  GET  pending                       → liste des dossiers en attente de validation
 *  GET  :dossierId                    → état détaillé pour un dossier
 *  POST :dossierId/mark-paid          → marquer paiement reçu manuellement (cas hors Stripe)
 *  PATCH :dossierId/validate          → valider le pack (admin clique "Activer")
 *  PATCH :dossierId/revoke            → révoquer (issue détectée)
 */
let PackValidationController = class PackValidationController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async listPending(take) {
        const items = await this.svc.listPending({ take: take ? +take : 50 });
        return { ok: true, items };
    }
    async get(id) {
        return { ok: true, packValidation: await this.svc.getState(id) };
    }
    async markPaid(id, body, req) {
        const author = req.user?.email || req.user?.userId || "admin";
        const state = await this.svc.handlePaymentReceived({
            dossierId: id,
            paymentRef: body.paymentRef ?? `MANUAL-${Date.now()}`,
            amount: Number(body.amount),
            currency: body.currency,
            author,
        });
        return { ok: true, packValidation: state };
    }
    async validate(id, body, req) {
        const author = req.user?.email || req.user?.userId || "admin";
        const state = await this.svc.adminValidate({ dossierId: id, author, note: body.note });
        return { ok: true, packValidation: state };
    }
    async revoke(id, body, req) {
        const author = req.user?.email || req.user?.userId || "admin";
        const state = await this.svc.adminRevoke({ dossierId: id, author, reason: body.reason });
        return { ok: true, packValidation: state };
    }
};
exports.PackValidationController = PackValidationController;
__decorate([
    (0, common_1.Get)("pending"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Query)("take")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PackValidationController.prototype, "listPending", null);
__decorate([
    (0, common_1.Get)(":dossierId"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS", "CLIENT"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PackValidationController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(":dossierId/mark-paid"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PackValidationController.prototype, "markPaid", null);
__decorate([
    (0, common_1.Patch)(":dossierId/validate"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PackValidationController.prototype, "validate", null);
__decorate([
    (0, common_1.Patch)(":dossierId/revoke"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PackValidationController.prototype, "revoke", null);
exports.PackValidationController = PackValidationController = __decorate([
    (0, tome_at_1.Tome)("tome1"),
    (0, common_1.Controller)("api/cc/pack-validation"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [pack_validation_service_1.PackValidationService])
], PackValidationController);
