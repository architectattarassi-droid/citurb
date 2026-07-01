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
exports.SeoController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../../tomes/tome-5/auth/roles.guard");
const roles_decorator_1 = require("../../tomes/tome-5/auth/roles.decorator");
const seo_service_1 = require("./seo.service");
/**
 * SeoController — cockpit SEO/GEO (backoffice). Tout sous /api/cc/seo,
 * réservé ADMIN/OWNER/OPS.
 */
let SeoController = class SeoController {
    seo;
    constructor(seo) {
        this.seo = seo;
    }
    async audit() { return { ok: true, audit: await this.seo.audit() }; }
    async getUrls() { return { ok: true, urls: await this.seo.getAuditUrls() }; }
    async setUrls(body) { return this.seo.setAuditUrls(body?.urls || []); }
    async keywords() { return { ok: true, keywords: await this.seo.listKeywords() }; }
    async upsertKeyword(body) { return { ok: true, keywords: await this.seo.upsertKeyword(body) }; }
    async removeKeyword(id) { return { ok: true, keywords: await this.seo.removeKeyword(id) }; }
    async competitors() { return { ok: true, competitors: await this.seo.listCompetitors() }; }
    async upsertCompetitor(body) { return { ok: true, competitors: await this.seo.upsertCompetitor(body) }; }
    async inspect(id) { return { ok: true, competitors: await this.seo.inspectCompetitor(id) }; }
    async removeCompetitor(id) { return { ok: true, competitors: await this.seo.removeCompetitor(id) }; }
};
exports.SeoController = SeoController;
__decorate([
    (0, common_1.Get)("audit"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "audit", null);
__decorate([
    (0, common_1.Get)("audit/urls"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "getUrls", null);
__decorate([
    (0, common_1.Put)("audit/urls"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "setUrls", null);
__decorate([
    (0, common_1.Get)("keywords"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "keywords", null);
__decorate([
    (0, common_1.Post)("keywords"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "upsertKeyword", null);
__decorate([
    (0, common_1.Delete)("keywords/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "removeKeyword", null);
__decorate([
    (0, common_1.Get)("competitors"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "competitors", null);
__decorate([
    (0, common_1.Post)("competitors"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "upsertCompetitor", null);
__decorate([
    (0, common_1.Post)("competitors/:id/inspect"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "inspect", null);
__decorate([
    (0, common_1.Delete)("competitors/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "removeCompetitor", null);
exports.SeoController = SeoController = __decorate([
    (0, tome_at_1.Tome)("tome9"),
    (0, common_1.Controller)("api/cc/seo"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __metadata("design:paramtypes", [seo_service_1.SeoService])
], SeoController);
