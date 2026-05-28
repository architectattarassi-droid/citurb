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
exports.OpciTokeniseController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const opci_tokenise_service_1 = require("./opci-tokenise.service");
/**
 * OpciTokeniseController — OPCI tokenisé (Tome 4).
 * Listing public ; souscription + portfolio JWT-gated ; audit AMMC public.
 */
let OpciTokeniseController = class OpciTokeniseController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    uid(req) { return req?.user?.id || req?.user?.sub || req?.user?.userId; }
    offerings(status) {
        return { ok: true, offerings: this.svc.listOfferings(status) };
    }
    offering(id) {
        const o = this.svc.getOffering(id);
        return o ? { ok: true, offering: o } : { ok: false, error: "Offering introuvable" };
    }
    async souscrire(id, body, req) {
        const sub = await this.svc.souscrire(id, this.uid(req), body.nbParts);
        return { ok: true, souscription: sub };
    }
    portfolio(req) {
        return { ok: true, portfolio: this.svc.portfolio(this.uid(req)) };
    }
    auditAmmc(id) {
        return { ok: true, audit: this.svc.auditAmmc(id) };
    }
};
exports.OpciTokeniseController = OpciTokeniseController;
__decorate([
    (0, common_1.Get)("offerings"),
    __param(0, (0, common_1.Query)("status")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OpciTokeniseController.prototype, "offerings", null);
__decorate([
    (0, common_1.Get)("offering/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OpciTokeniseController.prototype, "offering", null);
__decorate([
    (0, common_1.Post)("offering/:id/souscription"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OpciTokeniseController.prototype, "souscrire", null);
__decorate([
    (0, common_1.Get)("portfolio"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OpciTokeniseController.prototype, "portfolio", null);
__decorate([
    (0, common_1.Get)("offering/:id/audit-ammc"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OpciTokeniseController.prototype, "auditAmmc", null);
exports.OpciTokeniseController = OpciTokeniseController = __decorate([
    (0, tome_at_1.Tome)("tome4"),
    (0, common_1.Controller)("api/opci-tokenise"),
    __metadata("design:paramtypes", [opci_tokenise_service_1.OpciTokeniseService])
], OpciTokeniseController);
