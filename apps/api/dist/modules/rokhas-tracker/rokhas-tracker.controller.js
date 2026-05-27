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
exports.RokhasTrackerController = void 0;
/**
 * Rokhas Tracker — Controller
 *
 * Endpoints :
 *   POST   /api/rokhas-tracker/dossier/:dossierId/depot
 *   POST   /api/rokhas-tracker/dossier/:dossierId/event
 *   GET    /api/rokhas-tracker/dossier/:dossierId
 *   POST   /api/rokhas-tracker/dossier/:dossierId/reserve/:reserveId/lever
 *   GET    /api/rokhas-tracker/dossier/:dossierId/deadlines
 *   POST   /api/rokhas-tracker/webhook                 (HMAC, sans JWT)
 *
 * NOTE doctrine :
 *  - Toutes les mutations exigent que `/api/rokhas-tracker` soit dans
 *    l'allow-list de `MutationGateGuard` (cf. INTEGRATION.md).
 *  - Le webhook utilise HMAC-SHA256 (header X-Rokhas-Signature) +
 *    anti-replay 5 min (header X-Rokhas-Timestamp).
 */
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const tome_at_1 = require("../../tomes/tome-at");
const rokhas_tracker_service_1 = require("./rokhas-tracker.service");
let RokhasTrackerController = class RokhasTrackerController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    // ── DÉPÔT ─────────────────────────────────────────────────────────────────
    async registerDepot(dossierId, body, req) {
        if (!body || typeof body.projectCategory !== "number") {
            throw new common_1.BadRequestException("body.projectCategory requis (1, 2 ou 3)");
        }
        const inst = await this.svc.registerDepot({
            dossierId,
            projectCategory: body.projectCategory,
            depositDate: body.date ?? null,
            refRokhasCommune: body.refRokhas ?? null,
            actorId: req.user?.userId || "unknown",
        });
        return { ok: true, instance: inst };
    }
    // ── ÉVÉNEMENT ─────────────────────────────────────────────────────────────
    async addEvent(dossierId, body, req) {
        if (!body?.type)
            throw new common_1.BadRequestException("body.type requis");
        const inst = await this.svc.addEvent({
            dossierId,
            type: body.type,
            date: body.date ?? null,
            payload: body.payload ?? {},
            actorId: req.user?.userId || "unknown",
        });
        return { ok: true, instance: inst };
    }
    // ── READ ──────────────────────────────────────────────────────────────────
    async getInstance(dossierId) {
        const inst = await this.svc.getInstance(dossierId);
        if (!inst)
            return { ok: true, instance: null };
        return { ok: true, instance: inst };
    }
    async getDeadlines(dossierId) {
        const deadlines = await this.svc.listDeadlines(dossierId);
        return { ok: true, count: deadlines.length, deadlines };
    }
    // ── LEVÉE DE RÉSERVE ──────────────────────────────────────────────────────
    async leverReserve(dossierId, reserveId, body, req) {
        if (!body?.preuveDocId)
            throw new common_1.BadRequestException("preuveDocId requis");
        const role = req.user?.role;
        // Architecte / OPS / OWNER / ADMIN peuvent lever.
        if (!["OWNER", "ADMIN", "OPS", "OPERATOR", "CLIENT"].includes(role)) {
            throw new common_1.ForbiddenException("Levée de réserve réservée aux rôles autorisés");
        }
        const inst = await this.svc.leverReserve({
            dossierId,
            reserveId,
            preuveDocId: body.preuveDocId,
            preuveUrl: body.preuveUrl ?? null,
            actorId: req.user?.userId || "unknown",
        });
        return { ok: true, instance: inst };
    }
    // ── WEBHOOK (HMAC, sans JWT) ──────────────────────────────────────────────
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
        if (!body?.dossierId || !body?.type)
            throw new common_1.BadRequestException("Payload invalide");
        const inst = await this.svc.ingestFromWebhook(body);
        return { ok: true, dossierId: inst.dossierId, type: body.type };
    }
};
exports.RokhasTrackerController = RokhasTrackerController;
__decorate([
    (0, common_1.Post)("dossier/:dossierId/depot"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RokhasTrackerController.prototype, "registerDepot", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/event"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RokhasTrackerController.prototype, "addEvent", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RokhasTrackerController.prototype, "getInstance", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId/deadlines"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RokhasTrackerController.prototype, "getDeadlines", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/reserve/:reserveId/lever"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Param)("reserveId")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], RokhasTrackerController.prototype, "leverReserve", null);
__decorate([
    (0, common_1.Post)("webhook"),
    __param(0, (0, common_1.Headers)("x-rokhas-signature")),
    __param(1, (0, common_1.Headers)("x-rokhas-timestamp")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], RokhasTrackerController.prototype, "rokhasWebhook", null);
exports.RokhasTrackerController = RokhasTrackerController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("api/rokhas-tracker"),
    __metadata("design:paramtypes", [rokhas_tracker_service_1.RokhasTrackerService])
], RokhasTrackerController);
