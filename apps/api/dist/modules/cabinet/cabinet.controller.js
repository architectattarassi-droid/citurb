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
exports.CabinetController = void 0;
/**
 * CabinetController — endpoints fiche cabinet (publics + owner).
 *
 *  Publics (sans auth) :
 *    GET  /api/pro/sitemap.xml             → sitemap cabinets + projets publiés (XML)
 *    GET  /api/pro/:slug                   → fiche cabinet + projets publiés + médias
 *    GET  /api/pro/:slug/schema.json       → JSON-LD agrégé (ProfessionalService + CreativeWork + Image/VideoObject)
 *    GET  /api/pro/:slug/projet/:projectSlug → projet public + médias
 *
 *  Owner (JWT, owner = userId du ProProfile) :
 *    POST   /api/pro/me/slug                          → assure/retourne le slug public
 *    GET    /api/pro/me/projects
 *    POST   /api/pro/me/projects
 *    PATCH  /api/pro/me/projects/:id
 *    DELETE /api/pro/me/projects/:id
 *    PATCH  /api/pro/me/projects/:id/publish          { published: boolean }
 *    POST   /api/pro/me/projects/:id/media
 *    DELETE /api/pro/me/projects/:id/media/:mid
 *    PATCH  /api/pro/me/projects/:id/media/reorder    [{id, position}]
 */
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const cabinet_service_1 = require("./cabinet.service");
const uid = (req) => String(req.user?.userId ?? req.user?.sub ?? req.user?.id ?? "");
let CabinetController = class CabinetController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    // ── PUBLIC ──────────────────────────────────────────────────────────
    async sitemap(res) {
        const xml = await this.svc.getSitemapXml();
        res.send(xml);
    }
    async publicCabinet(slug) {
        return { ok: true, data: await this.svc.getPublicCabinet(slug) };
    }
    async schemaJson(slug, res) {
        const data = await this.svc.getSchemaJsonForCabinet(slug);
        res.send(JSON.stringify(data, null, 2));
    }
    async publicProject(slug, projectSlug) {
        return { ok: true, data: await this.svc.getPublicProject(slug, projectSlug) };
    }
    // ── OWNER (JWT) ─────────────────────────────────────────────────────
    async ensureMySlug(req) {
        return { ok: true, data: await this.svc.ensureCabinetSlug(uid(req)) };
    }
    async listMyProjects(req) {
        return { ok: true, data: await this.svc.listMyProjects(uid(req)) };
    }
    async createMyProject(req, body) {
        if (!body)
            throw new common_1.BadRequestException("body requis");
        return { ok: true, data: await this.svc.createMyProject(uid(req), body) };
    }
    async updateMyProject(req, id, body) {
        return { ok: true, data: await this.svc.updateMyProject(uid(req), id, body || {}) };
    }
    async deleteMyProject(req, id) {
        return this.svc.deleteMyProject(uid(req), id);
    }
    async publishMyProject(req, id, body) {
        if (typeof body?.published !== "boolean")
            throw new common_1.BadRequestException("published: boolean requis");
        return { ok: true, data: await this.svc.setPublished(uid(req), id, body.published) };
    }
    async addMyMedia(req, id, body) {
        if (!body)
            throw new common_1.BadRequestException("body requis");
        return { ok: true, data: await this.svc.addMyProjectMedia(uid(req), id, body) };
    }
    async deleteMyMedia(req, id, mid) {
        return this.svc.deleteMyMedia(uid(req), id, mid);
    }
    async reorderMyMedia(req, id, body) {
        if (!Array.isArray(body?.order))
            throw new common_1.BadRequestException("order: array requis");
        return this.svc.reorderMyMedia(uid(req), id, body.order);
    }
};
exports.CabinetController = CabinetController;
__decorate([
    (0, common_1.Get)("sitemap.xml"),
    (0, common_1.Header)("Content-Type", "application/xml; charset=utf-8"),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CabinetController.prototype, "sitemap", null);
__decorate([
    (0, common_1.Get)(":slug"),
    __param(0, (0, common_1.Param)("slug")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CabinetController.prototype, "publicCabinet", null);
__decorate([
    (0, common_1.Get)(":slug/schema.json"),
    (0, common_1.Header)("Content-Type", "application/ld+json; charset=utf-8"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CabinetController.prototype, "schemaJson", null);
__decorate([
    (0, common_1.Get)(":slug/projet/:projectSlug"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Param)("projectSlug")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CabinetController.prototype, "publicProject", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Post)("me/slug"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CabinetController.prototype, "ensureMySlug", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Get)("me/projects"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CabinetController.prototype, "listMyProjects", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Post)("me/projects"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CabinetController.prototype, "createMyProject", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Patch)("me/projects/:id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CabinetController.prototype, "updateMyProject", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Delete)("me/projects/:id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CabinetController.prototype, "deleteMyProject", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Patch)("me/projects/:id/publish"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CabinetController.prototype, "publishMyProject", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Post)("me/projects/:id/media"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CabinetController.prototype, "addMyMedia", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Delete)("me/projects/:id/media/:mid"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Param)("mid")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CabinetController.prototype, "deleteMyMedia", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Patch)("me/projects/:id/media/reorder"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CabinetController.prototype, "reorderMyMedia", null);
exports.CabinetController = CabinetController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("api/pro"),
    __metadata("design:paramtypes", [cabinet_service_1.CabinetService])
], CabinetController);
