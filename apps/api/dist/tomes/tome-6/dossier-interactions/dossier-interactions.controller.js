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
exports.DossierInteractionsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { diskStorage } = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const tome_at_1 = require("../../tome-at");
const jwt_auth_guard_1 = require("../../tome-5/auth/jwt-auth.guard");
const dossier_interactions_service_1 = require("./dossier-interactions.service");
const UPLOAD_BASE = process.env.UPLOADS_DIR || (0, path_1.join)(process.cwd(), "uploads");
const INTERACTIONS_UPLOAD_DIR = (0, path_1.join)(UPLOAD_BASE, "dossier-interactions");
try {
    (0, fs_1.mkdirSync)(INTERACTIONS_UPLOAD_DIR, { recursive: true });
}
catch { }
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB images/docs
const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB audio note (~60s m4a/webm)
const AUDIO_MIMES = new Set(["audio/mpeg", "audio/mp4", "audio/webm", "audio/ogg", "audio/wav", "audio/x-m4a"]);
/**
 * DossierInteractionsController — fil d'interactions d'un dossier P1–P6.
 *
 * Endpoints :
 *   GET    /api/dossier/:dossierId/timeline?cursor=&limit=
 *   POST   /api/dossier/:dossierId/timeline                 (multipart si fichier)
 *   PATCH  /api/dossier/:dossierId/timeline/:id
 *   DELETE /api/dossier/:dossierId/timeline/:id             (soft delete)
 *   POST   /api/dossier/:dossierId/timeline/:id/react       (emoji)
 *   POST   /api/dossier/:dossierId/timeline/:id/pin         (OPS / owner)
 *   POST   /api/dossier/:dossierId/timeline/:id/mark-read
 *   GET    /api/me/mentions?unread=true
 *
 * Auth : JWT obligatoire. Permissions fine-grained dans le service.
 * Tome : tome6 (logé sous /api/dossier qui doit être whitelisté MutationGate).
 */
