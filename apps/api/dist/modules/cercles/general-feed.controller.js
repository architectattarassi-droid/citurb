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
exports.GeneralFeedController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const pro_access_guard_1 = require("./pro-access.guard");
const posts_service_1 = require("./posts.service");
/**
 * GeneralFeedController — Sprint M : séparation feed général / posts de cercle.
 *
 * Posts généraux = CerclePost avec cercleId NULL.
 *  - Visibles + partageables par TOUS (même non connectés) → SEO / promotion
 *  - Tout pro connecté peut publier dans le fil général
 *  - Like / commentaire : authentification requise
 *
 * Routes :
 *  - GET  /api/feed                 (auth)  fil général + flag `liked`
 *  - POST /api/feed/posts           (auth)  créer un post général
 *  - GET  /api/feed/posts/:id       (auth)  détail (avec replies) pour membre connecté
 *  - POST /api/feed/posts/:id/upvote  (auth)
 *  - POST /api/feed/posts/:id/replies (auth)
 *  - GET  /api/feed/public          (PUBLIC) fil général sans auth (SEO)
 *  - GET  /api/feed/public/:id      (PUBLIC) détail post général sans auth (partage)
 */
let GeneralFeedController = class GeneralFeedController {
    posts;
    constructor(posts) {
        this.posts = posts;
    }
    uid(req) {
        return req?.user?.userId || req?.user?.sub;
    }
    // ── Connecté ───────────────────────────────────────────────────
    async generalFeed(req, page) {
        return { ok: true, ...(await this.posts.generalFeed(this.uid(req), { page: page ? Number(page) : 1 })) };
    }
    async create(req, body) {
        return { ok: true, data: await this.posts.createRoot(null, this.uid(req), body) };
    }
    async detail(req, id) {
        return { ok: true, data: await this.posts.detail(id, this.uid(req)) };
    }
    async upvote(req, id) {
        return { ok: true, data: await this.posts.upvote(id, this.uid(req)) };
    }
    async reply(req, id, body) {
        return { ok: true, data: await this.posts.reply(id, this.uid(req), body?.body) };
    }
    /**
     * Édition d'un post / commentaire par son AUTEUR (ou un modérateur de cercle).
     * Ne change que titre + texte → l'URL /post/:id (basée sur l'id) reste identique.
     */
    async edit(req, id, body) {
        return { ok: true, data: await this.posts.edit(id, this.uid(req), body) };
    }
    /** Suppression d'un post / commentaire (auteur OU admin/owner). */
    async delete(req, id) {
        return this.posts.softDelete(id, this.uid(req), req?.user?.role);
    }
    // ── Public (sans authentification) ─────────────────────────────
    async publicFeed(page) {
        return { ok: true, ...(await this.posts.publicFeed({ page: page ? Number(page) : 1 })) };
    }
    async publicDetail(id) {
        return { ok: true, data: await this.posts.publicDetail(id) };
    }
};
exports.GeneralFeedController = GeneralFeedController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, pro_access_guard_1.ProAccessGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("page")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GeneralFeedController.prototype, "generalFeed", null);
__decorate([
    (0, common_1.Post)("posts"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, pro_access_guard_1.ProAccessGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GeneralFeedController.prototype, "create", null);
__decorate([
    (0, common_1.Get)("posts/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, pro_access_guard_1.ProAccessGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GeneralFeedController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)("posts/:id/upvote"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, pro_access_guard_1.ProAccessGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GeneralFeedController.prototype, "upvote", null);
__decorate([
    (0, common_1.Post)("posts/:id/replies"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, pro_access_guard_1.ProAccessGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], GeneralFeedController.prototype, "reply", null);
__decorate([
    (0, common_1.Patch)("posts/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, pro_access_guard_1.ProAccessGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], GeneralFeedController.prototype, "edit", null);
__decorate([
    (0, common_1.Delete)("posts/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, pro_access_guard_1.ProAccessGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GeneralFeedController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)("public"),
    __param(0, (0, common_1.Query)("page")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GeneralFeedController.prototype, "publicFeed", null);
__decorate([
    (0, common_1.Get)("public/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GeneralFeedController.prototype, "publicDetail", null);
exports.GeneralFeedController = GeneralFeedController = __decorate([
    (0, tome_at_1.Tome)("tome8"),
    (0, common_1.Controller)("api/feed"),
    __metadata("design:paramtypes", [posts_service_1.PostsService])
], GeneralFeedController);
