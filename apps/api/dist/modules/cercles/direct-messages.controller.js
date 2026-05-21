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
exports.DirectMessagesController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const pro_access_guard_1 = require("./pro-access.guard");
const jwt_1 = require("@nestjs/jwt");
const direct_messages_service_1 = require("./direct-messages.service");
const direct_messages_stream_service_1 = require("./direct-messages-stream.service");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
/**
 * DirectMessagesController — Sprint L
 *
 * Endpoints :
 *   GET    /api/dm/threads                       liste threads du user
 *   POST   /api/dm/threads                       crée/retrouve thread avec un peer
 *   GET    /api/dm/threads/:id/messages          historique paginé
 *   POST   /api/dm/threads/:id/messages          envoie message
 *   POST   /api/dm/threads/:id/read              marque thread comme lu
 *   POST   /api/dm/threads/:id/pin               toggle pin
 *   DELETE /api/dm/threads/:id                   quitter thread (soft)
 *   DELETE /api/dm/threads/:id/messages/:msgId   supprimer message (auteur only)
 *   GET    /api/dm/unread                        total unread (badge sidebar)
 *   GET    /api/dm/events                        SSE temps réel (tous threads du user)
 */
let DirectMessagesController = class DirectMessagesController {
    dm;
    stream;
    prisma;
    jwt;
    constructor(dm, stream, prisma, jwt) {
        this.dm = dm;
        this.stream = stream;
        this.prisma = prisma;
        this.jwt = jwt;
    }
    uid(req) {
        return req?.user?.userId || req?.user?.sub;
    }
    async listThreads(req) {
        return { ok: true, data: await this.dm.listThreads(this.uid(req)) };
    }
    async createThread(req, body) {
        const thread = await this.dm.getOrCreateThread(this.uid(req), body.peerUserId);
        if (body.firstMessage?.trim()) {
            const msg = await this.dm.sendMessage(thread.id, this.uid(req), body.firstMessage);
            // Notif SSE aux 2 participants
            this.stream.publishToUsers([this.uid(req), body.peerUserId], {
                type: "dm:new",
                payload: { threadId: thread.id, message: msg },
            });
        }
        return { ok: true, data: { threadId: thread.id } };
    }
    async messages(req, threadId, before, take) {
        const msgs = await this.dm.listMessages(threadId, this.uid(req), {
            before,
            take: take ? Number(take) : undefined,
        });
        return { ok: true, data: msgs };
    }
    async send(req, threadId, body) {
        const senderId = this.uid(req);
        const msg = await this.dm.sendMessage(threadId, senderId, body.body, body.attachments);
        // Notif SSE aux 2 participants
        const participants = await this.prisma.directThreadParticipant.findMany({
            where: { threadId, leftAt: null },
            select: { userId: true },
        });
        this.stream.publishToUsers(participants.map((p) => p.userId), {
            type: "dm:new",
            payload: { threadId, message: msg },
        });
        return { ok: true, data: msg };
    }
    async read(req, threadId) {
        const result = await this.dm.markRead(threadId, this.uid(req));
        // Notif au peer qu'on a lu
        const participants = await this.prisma.directThreadParticipant.findMany({
            where: { threadId, leftAt: null },
            select: { userId: true },
        });
        this.stream.publishToUsers(participants.filter(p => p.userId !== this.uid(req)).map(p => p.userId), {
            type: "dm:read",
            payload: { threadId, readerId: this.uid(req), at: Date.now() },
        });
        return result;
    }
    async pin(req, threadId) {
        const updated = await this.dm.pinToggle(threadId, this.uid(req));
        return { ok: true, data: { pinned: updated.pinned } };
    }
    async leave(req, threadId) {
        return { ok: true, data: await this.dm.leaveThread(threadId, this.uid(req)) };
    }
    async deleteMsg(req, threadId, msgId) {
        const deleted = await this.dm.deleteMessage(threadId, msgId, this.uid(req));
        const participants = await this.prisma.directThreadParticipant.findMany({
            where: { threadId, leftAt: null },
            select: { userId: true },
        });
        this.stream.publishToUsers(participants.map(p => p.userId), {
            type: "dm:delete",
            payload: { threadId, messageId: msgId },
        });
        return { ok: true, data: deleted };
    }
    async unread(req) {
        return { ok: true, data: { count: await this.dm.totalUnread(this.uid(req)) } };
    }
    // SSE — EventSource ne supporte pas Authorization header, on accepte access_token query string
    async events(req, res) {
        const token = req.query?.access_token || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
        if (!token) {
            res.status(401).json({ ok: false, error: "Token requis" });
            return;
        }
        let userId;
        try {
            const payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_SECRET });
            userId = payload.userId || payload.sub;
            if (!userId)
                throw new Error("payload invalide");
        }
        catch {
            res.status(401).json({ ok: false, error: "Token invalide" });
            return;
        }
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();
        res.write(`event: hello\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`);
        const unsub = this.stream.subscribe(userId, res);
        req.on("close", () => { unsub(); try {
            res.end();
        }
        catch { } });
    }
};
exports.DirectMessagesController = DirectMessagesController;
__decorate([
    (0, common_1.Get)("threads"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, pro_access_guard_1.ProAccessGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DirectMessagesController.prototype, "listThreads", null);
__decorate([
    (0, common_1.Post)("threads"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, pro_access_guard_1.ProAccessGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DirectMessagesController.prototype, "createThread", null);
__decorate([
    (0, common_1.Get)("threads/:id/messages"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, pro_access_guard_1.ProAccessGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Query)("before")),
    __param(3, (0, common_1.Query)("take")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], DirectMessagesController.prototype, "messages", null);
__decorate([
    (0, common_1.Post)("threads/:id/messages"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, pro_access_guard_1.ProAccessGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], DirectMessagesController.prototype, "send", null);
__decorate([
    (0, common_1.Post)("threads/:id/read"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, pro_access_guard_1.ProAccessGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DirectMessagesController.prototype, "read", null);
__decorate([
    (0, common_1.Post)("threads/:id/pin"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, pro_access_guard_1.ProAccessGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DirectMessagesController.prototype, "pin", null);
__decorate([
    (0, common_1.Delete)("threads/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, pro_access_guard_1.ProAccessGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DirectMessagesController.prototype, "leave", null);
__decorate([
    (0, common_1.Delete)("threads/:id/messages/:msgId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, pro_access_guard_1.ProAccessGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Param)("msgId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DirectMessagesController.prototype, "deleteMsg", null);
__decorate([
    (0, common_1.Get)("unread"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, pro_access_guard_1.ProAccessGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DirectMessagesController.prototype, "unread", null);
__decorate([
    (0, common_1.Get)("events"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DirectMessagesController.prototype, "events", null);
exports.DirectMessagesController = DirectMessagesController = __decorate([
    (0, tome_at_1.Tome)("tome8"),
    (0, common_1.Controller)("api/dm"),
    __metadata("design:paramtypes", [direct_messages_service_1.DirectMessagesService,
        direct_messages_stream_service_1.DirectMessagesStreamService,
        prisma_service_1.PrismaService,
        jwt_1.JwtService])
], DirectMessagesController);
