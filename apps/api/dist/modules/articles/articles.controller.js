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
exports.ArticlesController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../../tomes/tome-5/auth/roles.guard");
const roles_decorator_1 = require("../../tomes/tome-5/auth/roles.decorator");
const articles_service_1 = require("./articles.service");
/**
 * Articles — Media / Blog endpoints
 *
 * Public (sans auth) :
 *   - GET  /api/articles            → liste PUBLISHED uniquement
 *   - GET  /api/articles/slug/:slug → lecture publique d'un article (+views++)
 *
 * Admin (auth ADMIN/OWNER/OPS) :
 *   - GET    /api/articles/admin           → liste tous statuts (DRAFT + PUBLISHED + REJECTED)
 *   - GET    /api/articles/admin/:id       → lecture par ID (peu importe le statut)
 *   - POST   /api/articles/admin           → créer article
 *   - PATCH  /api/articles/admin/:id       → mettre à jour
 *   - DELETE /api/articles/admin/:id       → supprimer
 *
 * Le slug est généré automatiquement à partir du titre si non fourni.
 * Le passage en PUBLISHED stamp publishedAt automatiquement.
 */
let ArticlesController = class ArticlesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    // ─── PUBLIC ──────────────────────────────────────────────────────────
    /** Liste publique : uniquement PUBLISHED, paginée. */
    async listPublic(lang, category, q, limitStr, offsetStr) {
        const limit = limitStr ? Math.min(Number(limitStr) || 20, 100) : 20;
        const offset = offsetStr ? Math.max(Number(offsetStr) || 0, 0) : 0;
        return this.svc.listPublic({ lang, category, q, limit, offset });
    }
    /** Lecture publique par slug. Incrémente le compteur de vues. */
    async getPublic(slug) {
        return this.svc.getBySlugPublic(slug);
    }
    // ─── ADMIN ───────────────────────────────────────────────────────────
    async listAdmin(status, lang, category, authorId, q, limitStr, offsetStr) {
        const limit = limitStr ? Math.min(Number(limitStr) || 20, 100) : 20;
        const offset = offsetStr ? Math.max(Number(offsetStr) || 0, 0) : 0;
        return this.svc.list({ status, lang, category, authorId, q, limit, offset });
    }
    async getAdmin(id) {
        return this.svc.getById(id);
    }
    async create(body, req) {
        if (!body)
            throw new common_1.BadRequestException("body manquant");
        const authorId = body.authorId ?? req.user?.userId ?? req.user?.id;
        return this.svc.create({ ...body, authorId });
    }
    async update(id, body) {
        if (!body)
            throw new common_1.BadRequestException("body manquant");
        return this.svc.update(id, body);
    }
    /**
     * Édition par l'AUTEUR du post (ou un admin) — n'importe quel user authentifié,
     * le contrôle de propriété est fait dans le service. Garde l'URL (slug) et le
     * statut de publication ; ne modifie que le contenu (texte/image/vidéo).
     */
    async updateMine(id, body, req) {
        if (!body)
            throw new common_1.BadRequestException("body manquant");
        return this.svc.updateOwned(id, { userId: req.user?.userId ?? req.user?.id, role: req.user?.role }, body);
    }
    async delete(id) {
        return this.svc.delete(id);
    }
};
exports.ArticlesController = ArticlesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("lang")),
    __param(1, (0, common_1.Query)("category")),
    __param(2, (0, common_1.Query)("q")),
    __param(3, (0, common_1.Query)("limit")),
    __param(4, (0, common_1.Query)("offset")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "listPublic", null);
__decorate([
    (0, common_1.Get)("slug/:slug"),
    __param(0, (0, common_1.Param)("slug")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "getPublic", null);
__decorate([
    (0, common_1.Get)("admin"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Query)("status")),
    __param(1, (0, common_1.Query)("lang")),
    __param(2, (0, common_1.Query)("category")),
    __param(3, (0, common_1.Query)("authorId")),
    __param(4, (0, common_1.Query)("q")),
    __param(5, (0, common_1.Query)("limit")),
    __param(6, (0, common_1.Query)("offset")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "listAdmin", null);
__decorate([
    (0, common_1.Get)("admin/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "getAdmin", null);
__decorate([
    (0, common_1.Post)("admin"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)("admin/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)("mine/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "updateMine", null);
__decorate([
    (0, common_1.Delete)("admin/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "delete", null);
exports.ArticlesController = ArticlesController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("api/articles"),
    __metadata("design:paramtypes", [articles_service_1.ArticlesService])
], ArticlesController);
