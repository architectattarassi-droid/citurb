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
exports.AdsController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../../tomes/tome-5/auth/roles.guard");
const roles_decorator_1 = require("../../tomes/tome-5/auth/roles.decorator");
const ads_service_1 = require("./ads.service");
/**
 * AdsController — régie pub "promo fournisseurs matériaux".
 *  - Public : cartes sponsorisées par lot (devis client) + clic.
 *  - Fournisseur (JWT) : demander une mise en avant sur une de ses offres.
 *  - Admin (ADMIN/OWNER/OPS) : modérer (activer/pauser/rejeter).
 */
let AdsController = class AdsController {
    ads;
    constructor(ads) {
        this.ads = ads;
    }
    /** Public — cartes sponsorisées pour une liste de lots (ex. ?lots=REV,PEI). */
    async materials(lots) {
        const list = (lots || "").split(",").map((s) => s.trim()).filter(Boolean);
        return { ok: true, byLot: await this.ads.materials(list) };
    }
    /** Public — enregistre un clic sur une carte sponsorisée. */
    async click(offerId) {
        return this.ads.click(offerId);
    }
    /** Fournisseur — demande une mise en avant (modération admin ensuite). */
    async requestPromo(offerId, body, req) {
        return this.ads.requestPromo(req.user.userId, offerId, body?.lot);
    }
    /** Fournisseur — ses mises en avant + stats. */
    async mine(req) {
        return { ok: true, promos: await this.ads.myPromos(req.user.userId) };
    }
    /** Admin — liste à modérer + actives. */
    async adminList() {
        return { ok: true, promos: await this.ads.adminList() };
    }
    /** Admin — activer (days) / pauser / rejeter. */
    async adminUpdate(offerId, body) {
        return this.ads.adminUpdate(offerId, body?.action, body?.days);
    }
};
exports.AdsController = AdsController;
__decorate([
    (0, common_1.Get)("materials"),
    __param(0, (0, common_1.Query)("lots")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "materials", null);
__decorate([
    (0, common_1.Post)("click/:offerId"),
    __param(0, (0, common_1.Param)("offerId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "click", null);
__decorate([
    (0, common_1.Post)("promos/:offerId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("offerId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "requestPromo", null);
__decorate([
    (0, common_1.Get)("promos/mine"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "mine", null);
__decorate([
    (0, common_1.Get)("admin"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "adminList", null);
__decorate([
    (0, common_1.Patch)("admin/:offerId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Param)("offerId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "adminUpdate", null);
exports.AdsController = AdsController = __decorate([
    (0, tome_at_1.Tome)("tome9"),
    (0, common_1.Controller)("api/ads"),
    __metadata("design:paramtypes", [ads_service_1.AdsService])
], AdsController);
