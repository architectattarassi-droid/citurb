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
exports.CerclesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { diskStorage: _ds } = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const _POST_UPLOAD_DIR = (0, path_1.join)(process.env.UPLOADS_DIR || (0, path_1.join)(process.cwd(), "uploads"), "cercles-posts");
try {
    (0, fs_1.mkdirSync)(_POST_UPLOAD_DIR, { recursive: true });
}
catch { }
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const cercles_service_1 = require("./cercles.service");
const memberships_service_1 = require("./memberships.service");
const posts_service_1 = require("./posts.service");
const rooms_service_1 = require("./rooms.service");
const annuaire_service_1 = require("./annuaire.service");
const feed_service_1 = require("./feed.service");
/**
 * CerclesController — Sprint C0–C3
 *
 * Toutes les routes préfixées /api/cercles, protégées JWT.
 * Format réponse standard CITURBAREA : { data, meta? } sous wrapper { ok }.
 *
 * Spec : CERCLES-prompt-claude-code.md §2.2
 */
let CerclesController = class CerclesController {
    cercles;
    memberships;
    posts;
    rooms;
    annuaire;
    feed;
    constructor(cercles, memberships, posts, rooms, annuaire, feed) {
        this.cercles = cercles;
        this.memberships = memberships;
        this.posts = posts;
        this.rooms = rooms;
        this.annuaire = annuaire;
        this.feed = feed;
    }
    uid(req) {
        return req?.user?.userId || req?.user?.sub;
    }
    displayName(req) {
        return req?.user?.username || req?.user?.email || "Membre";
    }
    // ── Feed (Sprint D2) ──────────────────────────────────────────
    async homeFeed(req) {
        return { ok: true, data: await this.feed.homeFeed(this.uid(req)) };
    }
    async discoveryCercles(req) {
        return { ok: true, data: await this.feed.discoveryCercles(this.uid(req)) };
    }
    // ── Annuaire pro (Sprint D1) ──────────────────────────────────
    async annuaireFacets() {
        return { ok: true, data: await this.annuaire.facets() };
    }
    async annuaireSearch(q) {
        const input = {
            q: q.q || undefined,
            metier: q.metier || undefined,
            classeBTP: q.classeBTP || undefined,
            region: q.region || undefined,
            specialite: q.specialite || undefined,
            isVerified: q.verified === "true" ? true : q.verified === "false" ? false : undefined,
            page: q.page ? Number(q.page) : undefined,
            pageSize: q.pageSize ? Number(q.pageSize) : undefined,
        };
        return { ok: true, ...(await this.annuaire.search(input)) };
    }
    async annuaireSuggestions(req, take) {
        return { ok: true, data: await this.annuaire.suggestions(this.uid(req), take ? Number(take) : 6) };
    }
    async myProfile(req) {
        return { ok: true, data: await this.annuaire.getMyProfile(this.uid(req)) };
    }
    async upsertMyProfile(req, body) {
        return { ok: true, data: await this.annuaire.upsertMyProfile(this.uid(req), body) };
    }
    async publicProfile(userIdOrId) {
        return { ok: true, data: await this.annuaire.getProfile(userIdOrId) };
    }
    async profileCercles(userIdOrId) {
        return { ok: true, data: await this.annuaire.getUserCercles(userIdOrId) };
    }
    async profilePosts(userIdOrId) {
        return { ok: true, data: await this.annuaire.getUserPosts(userIdOrId) };
    }
    async profileRooms(userIdOrId) {
        return { ok: true, data: await this.annuaire.getUserRooms(userIdOrId) };
    }
    async sendConnection(req, toUserId, body) {
        return { ok: true, data: await this.annuaire.sendConnection(this.uid(req), toUserId, body?.message) };
    }
    async acceptConnection(req, fromUserId) {
        return { ok: true, data: await this.annuaire.respondConnection(this.uid(req), fromUserId, true) };
    }
    async rejectConnection(req, fromUserId) {
        return { ok: true, data: await this.annuaire.respondConnection(this.uid(req), fromUserId, false) };
    }
    async connections(req) {
        return { ok: true, data: await this.annuaire.listConnections(this.uid(req)) };
    }
    async pendingConnections(req) {
        return { ok: true, data: await this.annuaire.listPendingRequests(this.uid(req)) };
    }
    // ── Cercles ──────────────────────────────────────────────────
    async list(req, page, pageSize) {
        return { ok: true, ...(await this.cercles.list(this.uid(req), {
                page: page ? Number(page) : undefined,
                pageSize: pageSize ? Number(pageSize) : undefined,
            })) };
    }
    async detail(req, slug) {
        return { ok: true, data: await this.cercles.getBySlug(slug, this.uid(req)) };
    }
    async create(req, body) {
        return { ok: true, data: await this.cercles.create(this.uid(req), body) };
    }
    async update(req, id, body) {
        return { ok: true, data: await this.cercles.update(id, this.uid(req), body) };
    }
    async softDelete(req, id) {
        return { ok: true, data: await this.cercles.softDelete(id, this.uid(req)) };
    }
    // ── Memberships ──────────────────────────────────────────────
    async join(req, cercleId) {
        return { ok: true, data: await this.memberships.join(cercleId, this.uid(req)) };
    }
    async leave(req, cercleId) {
        return { ok: true, data: await this.memberships.leave(cercleId, this.uid(req)) };
    }
    async invite(req, cercleId, body) {
        return { ok: true, data: await this.memberships.invite(cercleId, this.uid(req), body.userId, body.role) };
    }
    async acceptInvite(req, cercleId, userId) {
        if (userId !== this.uid(req)) {
            // Sécurité : seul le destinataire de l'invitation peut accepter
            return { ok: false, error: "Invitation destinée à un autre user" };
        }
        return { ok: true, data: await this.memberships.acceptInvitation(cercleId, userId) };
    }
    async members(req, cercleId) {
        return { ok: true, data: await this.memberships.listMembers(cercleId, this.uid(req)) };
    }
    async promote(req, cercleId, userId) {
        return { ok: true, data: await this.memberships.promote(cercleId, this.uid(req), userId) };
    }
    async ban(req, cercleId, userId) {
        return { ok: true, data: await this.memberships.ban(cercleId, this.uid(req), userId) };
    }
    // ── Posts ────────────────────────────────────────────────────
    async listPosts(req, cercleId, page, pageSize) {
        return { ok: true, ...(await this.posts.list(cercleId, this.uid(req), {
                page: page ? Number(page) : undefined,
                pageSize: pageSize ? Number(pageSize) : undefined,
            })) };
    }
    async postDetail(req, postId) {
        return { ok: true, data: await this.posts.detail(postId, this.uid(req)) };
    }
    async createPost(req, cercleId, body) {
        return { ok: true, data: await this.posts.createRoot(cercleId, this.uid(req), body) };
    }
    async uploadPostMedia(req, cercleId, files) {
        if (!files || files.length === 0)
            throw new common_1.BadRequestException("Aucun fichier");
        const allowed = /^(image|video|audio)\//;
        const out = files.map((f) => {
            if (!allowed.test(f.mimetype))
                throw new common_1.BadRequestException(`Type ${f.mimetype} non autorisé`);
            const fileKey = `cercles-posts/${cercleId}/${f.filename}`;
            return {
                fileKey, filename: f.originalname, mimeType: f.mimetype, sizeBytes: f.size,
                url: `/uploads/${fileKey}`,
            };
        });
        return { ok: true, data: out };
    }
    async reply(req, postId, body) {
        return { ok: true, data: await this.posts.reply(postId, this.uid(req), body.body) };
    }
    async editPost(req, postId, body) {
        return { ok: true, data: await this.posts.edit(postId, this.uid(req), body) };
    }
    async deletePost(req, postId) {
        return { ok: true, data: await this.posts.softDelete(postId, this.uid(req)) };
    }
    async upvote(req, postId) {
        return { ok: true, data: await this.posts.upvote(postId, this.uid(req)) };
    }
    async pin(req, postId, body) {
        return { ok: true, data: await this.posts.pin(postId, this.uid(req), body.pinned ?? true) };
    }
    async resolve(req, postId, body) {
        return { ok: true, data: await this.posts.resolve(postId, this.uid(req), body.resolved ?? true) };
    }
    // ── LiveRooms ────────────────────────────────────────────────
    async listRooms(req, cercleId) {
        return { ok: true, data: await this.rooms.list(cercleId, this.uid(req)) };
    }
    async createRoom(req, cercleId, body) {
        return { ok: true, data: await this.rooms.create(cercleId, this.uid(req), body) };
    }
    async roomDetail(req, cercleId, roomSlug) {
        return { ok: true, data: await this.rooms.getBySlug(cercleId, roomSlug, this.uid(req)) };
    }
    async startRoom(req, roomId) {
        return { ok: true, data: await this.rooms.start(roomId, this.uid(req)) };
    }
    async endRoom(req, roomId) {
        return { ok: true, data: await this.rooms.end(roomId, this.uid(req)) };
    }
    async joinRoom(req, roomId) {
        const userId = this.uid(req);
        const email = req?.user?.email || "";
        return { ok: true, data: await this.rooms.getJoinToken(roomId, userId, this.displayName(req), email) };
    }
    async cancelRoom(req, roomId) {
        return { ok: true, data: await this.rooms.cancel(roomId, this.uid(req)) };
    }
    // ── Egress (placeholder routes Sprint C4) ────────────────────
    async addEgressTarget(req, roomId, body) {
        return { ok: true, data: await this.rooms.addEgressTarget(roomId, this.uid(req), body) };
    }
    async removeEgressTarget(req, roomId, targetId) {
        return { ok: true, data: await this.rooms.removeEgressTarget(roomId, targetId, this.uid(req)) };
    }
    async egressStatus(req, roomId) {
        return { ok: true, data: await this.rooms.listEgressStatus(roomId, this.uid(req)) };
    }
};
exports.CerclesController = CerclesController;
__decorate([
    (0, common_1.Get)("feed"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "homeFeed", null);
__decorate([
    (0, common_1.Get)("discovery"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "discoveryCercles", null);
__decorate([
    (0, common_1.Get)("annuaire/facets"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "annuaireFacets", null);
__decorate([
    (0, common_1.Get)("annuaire/search"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "annuaireSearch", null);
__decorate([
    (0, common_1.Get)("annuaire/suggestions"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("take")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "annuaireSuggestions", null);
__decorate([
    (0, common_1.Get)("me/profile"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "myProfile", null);
__decorate([
    (0, common_1.Post)("me/profile"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "upsertMyProfile", null);
__decorate([
    (0, common_1.Get)("profile/:userIdOrId"),
    __param(0, (0, common_1.Param)("userIdOrId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "publicProfile", null);
__decorate([
    (0, common_1.Get)("profile/:userIdOrId/cercles"),
    __param(0, (0, common_1.Param)("userIdOrId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "profileCercles", null);
__decorate([
    (0, common_1.Get)("profile/:userIdOrId/posts"),
    __param(0, (0, common_1.Param)("userIdOrId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "profilePosts", null);
__decorate([
    (0, common_1.Get)("profile/:userIdOrId/rooms"),
    __param(0, (0, common_1.Param)("userIdOrId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "profileRooms", null);
__decorate([
    (0, common_1.Post)("connections/:toUserId"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("toUserId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "sendConnection", null);
__decorate([
    (0, common_1.Post)("connections/:fromUserId/accept"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("fromUserId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "acceptConnection", null);
__decorate([
    (0, common_1.Post)("connections/:fromUserId/reject"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("fromUserId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "rejectConnection", null);
__decorate([
    (0, common_1.Get)("connections"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "connections", null);
__decorate([
    (0, common_1.Get)("connections/pending"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "pendingConnections", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("page")),
    __param(2, (0, common_1.Query)("pageSize")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(":slug"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("slug")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "softDelete", null);
__decorate([
    (0, common_1.Post)(":cercleId/join"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "join", null);
__decorate([
    (0, common_1.Post)(":cercleId/leave"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "leave", null);
__decorate([
    (0, common_1.Post)(":cercleId/invitations"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "invite", null);
__decorate([
    (0, common_1.Post)(":cercleId/invitations/:userId/accept"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Param)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "acceptInvite", null);
__decorate([
    (0, common_1.Get)(":cercleId/members"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "members", null);
__decorate([
    (0, common_1.Post)(":cercleId/moderators/:userId"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Param)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "promote", null);
__decorate([
    (0, common_1.Delete)(":cercleId/members/:userId"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Param)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "ban", null);
__decorate([
    (0, common_1.Get)(":cercleId/posts"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Query)("page")),
    __param(3, (0, common_1.Query)("pageSize")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "listPosts", null);
__decorate([
    (0, common_1.Get)(":cercleId/posts/:postId"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("postId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "postDetail", null);
__decorate([
    (0, common_1.Post)(":cercleId/posts"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "createPost", null);
__decorate([
    (0, common_1.Post)(":cercleId/posts/upload"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)("files", 6, {
        storage: _ds({
            destination: (req, _file, cb) => {
                const cId = req.params?.cercleId;
                const dir = (0, path_1.join)(_POST_UPLOAD_DIR, cId || "_misc");
                try {
                    (0, fs_1.mkdirSync)(dir, { recursive: true });
                }
                catch { }
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const safe = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
                cb(null, `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${safe}`);
            },
        }),
        limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB pour vidéos
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Array]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "uploadPostMedia", null);
__decorate([
    (0, common_1.Post)(":cercleId/posts/:postId/replies"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("postId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "reply", null);
__decorate([
    (0, common_1.Patch)(":cercleId/posts/:postId"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("postId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "editPost", null);
__decorate([
    (0, common_1.Delete)(":cercleId/posts/:postId"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("postId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "deletePost", null);
__decorate([
    (0, common_1.Post)(":cercleId/posts/:postId/upvote"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("postId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "upvote", null);
__decorate([
    (0, common_1.Post)(":cercleId/posts/:postId/pin"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("postId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "pin", null);
__decorate([
    (0, common_1.Post)(":cercleId/posts/:postId/resolve"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("postId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "resolve", null);
__decorate([
    (0, common_1.Get)(":cercleId/rooms"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "listRooms", null);
__decorate([
    (0, common_1.Post)(":cercleId/rooms"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "createRoom", null);
__decorate([
    (0, common_1.Get)(":cercleId/rooms/:roomSlug"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Param)("roomSlug")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "roomDetail", null);
__decorate([
    (0, common_1.Post)(":cercleId/rooms/:roomId/start"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("roomId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "startRoom", null);
__decorate([
    (0, common_1.Post)(":cercleId/rooms/:roomId/end"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("roomId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "endRoom", null);
__decorate([
    (0, common_1.Post)(":cercleId/rooms/:roomId/join"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("roomId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "joinRoom", null);
__decorate([
    (0, common_1.Delete)(":cercleId/rooms/:roomId"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("roomId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "cancelRoom", null);
__decorate([
    (0, common_1.Post)(":cercleId/rooms/:roomId/broadcast/targets"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("roomId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "addEgressTarget", null);
__decorate([
    (0, common_1.Delete)(":cercleId/rooms/:roomId/broadcast/targets/:targetId"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("roomId")),
    __param(2, (0, common_1.Param)("targetId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "removeEgressTarget", null);
__decorate([
    (0, common_1.Get)(":cercleId/rooms/:roomId/broadcast/status"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("roomId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CerclesController.prototype, "egressStatus", null);
exports.CerclesController = CerclesController = __decorate([
    (0, tome_at_1.Tome)("tome8"),
    (0, common_1.Controller)("api/cercles"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [cercles_service_1.CerclesService,
        memberships_service_1.MembershipsService,
        posts_service_1.PostsService,
        rooms_service_1.RoomsService,
        annuaire_service_1.AnnuaireService,
        feed_service_1.FeedService])
], CerclesController);
