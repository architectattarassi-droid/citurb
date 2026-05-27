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
exports.DocumentsRepoController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const fs = require("fs");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const tome_at_1 = require("../../tomes/tome-at");
const documents_repo_service_1 = require("./documents-repo.service");
const types_1 = require("./types");
/**
 * Tome 7 — Documents Repository (contrats / plans / PV / e-signature).
 *
 * Endpoints :
 *  - POST   /api/documents-repo/dossier/:dossierId/upload      (auth, multipart 25 MB)
 *  - GET    /api/documents-repo/dossier/:dossierId             liste
 *  - GET    /api/documents-repo/:docId                          détail + signedUrl 1h
 *  - DELETE /api/documents-repo/:docId                          soft-delete (owner/OPS)
 *  - POST   /api/documents-repo/:docId/sign                     (auth)
 *  - POST   /api/documents-repo/:docId/request-signature        (auth)
 *  - GET    /api/documents-repo/:docId/verify                   public (page QR)
 *  - GET    /api/documents-repo/:docId/file?exp=&t=             download (URL signée)
 */
let DocumentsRepoController = class DocumentsRepoController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    // ────────────────────────── Read
    async list(dossierId) {
        const items = await this.svc.list(dossierId);
        return { items, total: items.length };
    }
    async verify(docId, hash) {
        return this.svc.verifyPublic(docId, hash);
    }
    async download(docId, exp, token, res) {
        const expNum = Number(exp);
        if (!this.svc.verifySignedToken(docId, expNum, token)) {
            res.status(403).json({ message: "Lien expiré ou invalide" });
            return;
        }
        const { abs, doc } = await this.svc.resolveFilePath(docId);
        if (!fs.existsSync(abs)) {
            res.status(404).json({ message: "Fichier introuvable" });
            return;
        }
        res.setHeader("Content-Type", doc.mimeType);
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.filename)}"`);
        fs.createReadStream(abs).pipe(res);
    }
    async detail(docId) {
        return this.svc.get(docId);
    }
    // ────────────────────────── Mutations (auth)
    async upload(dossierId, file, body, req) {
        if (!file)
            throw new common_1.BadRequestException("Aucun fichier reçu");
        const userId = req.user?.userId ?? req.user?.sub;
        const doc = await this.svc.upload({
            dossierId,
            uploadedBy: userId,
            file: {
                buffer: file.buffer,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
            },
            meta: body ?? {},
        });
        return { ok: true, document: doc };
    }
    async remove(docId, req) {
        return this.svc.softDelete(docId, {
            userId: req.user?.userId ?? req.user?.sub,
            role: req.user?.role,
        });
    }
    async sign(docId, body, req) {
        return this.svc.sign(docId, {
            userId: req.user?.userId ?? req.user?.sub,
            email: req.user?.email,
            ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
                req.ip,
        }, body);
    }
    async requestSignature(docId, body, req) {
        return this.svc.requestSignatures(docId, body, {
            userId: req.user?.userId ?? req.user?.sub,
        });
    }
};
exports.DocumentsRepoController = DocumentsRepoController;
__decorate([
    (0, common_1.Get)("dossier/:dossierId"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocumentsRepoController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(":docId/verify"),
    __param(0, (0, common_1.Param)("docId")),
    __param(1, (0, common_1.Query)("hash")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocumentsRepoController.prototype, "verify", null);
__decorate([
    (0, common_1.Get)(":docId/file"),
    __param(0, (0, common_1.Param)("docId")),
    __param(1, (0, common_1.Query)("exp")),
    __param(2, (0, common_1.Query)("t")),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsRepoController.prototype, "download", null);
__decorate([
    (0, common_1.Get)(":docId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("docId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocumentsRepoController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/upload"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file", { limits: { fileSize: types_1.MAX_UPLOAD_BYTES } })),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsRepoController.prototype, "upload", null);
__decorate([
    (0, common_1.Delete)(":docId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("docId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsRepoController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(":docId/sign"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("docId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsRepoController.prototype, "sign", null);
__decorate([
    (0, common_1.Post)(":docId/request-signature"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("docId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsRepoController.prototype, "requestSignature", null);
exports.DocumentsRepoController = DocumentsRepoController = __decorate([
    (0, tome_at_1.Tome)("tome7"),
    (0, common_1.Controller)("api/documents-repo"),
    __metadata("design:paramtypes", [documents_repo_service_1.DocumentsRepoService])
], DocumentsRepoController);
