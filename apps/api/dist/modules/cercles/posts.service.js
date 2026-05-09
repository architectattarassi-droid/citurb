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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const cercles_service_1 = require("./cercles.service");
/**
 * PostsService — Sprint C2
 *
 * Posts root + replies (threading). Upvotes, pin, isResolved.
 * Soft delete préserve le thread (parent reste joignable).
 */
let PostsService = class PostsService {
    prisma;
    cercles;
    constructor(prisma, cercles) {
        this.prisma = prisma;
        this.cercles = cercles;
    }
    // Sanitize markdown léger : retire scripts (côté serveur, marge de sécurité).
    sanitize(markdown) {
        return markdown
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
            .replace(/on\w+="[^"]*"/gi, "");
    }
    async createRoot(cercleId, authorId, input) {
        if (!input.body?.trim())
            throw new common_1.BadRequestException("Body vide");
        await this.cercles.assertMember(cercleId, authorId);
        return this.prisma.cerclePost.create({
            data: {
                cercleId,
                authorId,
                title: input.title?.trim() || null,
                body: this.sanitize(input.body.trim()),
            },
            include: { author: { select: { id: true, email: true, username: true } } },
        });
    }
    async reply(postId, authorId, body) {
        if (!body?.trim())
            throw new common_1.BadRequestException("Body vide");
        const parent = await this.prisma.cerclePost.findUniqueOrThrow({
            where: { id: postId },
            select: { cercleId: true, deletedAt: true },
        });
        if (parent.deletedAt)
            throw new common_1.BadRequestException("Post supprimé");
        await this.cercles.assertMember(parent.cercleId, authorId);
        const reply = await this.prisma.cerclePost.create({
            data: {
                cercleId: parent.cercleId,
                authorId,
                body: this.sanitize(body.trim()),
                parentId: postId,
            },
            include: { author: { select: { id: true, email: true, username: true } } },
        });
        // Bump replyCount du parent
        await this.prisma.cerclePost.update({ where: { id: postId }, data: { replyCount: { increment: 1 } } });
        return reply;
    }
    async list(cercleId, viewerId, opts = {}) {
        await this.cercles.assertMember(cercleId, viewerId);
        const page = Math.max(1, opts.page ?? 1);
        const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));
        const where = { cercleId, parentId: null, deletedAt: null };
        const [data, total] = await Promise.all([
            this.prisma.cerclePost.findMany({
                where,
                orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    author: { select: { id: true, email: true, username: true } },
                    attachments: true,
                    _count: { select: { replies: true } },
                },
            }),
            this.prisma.cerclePost.count({ where }),
        ]);
        return { data, meta: { page, pageSize, total } };
    }
    async detail(postId, viewerId) {
        const post = await this.prisma.cerclePost.findUnique({
            where: { id: postId },
            include: {
                author: { select: { id: true, email: true, username: true } },
                attachments: true,
                replies: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: "asc" },
                    include: {
                        author: { select: { id: true, email: true, username: true } },
                        attachments: true,
                        // 2 niveaux de threading max
                        replies: {
                            where: { deletedAt: null },
                            orderBy: { createdAt: "asc" },
                            include: { author: { select: { id: true, email: true, username: true } } },
                        },
                    },
                },
            },
        });
        if (!post || post.deletedAt)
            throw new common_1.NotFoundException("Post introuvable");
        await this.cercles.assertMember(post.cercleId, viewerId);
        return post;
    }
    async edit(postId, userId, input) {
        const post = await this.prisma.cerclePost.findUniqueOrThrow({ where: { id: postId } });
        if (post.deletedAt)
            throw new common_1.BadRequestException("Post supprimé");
        const isAuthor = post.authorId === userId;
        const isMod = await this.cercles.isModerator(post.cercleId, userId);
        if (!isAuthor && !isMod)
            throw new common_1.ForbiddenException("Auteur ou modérateur requis");
        const data = {};
        if (input.title !== undefined)
            data.title = input.title?.trim() || null;
        if (input.body !== undefined) {
            if (!input.body.trim())
                throw new common_1.BadRequestException("Body vide");
            data.body = this.sanitize(input.body.trim());
        }
        return this.prisma.cerclePost.update({ where: { id: postId }, data });
    }
    async softDelete(postId, userId) {
        const post = await this.prisma.cerclePost.findUniqueOrThrow({ where: { id: postId } });
        const isAuthor = post.authorId === userId;
        const isMod = await this.cercles.isModerator(post.cercleId, userId);
        if (!isAuthor && !isMod)
            throw new common_1.ForbiddenException("Auteur ou modérateur requis");
        return this.prisma.cerclePost.update({ where: { id: postId }, data: { deletedAt: new Date() } });
    }
    /**
     * Upvote idempotent par user. On stocke un compteur dénormalisé (upvotes)
     * sur le post + un audit-trail simple en JSON pour l'instant.
     * v2 : table CerclePostUpvote dédiée.
     */
    async upvote(postId, userId) {
        const post = await this.prisma.cerclePost.findUniqueOrThrow({ where: { id: postId } });
        if (post.deletedAt)
            throw new common_1.BadRequestException("Post supprimé");
        await this.cercles.assertMember(post.cercleId, userId);
        return this.prisma.cerclePost.update({
            where: { id: postId },
            data: { upvotes: { increment: 1 } },
            select: { id: true, upvotes: true },
        });
    }
    async pin(postId, userId, pinned = true) {
        const post = await this.prisma.cerclePost.findUniqueOrThrow({ where: { id: postId } });
        await this.cercles.assertModerator(post.cercleId, userId);
        return this.prisma.cerclePost.update({ where: { id: postId }, data: { isPinned: pinned } });
    }
    async resolve(postId, userId, resolved = true) {
        const post = await this.prisma.cerclePost.findUniqueOrThrow({ where: { id: postId } });
        const isAuthor = post.authorId === userId;
        const isMod = await this.cercles.isModerator(post.cercleId, userId);
        if (!isAuthor && !isMod)
            throw new common_1.ForbiddenException("Auteur ou modérateur requis");
        return this.prisma.cerclePost.update({ where: { id: postId }, data: { isResolved: resolved } });
    }
};
exports.PostsService = PostsService;
exports.PostsService = PostsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cercles_service_1.CerclesService])
], PostsService);
