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
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const cercles_service_1 = require("./cercles.service");
const messages_stream_service_1 = require("./messages-stream.service");
const REACTION_WHITELIST = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const MAX_BODY_LEN = 4000;
const MENTION_RE = /(?:^|\s)@([a-zA-Z0-9_.-]{2,32})/g;
let MessagesService = class MessagesService {
    prisma;
    cercles;
    stream;
    constructor(prisma, cercles, stream) {
        this.prisma = prisma;
        this.cercles = cercles;
        this.stream = stream;
    }
    // ── List ───────────────────────────────────────────────────────
    async list(cercleId, userId, opts = {}) {
        await this.cercles.assertMember(cercleId, userId);
        const take = Math.min(100, Math.max(1, opts.take ?? 40));
        let cursorAt;
        if (opts.beforeId) {
            const cursor = await this.prisma.cercleMessage.findUnique({
                where: { id: opts.beforeId },
                select: { createdAt: true, cercleId: true },
            });
            if (cursor && cursor.cercleId === cercleId)
                cursorAt = cursor.createdAt;
        }
        const messages = await this.prisma.cercleMessage.findMany({
            where: {
                cercleId,
                deletedAt: null,
                ...(cursorAt ? { createdAt: { lt: cursorAt } } : {}),
            },
            orderBy: { createdAt: "desc" },
            take,
            include: {
                author: { select: { id: true, username: true, email: true } },
                attachments: true,
                reactions: { select: { id: true, userId: true, emoji: true } },
                reads: { select: { userId: true, readAt: true } },
                replyTo: {
                    select: {
                        id: true,
                        body: true,
                        authorId: true,
                        deletedAt: true,
                        author: { select: { id: true, username: true, email: true } },
                    },
                },
                _count: { select: { replies: true } },
            },
        });
        return {
            data: messages.reverse(), // ordre chronologique ASC pour le client
            meta: {
                hasMore: messages.length === take,
                oldestId: messages[0]?.id ?? null,
            },
        };
    }
    // ── Send ───────────────────────────────────────────────────────
    async send(cercleId, authorId, input) {
        await this.cercles.assertMember(cercleId, authorId);
        const body = (input.body ?? "").trim();
        if (!body && !(input.attachments && input.attachments.length > 0)) {
            throw new common_1.BadRequestException("Message vide");
        }
        if (body.length > MAX_BODY_LEN) {
            throw new common_1.BadRequestException(`Message trop long (>${MAX_BODY_LEN} caractères)`);
        }
        if (input.replyToId) {
            const parent = await this.prisma.cercleMessage.findUnique({
                where: { id: input.replyToId },
                select: { cercleId: true, deletedAt: true },
            });
            if (!parent || parent.cercleId !== cercleId || parent.deletedAt) {
                throw new common_1.BadRequestException("Message parent introuvable");
            }
        }
        const created = await this.prisma.cercleMessage.create({
            data: {
                cercleId,
                authorId,
                body,
                replyToId: input.replyToId ?? null,
                attachments: input.attachments && input.attachments.length > 0
                    ? {
                        create: input.attachments.map((a) => ({
                            type: a.type,
                            fileKey: a.fileKey,
                            filename: a.filename,
                            mimeType: a.mimeType,
                            sizeBytes: a.sizeBytes,
                            width: a.width ?? null,
                            height: a.height ?? null,
                            durationSec: a.durationSec ?? null,
                            posterKey: a.posterKey ?? null,
                        })),
                    }
                    : undefined,
            },
            include: {
                author: { select: { id: true, username: true, email: true } },
                attachments: true,
                reactions: true,
                reads: true,
                replyTo: {
                    select: {
                        id: true,
                        body: true,
                        authorId: true,
                        deletedAt: true,
                        author: { select: { id: true, username: true, email: true } },
                    },
                },
            },
        });
        this.stream.publish(cercleId, { type: "message:new", payload: created });
        return { data: created, mentions: this.extractMentions(body) };
    }
    // ── Edit / Delete ──────────────────────────────────────────────
    async edit(cercleId, messageId, userId, body) {
        const msg = await this.prisma.cercleMessage.findUnique({
            where: { id: messageId },
            select: { cercleId: true, authorId: true, deletedAt: true },
        });
        if (!msg || msg.cercleId !== cercleId || msg.deletedAt) {
            throw new common_1.NotFoundException("Message introuvable");
        }
        if (msg.authorId !== userId)
            throw new common_1.ForbiddenException("Auteur uniquement");
        const trimmed = (body ?? "").trim();
        if (!trimmed)
            throw new common_1.BadRequestException("Corps requis");
        if (trimmed.length > MAX_BODY_LEN)
            throw new common_1.BadRequestException("Trop long");
        const updated = await this.prisma.cercleMessage.update({
            where: { id: messageId },
            data: { body: trimmed, editedAt: new Date() },
            include: { attachments: true },
        });
        this.stream.publish(cercleId, { type: "message:edit", payload: updated });
        return updated;
    }
    async softDelete(cercleId, messageId, userId) {
        const msg = await this.prisma.cercleMessage.findUnique({
            where: { id: messageId },
            select: { cercleId: true, authorId: true, deletedAt: true },
        });
        if (!msg || msg.cercleId !== cercleId || msg.deletedAt) {
            throw new common_1.NotFoundException("Message introuvable");
        }
        const isAuthor = msg.authorId === userId;
        const isMod = await this.cercles.isModerator(cercleId, userId);
        if (!isAuthor && !isMod)
            throw new common_1.ForbiddenException("Auteur ou modérateur uniquement");
        await this.prisma.cercleMessage.update({
            where: { id: messageId },
            data: { deletedAt: new Date(), body: "" },
        });
        this.stream.publish(cercleId, { type: "message:delete", payload: { id: messageId } });
        return { id: messageId, deleted: true };
    }
    // ── Reactions ──────────────────────────────────────────────────
    async toggleReaction(cercleId, messageId, userId, emoji) {
        if (!REACTION_WHITELIST.includes(emoji)) {
            throw new common_1.BadRequestException("Emoji non autorisé");
        }
        const msg = await this.prisma.cercleMessage.findUnique({
            where: { id: messageId },
            select: { cercleId: true, deletedAt: true },
        });
        if (!msg || msg.cercleId !== cercleId || msg.deletedAt) {
            throw new common_1.NotFoundException("Message introuvable");
        }
        await this.cercles.assertMember(cercleId, userId);
        const existing = await this.prisma.messageReaction.findUnique({
            where: { messageId_userId_emoji: { messageId, userId, emoji } },
        });
        let action;
        if (existing) {
            await this.prisma.messageReaction.delete({ where: { id: existing.id } });
            action = "removed";
        }
        else {
            await this.prisma.messageReaction.create({
                data: { messageId, userId, emoji },
            });
            action = "added";
        }
        const reactions = await this.prisma.messageReaction.findMany({
            where: { messageId },
            select: { id: true, userId: true, emoji: true },
        });
        this.stream.publish(cercleId, {
            type: "message:reaction",
            payload: { messageId, reactions, action, userId, emoji },
        });
        return { messageId, reactions, action };
    }
    // ── Read receipts ──────────────────────────────────────────────
    async markRead(cercleId, userId, upToMessageId) {
        await this.cercles.assertMember(cercleId, userId);
        const upTo = await this.prisma.cercleMessage.findUnique({
            where: { id: upToMessageId },
            select: { cercleId: true, createdAt: true },
        });
        if (!upTo || upTo.cercleId !== cercleId) {
            throw new common_1.NotFoundException("Message introuvable");
        }
        // Récupère tous les messages non lus jusqu'à ce point (sauf les siens)
        const unread = await this.prisma.cercleMessage.findMany({
            where: {
                cercleId,
                deletedAt: null,
                createdAt: { lte: upTo.createdAt },
                authorId: { not: userId },
                reads: { none: { userId } },
            },
            select: { id: true },
        });
        if (unread.length === 0)
            return { count: 0 };
        await this.prisma.messageRead.createMany({
            data: unread.map((m) => ({ messageId: m.id, userId })),
            skipDuplicates: true,
        });
        this.stream.publish(cercleId, {
            type: "message:read",
            payload: { userId, messageIds: unread.map((m) => m.id), readAt: new Date() },
        });
        return { count: unread.length };
    }
    // ── Search ─────────────────────────────────────────────────────
    async search(cercleId, userId, q, take = 30) {
        await this.cercles.assertMember(cercleId, userId);
        const term = (q ?? "").trim();
        if (term.length < 2)
            return { data: [] };
        const results = await this.prisma.cercleMessage.findMany({
            where: {
                cercleId,
                deletedAt: null,
                body: { contains: term, mode: "insensitive" },
            },
            orderBy: { createdAt: "desc" },
            take: Math.min(100, take),
            include: {
                author: { select: { id: true, username: true, email: true } },
                attachments: { select: { id: true, type: true, filename: true } },
            },
        });
        return { data: results };
    }
    // ── Mentions ───────────────────────────────────────────────────
    extractMentions(body) {
        const mentions = new Set();
        let m;
        while ((m = MENTION_RE.exec(body)) !== null)
            mentions.add(m[1]);
        return Array.from(mentions);
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cercles_service_1.CerclesService,
        messages_stream_service_1.MessagesStreamService])
], MessagesService);
