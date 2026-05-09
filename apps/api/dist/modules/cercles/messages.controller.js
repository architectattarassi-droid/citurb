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
exports.MessagesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { diskStorage } = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const messages_service_1 = require("./messages.service");
const messages_stream_service_1 = require("./messages-stream.service");
const cercles_service_1 = require("./cercles.service");
const jwt_1 = require("@nestjs/jwt");
const UPLOAD_BASE = process.env.UPLOADS_DIR || (0, path_1.join)(process.cwd(), "uploads");
const CHAT_UPLOAD_DIR = (0, path_1.join)(UPLOAD_BASE, "cercles-chat");
try {
    (0, fs_1.mkdirSync)(CHAT_UPLOAD_DIR, { recursive: true });
}
catch { }
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"]);
const AUDIO_MIMES = new Set(["audio/mpeg", "audio/mp4", "audio/webm", "audio/ogg", "audio/wav"]);
const ALLOWED_FILE_MIMES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "application/zip",
    "application/x-rar-compressed",
]);
function classify(mime) {
    if (IMAGE_MIMES.has(mime))
        return "IMAGE";
    if (VIDEO_MIMES.has(mime))
        return "VIDEO";
    if (AUDIO_MIMES.has(mime))
        return "AUDIO";
    if (ALLOWED_FILE_MIMES.has(mime))
        return "FILE";
    return null;
}
function sizeLimitFor(kind) {
    if (kind === "IMAGE")
        return MAX_IMAGE_BYTES;
    if (kind === "VIDEO")
        return MAX_VIDEO_BYTES;
    if (kind === "AUDIO")
        return MAX_VIDEO_BYTES;
    return MAX_FILE_BYTES;
}
let MessagesController = class MessagesController {
    messages;
    stream;
    cercles;
    jwt;
    constructor(messages, stream, cercles, jwt) {
        this.messages = messages;
        this.stream = stream;
        this.cercles = cercles;
        this.jwt = jwt;
    }
    uid(req) {
        return req?.user?.userId || req?.user?.sub;
    }
    displayName(req) {
        return req?.user?.username || req?.user?.email || "Membre";
    }
    // ── List (cursor) ──────────────────────────────────────────────
    async list(req, cercleId, beforeId, take) {
        return {
            ok: true,
            ...(await this.messages.list(cercleId, this.uid(req), {
                beforeId: beforeId || undefined,
                take: take ? Number(take) : undefined,
            })),
        };
    }
    // ── Send ───────────────────────────────────────────────────────
    async send(req, cercleId, body) {
        return { ok: true, ...(await this.messages.send(cercleId, this.uid(req), body)) };
    }
    // ── Edit ───────────────────────────────────────────────────────
    async edit(req, cercleId, messageId, body) {
        return { ok: true, data: await this.messages.edit(cercleId, messageId, this.uid(req), body.body) };
    }
    // ── Delete ─────────────────────────────────────────────────────
    async deleteOne(req, cercleId, messageId) {
        return { ok: true, data: await this.messages.softDelete(cercleId, messageId, this.uid(req)) };
    }
    // ── Reactions ──────────────────────────────────────────────────
    async react(req, cercleId, messageId, body) {
        return {
            ok: true,
            data: await this.messages.toggleReaction(cercleId, messageId, this.uid(req), body.emoji),
        };
    }
    // ── Read receipts ──────────────────────────────────────────────
    async markRead(req, cercleId, body) {
        return {
            ok: true,
            data: await this.messages.markRead(cercleId, this.uid(req), body.upToMessageId),
        };
    }
    // ── Search ─────────────────────────────────────────────────────
    async search(req, cercleId, q, take) {
        return {
            ok: true,
            ...(await this.messages.search(cercleId, this.uid(req), q || "", take ? Number(take) : 30)),
        };
    }
    // ── Typing ─────────────────────────────────────────────────────
    async typing(req, cercleId, body) {
        await this.cercles.assertMember(cercleId, this.uid(req));
        this.stream.typing(cercleId, this.uid(req), this.displayName(req), !!body.isTyping);
        return { ok: true };
    }
    // ── Upload (multipart) ─────────────────────────────────────────
    async upload(req, cercleId, files) {
        await this.cercles.assertMember(cercleId, this.uid(req));
        if (!files || files.length === 0)
            throw new common_1.BadRequestException("Aucun fichier");
        const out = files.map((f) => {
            const kind = classify(f.mimetype);
            if (!kind)
                throw new common_1.BadRequestException(`Type non autorisé: ${f.mimetype}`);
            if (f.size > sizeLimitFor(kind)) {
                throw new common_1.BadRequestException(`Fichier trop volumineux: ${f.originalname}`);
            }
            // fileKey relatif sous uploads/ pour servir via /uploads/...
            const relative = `cercles-chat/${cercleId}/${f.filename}`;
            return {
                type: kind,
                fileKey: relative,
                url: `/uploads/${relative}`,
                filename: f.originalname,
                mimeType: f.mimetype,
                sizeBytes: f.size,
            };
        });
        return { ok: true, data: out };
    }
    // ── SSE stream ─────────────────────────────────────────────────
    // EventSource ne peut pas envoyer de header Authorization → on accepte
    // un access_token en query string (court-vivant, vérifié JWT serveur).
    async stream_(req, res, cercleId) {
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
        if (!(await this.cercles.isMember(cercleId, userId))) {
            res.status(403).json({ ok: false, error: "Membre requis" });
            return;
        }
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();
        res.write(`event: hello\ndata: ${JSON.stringify({ cercleId, at: Date.now() })}\n\n`);
        const unsubscribe = this.stream.subscribe(cercleId, userId, res);
        req.on("close", () => {
            unsubscribe();
            try {
                res.end();
            }
            catch { }
        });
    }
};
exports.MessagesController = MessagesController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Query)("beforeId")),
    __param(3, (0, common_1.Query)("take")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "send", null);
__decorate([
    (0, common_1.Patch)(":messageId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Param)("messageId")),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "edit", null);
__decorate([
    (0, common_1.Delete)(":messageId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Param)("messageId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "deleteOne", null);
__decorate([
    (0, common_1.Post)(":messageId/reactions"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Param)("messageId")),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "react", null);
__decorate([
    (0, common_1.Post)("read"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "markRead", null);
__decorate([
    (0, common_1.Get)("search"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Query)("q")),
    __param(3, (0, common_1.Query)("take")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "search", null);
__decorate([
    (0, common_1.Post)("typing"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "typing", null);
__decorate([
    (0, common_1.Post)("upload"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)("files", 10, {
        storage: diskStorage({
            destination: (req, _file, cb) => {
                const cercleId = req.params?.cercleId;
                const dir = (0, path_1.join)(CHAT_UPLOAD_DIR, cercleId || "_misc");
                try {
                    (0, fs_1.mkdirSync)(dir, { recursive: true });
                }
                catch { }
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const safe = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
                const stamp = Date.now().toString(36);
                const rand = Math.random().toString(36).slice(2, 8);
                cb(null, `${stamp}-${rand}-${safe}`);
            },
        }),
        limits: { fileSize: MAX_VIDEO_BYTES },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Array]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)("stream"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Param)("cercleId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "stream_", null);
exports.MessagesController = MessagesController = __decorate([
    (0, tome_at_1.Tome)("tome8"),
    (0, common_1.Controller)("api/cercles/:cercleId/messages"),
    __metadata("design:paramtypes", [messages_service_1.MessagesService,
        messages_stream_service_1.MessagesStreamService,
        cercles_service_1.CerclesService,
        jwt_1.JwtService])
], MessagesController);