let DossierInteractionsController = class DossierInteractionsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    uid(req) {
        return req?.user?.userId || req?.user?.sub || "";
    }
    role(req) {
        return req?.user?.role || "CLIENT";
    }
    // ── Timeline (list) ──────────────────────────────────────────
    async list(req, dossierId, cursor, limit) {
        const page = await this.svc.listTimeline(dossierId, { userId: this.uid(req), role: this.role(req) }, { cursor: cursor || undefined, limit: limit ? Number(limit) : undefined });
        return { ok: true, ...page };
    }
    // ── Create (JSON ou multipart) ───────────────────────────────
    async create(req, dossierId, body, files) {
        let mentions = [];
        if (typeof body?.mentions === "string") {
            try {
                mentions = JSON.parse(body.mentions);
            }
            catch {
                mentions = [];
            }
        }
        else if (Array.isArray(body?.mentions)) {
            mentions = body.mentions;
        }
        let metadata = {};
        if (typeof body?.metadata === "string") {
            try {
                metadata = JSON.parse(body.metadata);
            }
            catch {
                metadata = {};
            }
        }
        else if (body?.metadata && typeof body.metadata === "object") {
            metadata = body.metadata;
        }
        const attachments = (files || []).map((f) => {
            const isAudio = AUDIO_MIMES.has(f.mimetype);
            if (isAudio && f.size > MAX_AUDIO_BYTES) {
                throw new common_1.BadRequestException("audio_note_too_large");
            }
            return {
                url: `/uploads/dossier-interactions/${f.filename}`,
                mime: f.mimetype || "application/octet-stream",
                size: f.size || 0,
                filename: f.originalname || f.filename,
            };
        });
        const inferredType = body?.type
            ? body.type
            : (attachments.some(a => AUDIO_MIMES.has(a.mime)) ? "AUDIO_NOTE" :
                attachments.length > 0 ? "FILE_UPLOADED" : "COMMENT");
        const input = {
            type: inferredType,
            contentMD: String(body?.contentMD ?? ""),
            parentId: body?.parentId || null,
            mentions,
            attachments,
            visibility: body?.visibility || "PUBLIC",
            metadata,
        };
        const item = await this.svc.create(dossierId, { userId: this.uid(req), role: this.role(req) }, input);
        return { ok: true, item };
    }
    // ── Edit ─────────────────────────────────────────────────────
    async edit(req, dossierId, id, body) {
        const item = await this.svc.edit(dossierId, id, { userId: this.uid(req), role: this.role(req) }, body);
        return { ok: true, item };
    }
    // ── Delete (soft) ────────────────────────────────────────────
    async remove(req, dossierId, id) {
        return this.svc.softDelete(dossierId, id, { userId: this.uid(req), role: this.role(req) });
    }
    // ── React ────────────────────────────────────────────────────
    async react(req, dossierId, id, body) {
        if (!body?.emoji)
            throw new common_1.BadRequestException("emoji_required");
        const item = await this.svc.react(dossierId, id, { userId: this.uid(req), role: this.role(req) }, body.emoji);
        return { ok: true, item };
    }
    // ── Pin ──────────────────────────────────────────────────────
    async pin(req, dossierId, id, body) {
        const item = await this.svc.pin(dossierId, id, { userId: this.uid(req), role: this.role(req) }, body?.pinned !== false);
        return { ok: true, item };
    }
    // ── Mark-read ────────────────────────────────────────────────
    async markRead(req, dossierId, id) {
        return this.svc.markRead(dossierId, id, { userId: this.uid(req) });
    }
    // ── My mentions (cross-dossier) ──────────────────────────────
    async myMentions(req, unread, limit) {
        const items = await this.svc.myMentions(this.uid(req), {
            unread: unread === "true" || unread === "1",
            limit: limit ? Number(limit) : undefined,
        });
        return { ok: true, items, count: items.length };
    }
};
exports.DossierInteractionsController = DossierInteractionsController;
__decorate([
    (0, common_1.Get)("api/dossier/:dossierId/timeline"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("dossierId")),
    __param(2, (0, common_1.Query)("cursor")),
    __param(3, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], DossierInteractionsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)("api/dossier/:dossierId/timeline"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)("files", 10, {
        storage: diskStorage({
            destination: INTERACTIONS_UPLOAD_DIR,
            filename: (_req, file, cb) => {
                const safe = (file.originalname || "file").replace(/[^a-zA-Z0-9_.-]/g, "_");
                const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
                cb(null, `${id}_${safe}`);
            },
        }),
        limits: { fileSize: MAX_FILE_BYTES },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("dossierId")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Array]),
    __metadata("design:returntype", Promise)
], DossierInteractionsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)("api/dossier/:dossierId/timeline/:id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("dossierId")),
    __param(2, (0, common_1.Param)("id")),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], DossierInteractionsController.prototype, "edit", null);
__decorate([
    (0, common_1.Delete)("api/dossier/:dossierId/timeline/:id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("dossierId")),
    __param(2, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DossierInteractionsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)("api/dossier/:dossierId/timeline/:id/react"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("dossierId")),
    __param(2, (0, common_1.Param)("id")),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], DossierInteractionsController.prototype, "react", null);
__decorate([
    (0, common_1.Post)("api/dossier/:dossierId/timeline/:id/pin"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("dossierId")),
    __param(2, (0, common_1.Param)("id")),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], DossierInteractionsController.prototype, "pin", null);
__decorate([
    (0, common_1.Post)("api/dossier/:dossierId/timeline/:id/mark-read"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("dossierId")),
    __param(2, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DossierInteractionsController.prototype, "markRead", null);
__decorate([
    (0, common_1.Get)("api/me/mentions"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("unread")),
    __param(2, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DossierInteractionsController.prototype, "myMentions", null);
exports.DossierInteractionsController = DossierInteractionsController = __decorate([
    (0, tome_at_1.Tome)("tome6"),
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [dossier_interactions_service_1.DossierInteractionsService])
], DossierInteractionsController);
