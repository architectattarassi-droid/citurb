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
exports.DirectMessagesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const crypto_1 = require("crypto");
/**
 * DirectMessagesService — Sprint L (messagerie directe 1-to-1)
 *
 * Style LinkedIn/Messenger : conversation entre 2 users pros, déduplication
 * stricte par hash trié des participantIds (impossible d'avoir 2 threads
 * entre les mêmes deux users).
 */
let DirectMessagesService = class DirectMessagesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /** Hash trié des 2 userIds pour déduplication unique. */
    hashPair(a, b) {
        const sorted = [a, b].sort();
        return (0, crypto_1.createHash)("sha256").update(sorted.join("|")).digest("hex");
    }
    /** Garantit que le user fait partie du thread, sinon throw. */
    async assertParticipant(threadId, userId) {
        const p = await this.prisma.directThreadParticipant.findUnique({
            where: { threadId_userId: { threadId, userId } },
        });
        if (!p || p.leftAt)
            throw new common_1.ForbiddenException("Pas membre de ce thread");
        return p;
    }
    // ── Threads ────────────────────────────────────────────────────
    /** Liste threads du user, triés par dernier message. */
    async listThreads(userId) {
        const participations = await this.prisma.directThreadParticipant.findMany({
            where: { userId, leftAt: null },
            include: {
                thread: {
                    include: {
                        participants: {
                            include: {
                                user: {
                                    select: {
                                        id: true, email: true, username: true,
                                        proProfile: {
                                            select: {
                                                displayName: true, title: true, avatarUrl: true,
                                                metier: true, villePrincipale: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        return participations
            .map((p) => {
            const peer = p.thread.participants.find((pp) => pp.userId !== userId);
            return {
                threadId: p.threadId,
                unreadCount: p.unreadCount,
                lastReadAt: p.lastReadAt,
                mutedUntil: p.mutedUntil,
                pinned: p.pinned,
                lastMessageAt: p.thread.lastMessageAt,
                lastMessageBody: p.thread.lastMessageBody,
                peer: peer ? {
                    userId: peer.userId,
                    email: peer.user.email,
                    username: peer.user.username,
                    displayName: peer.user.proProfile?.displayName || peer.user.username || peer.user.email,
                    title: peer.user.proProfile?.title || null,
                    avatarUrl: peer.user.proProfile?.avatarUrl || null,
                    metier: peer.user.proProfile?.metier || null,
                    villePrincipale: peer.user.proProfile?.villePrincipale || null,
                } : null,
            };
        })
            .sort((a, b) => {
            if (a.pinned !== b.pinned)
                return a.pinned ? -1 : 1;
            return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        });
    }
    /** Crée ou retrouve un thread 1-to-1 entre deux users. */
    async getOrCreateThread(currentUserId, peerUserId) {
        if (currentUserId === peerUserId)
            throw new common_1.BadRequestException("Impossible de se DM soi-même");
        const peer = await this.prisma.user.findUnique({ where: { id: peerUserId }, select: { id: true, isActive: true } });
        if (!peer || !peer.isActive)
            throw new common_1.NotFoundException("Destinataire introuvable ou désactivé");
        const hash = this.hashPair(currentUserId, peerUserId);
        let thread = await this.prisma.directThread.findUnique({ where: { participantsHash: hash } });
        if (!thread) {
            thread = await this.prisma.directThread.create({
                data: {
                    participantsHash: hash,
                    participants: {
                        create: [
                            { userId: currentUserId },
                            { userId: peerUserId },
                        ],
                    },
                },
            });
        }
        else {
            // Si le user avait quitté, on le ré-active
            await this.prisma.directThreadParticipant.updateMany({
                where: { threadId: thread.id, userId: currentUserId, leftAt: { not: null } },
                data: { leftAt: null, joinedAt: new Date() },
            });
        }
        return thread;
    }
    // ── Messages ───────────────────────────────────────────────────
    async listMessages(threadId, userId, opts = {}) {
        await this.assertParticipant(threadId, userId);
        const take = Math.min(opts.take ?? 50, 100);
        const messages = await this.prisma.directMessage.findMany({
            where: {
                threadId,
                deletedAt: null,
                ...(opts.before ? { createdAt: { lt: new Date(opts.before) } } : {}),
            },
            orderBy: { createdAt: "desc" },
            take,
            include: {
                sender: {
                    select: {
                        id: true, email: true, username: true,
                        proProfile: { select: { displayName: true, avatarUrl: true } },
                    },
                },
            },
        });
        return messages.reverse(); // chronologique pour le front
    }
    async sendMessage(threadId, senderId, body, attachments) {
        if (!body?.trim() && (!attachments || !Array.isArray(attachments) || attachments.length === 0)) {
            throw new common_1.BadRequestException("Message vide");
        }
        if (body && body.length > 5000)
            throw new common_1.BadRequestException("Message trop long (max 5000)");
        await this.assertParticipant(threadId, senderId);
        const message = await this.prisma.directMessage.create({
            data: {
                threadId,
                senderId,
                body: body?.trim() || "",
                attachments: attachments || undefined,
            },
            include: {
                sender: {
                    select: {
                        id: true, email: true, username: true,
                        proProfile: { select: { displayName: true, avatarUrl: true } },
                    },
                },
            },
        });
        // Met à jour thread + incrémente unread pour les autres participants
        await this.prisma.directThread.update({
            where: { id: threadId },
            data: {
                lastMessageAt: new Date(),
                lastMessageBody: (body || "").slice(0, 280),
            },
        });
        await this.prisma.directThreadParticipant.updateMany({
            where: { threadId, userId: { not: senderId }, leftAt: null },
            data: { unreadCount: { increment: 1 } },
        });
        // Reset unread du sender (il a "lu" son propre message)
        await this.prisma.directThreadParticipant.update({
            where: { threadId_userId: { threadId, userId: senderId } },
            data: { unreadCount: 0, lastReadAt: new Date() },
        });
        return message;
    }
    async markRead(threadId, userId) {
        await this.assertParticipant(threadId, userId);
        await this.prisma.directThreadParticipant.update({
            where: { threadId_userId: { threadId, userId } },
            data: { unreadCount: 0, lastReadAt: new Date() },
        });
        return { ok: true };
    }
    async pinToggle(threadId, userId) {
        const p = await this.assertParticipant(threadId, userId);
        return this.prisma.directThreadParticipant.update({
            where: { threadId_userId: { threadId, userId } },
            data: { pinned: !p.pinned },
        });
    }
    async leaveThread(threadId, userId) {
        await this.assertParticipant(threadId, userId);
        return this.prisma.directThreadParticipant.update({
            where: { threadId_userId: { threadId, userId } },
            data: { leftAt: new Date() },
        });
    }
    async deleteMessage(threadId, messageId, userId) {
        await this.assertParticipant(threadId, userId);
        const m = await this.prisma.directMessage.findUnique({ where: { id: messageId } });
        if (!m || m.threadId !== threadId)
            throw new common_1.NotFoundException("Message introuvable");
        if (m.senderId !== userId)
            throw new common_1.ForbiddenException("Seul l'auteur peut supprimer");
        return this.prisma.directMessage.update({
            where: { id: messageId },
            data: { deletedAt: new Date(), body: "" },
        });
    }
    async totalUnread(userId) {
        const result = await this.prisma.directThreadParticipant.aggregate({
            where: { userId, leftAt: null },
            _sum: { unreadCount: true },
        });
        return result._sum.unreadCount || 0;
    }
};
exports.DirectMessagesService = DirectMessagesService;
exports.DirectMessagesService = DirectMessagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DirectMessagesService);
