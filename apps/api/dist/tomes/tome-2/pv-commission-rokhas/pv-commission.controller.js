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
exports.PvCommissionController = void 0;
/**
 * Tome 2 — PV Commission Rokhas — Controller
 *
 * Endpoints :
 *   POST   /api/pv-commission/upload/:dossierId
 *   POST   /api/pv-commission/:pvId/parse
 *   GET    /api/pv-commission/dossier/:dossierId
 *   GET    /api/pv-commission/:pvId
 *   POST   /api/pv-commission/:pvId/reserves/:reserveId/lever
 *   GET    /api/pv-commission/:pvId/pdf
 *   POST   /api/pv-commission/webhook/rokhas  (HMAC, pas d'auth JWT)
 *
 * NOTE : la route racine /api/pv-commission doit être ajoutée à la
 * `allow-list` du MutationGateGuard (cf. INTEGRATION.md).
 */
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const tome_at_1 = require("../../tome-at");
const pv_commission_service_1 = require("./pv-commission.service");
const MAX_PDF_BYTES = 15 * 1024 * 1024;
let PvCommissionController = class PvCommissionController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    // ── UPLOAD (auth) ─────────────────────────────────────────────────────────
    async upload(dossierId, file, req) {
        if (!file)
            throw new common_1.BadRequestException("Aucun fichier reçu");
        const v = await this.svc.uploadPv({
            dossierId,
            file: {
                buffer: file.buffer,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
            },
            uploadedBy: req.user?.userId || "unknown",
        });
        return { ok: true, pv: v };
    }
    // ── PARSE (auth) ──────────────────────────────────────────────────────────
    async parse(pvId, req) {
        const r = await this.svc.parsePv(pvId, req.user?.userId || "unknown");
        return { ok: true, pv: r.pv, workflow: r.workflow };
    }
    // ── READ (auth) ───────────────────────────────────────────────────────────
    async listByDossier(dossierId) {
        const items = await this.svc.listByDossier(dossierId);
        return { ok: true, count: items.length, items };
    }
    async getOne(pvId) {
        const pv = await this.svc.getById(pvId);
        return { ok: true, pv };
    }
    // ── LEVÉE DE RÉSERVE (auth, architecte/OPS/owner) ─────────────────────────
    async leverReserve(pvId, reserveId, body, req) {
        const role = req.user?.role;
        if (!["OWNER", "ADMIN", "OPS", "OPERATOR"].includes(role)) {
            throw new common_1.ForbiddenException("Levée de réserve réservée à l'architecte / OPS");
        }
        const pv = await this.svc.leverReserve({
            pvId,
            reserveId,
            preuveUrl: body.preuveUrl,
            note: body.note,
            leveeBy: req.user.userId,
        });
        return { ok: true, pv };
    }
    // ── PDF DOWNLOAD (auth) ───────────────────────────────────────────────────
    async getPdf(pvId, res) {
        const fullPath = await this.svc.getPdfPath(pvId);
        try {
            const buf = await fs_1.promises.readFile(fullPath);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="${pvId}.pdf"`);
            res.setHeader("Cache-Control", "private, no-cache");
            return res.send(buf);
        }
        catch (e) {
            throw new common_1.BadRequestException(`PDF inaccessible: ${e?.message}`);
        }
    }
    // ── WEBHOOK ROKHAS (pas d'auth JWT, HMAC) ─────────────────────────────────
    /**
     * Webhook reçu depuis rokhas.ma quand une commission produit un PV.
     * Signature HMAC SHA-256 du body avec `ROKHAS_WEBHOOK_SECRET`,
     * envoyée dans le header `X-Rokhas-Signature: sha256=<hex>`.
     * Anti-replay : timestamp dans header `X-Rokhas-Timestamp` (±5 min).
     */
    async rokhasWebhook(sig, ts, body, req) {
        const secret = process.env.ROKHAS_WEBHOOK_SECRET;
        if (!secret)
            throw new common_1.ForbiddenException("Webhook désactivé (ROKHAS_WEBHOOK_SECRET manquant)");
        if (!sig || !ts)
            throw new common_1.ForbiddenException("Signature ou timestamp manquant");
        // Anti-replay 5 min
        const tsNum = Number(ts);
        if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
            throw new common_1.ForbiddenException("Timestamp expiré (>5 min)");
        }
        // Recalcule HMAC (rawBody fourni par express si bodyParser.raw, sinon
        // on rejette par sérialisation du body JSON — tolérant aux deux configs).
        const rawBody = req.rawBody;
        const payload = rawBody ? rawBody.toString("utf8") : JSON.stringify(body);
        const expected = (0, crypto_1.createHmac)("sha256", secret).update(`${ts}.${payload}`).digest("hex");
        const got = sig.replace(/^sha256=/i, "").trim();
        let ok = false;
        try {
            ok = expected.length === got.length && (0, crypto_1.timingSafeEqual)(Buffer.from(expected, "hex"), Buffer.from(got, "hex"));
        }
        catch {
            ok = false;
        }
        if (!ok)
            throw new common_1.ForbiddenException("Signature HMAC invalide");
        if (!body?.dossierId || !body?.pdfBase64)
            throw new common_1.BadRequestException("Payload invalide");
        const pv = await this.svc.ingestFromWebhook(body);
        return { ok: true, pvId: pv.id, decision: pv.decision };
    }
};
exports.PvCommissionController = PvCommissionController;
__decorate([
    (0, common_1.Post)("upload/:dossierId"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file", { limits: { fileSize: MAX_PDF_BYTES } })),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PvCommissionController.prototype, "upload", null);
__decorate([
    (0, common_1.Post)(":pvId/parse"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("pvId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PvCommissionController.prototype, "parse", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PvCommissionController.prototype, "listByDossier", null);
__decorate([
    (0, common_1.Get)(":pvId"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("pvId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PvCommissionController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(":pvId/reserves/:reserveId/lever"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("pvId")),
    __param(1, (0, common_1.Param)("reserveId")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], PvCommissionController.prototype, "leverReserve", null);
__decorate([
    (0, common_1.Get)(":pvId/pdf"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("pvId")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PvCommissionController.prototype, "getPdf", null);
__decorate([
    (0, common_1.Post)("webhook/rokhas"),
    __param(0, (0, common_1.Headers)("x-rokhas-signature")),
    __param(1, (0, common_1.Headers)("x-rokhas-timestamp")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PvCommissionController.prototype, "rokhasWebhook", null);
exports.PvCommissionController = PvCommissionController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("api/pv-commission"),
    __metadata("design:paramtypes", [pv_commission_service_1.PvCommissionService])
], PvCommissionController);
