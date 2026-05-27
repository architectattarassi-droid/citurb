"use strict";
/**
 * lead-funnel.controller.ts
 *
 * Endpoints publics + admin du module LEAD FUNNEL.
 *
 * Tome 0 (capture / instrumentation amont). Le webhook WhatsApp et la
 * route POST `/capture` sont publics ; les autres routes sont gardées
 * par JwtAuthGuard.
 *
 * À ajouter à l'allow-list MutationGate : `/api/lead-funnel`
 * (cf. INTEGRATION.md).
 */
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
exports.LeadFunnelController = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-at/security/jwt-auth.guard");
const lead_funnel_service_1 = require("./lead-funnel.service");
let LeadFunnelController = class LeadFunnelController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    // ── Public : capture ──────────────────────────────────────────────
    async capture(body, req) {
        if (!body || typeof body !== "object") {
            throw new common_1.BadRequestException("payload_invalid");
        }
        // Enrichit avec headers utiles (IP / UA / referer) en meta
        const meta = {
            ip: (req?.headers?.["x-forwarded-for"] || req?.ip || "").toString(),
            ua: (req?.headers?.["user-agent"] || "").toString(),
            referer: (req?.headers?.["referer"] || "").toString(),
        };
        try {
            const result = await this.svc.capture({ ...body, meta });
            return { ok: true, ...result };
        }
        catch (e) {
            if (e?.message === "phone_invalid") {
                throw new common_1.BadRequestException("phone_invalid");
            }
            if (e?.message === "nom_invalid") {
                throw new common_1.BadRequestException("nom_invalid");
            }
            throw e;
        }
    }
    // ── Admin (JWT) ───────────────────────────────────────────────────
    async getLead(id) {
        const lead = this.svc.get(id);
        if (!lead)
            throw new common_1.NotFoundException("lead_not_found");
        return { ok: true, lead };
    }
    async list(stage, minScore, limit) {
        const leads = this.svc.list({
            stage,
            minScore: minScore ? Number(minScore) : undefined,
            limit: limit ? Number(limit) : 100,
        });
        return { ok: true, leads, total: leads.length };
    }
    async rescore(id) {
        const lead = this.svc.rescore(id);
        if (!lead)
            throw new common_1.NotFoundException("lead_not_found");
        return { ok: true, score: lead.score, breakdown: lead.scoreBreakdown };
    }
    async setStage(id, body) {
        if (!body?.stage)
            throw new common_1.BadRequestException("stage_required");
        const lead = this.svc.setStage(id, body.stage);
        if (!lead)
            throw new common_1.NotFoundException("lead_not_found");
        return { ok: true, lead };
    }
    async stats() {
        return { ok: true, stats: this.svc.funnelStats() };
    }
    // ── Webhook WhatsApp Business (HMAC verify) ───────────────────────
    /**
     * Webhook Meta WhatsApp Business — vérif HMAC-SHA256 du body avec
     * `WHATSAPP_APP_SECRET`. Si secret absent : refus 401.
     *
     * GET = challenge de validation Meta (?hub.mode=subscribe&hub.challenge=…).
     * POST = inbound message → crée un lead si nouveau numéro.
     */
    async waChallenge(mode, token, challenge) {
        const expected = process.env.WHATSAPP_VERIFY_TOKEN || "";
        if (mode === "subscribe" && token && expected && token === expected) {
            return challenge || "ok";
        }
        throw new common_1.BadRequestException("verify_failed");
    }
    async waInbound(signature, req, body) {
        const secret = process.env.WHATSAPP_APP_SECRET || "";
        if (!secret) {
            return { ok: false, reason: "secret_not_configured" };
        }
        const rawBody = req?.rawBody
            ? req.rawBody.toString("utf8")
            : JSON.stringify(body || {});
        const expected = "sha256=" +
            (0, crypto_1.createHmac)("sha256", secret).update(rawBody, "utf8").digest("hex");
        if (!signature || !safeEq(signature, expected)) {
            return { ok: false, reason: "bad_signature" };
        }
        // Parsing minimal du payload WA Business
        try {
            const entries = body?.entry || [];
            for (const e of entries) {
                for (const c of e?.changes || []) {
                    for (const m of c?.value?.messages || []) {
                        const from = String(m?.from || "");
                        const text = String(m?.text?.body || "");
                        const phone = from.startsWith("+") ? from : `+${from}`;
                        await this.svc.capture({
                            nom: `WhatsApp ${phone.slice(-4)}`,
                            telephone: phone,
                            source: "WHATSAPP_INBOUND",
                            lang: "fr",
                            pageContext: "whatsapp",
                            meta: { text },
                        }).catch(() => undefined);
                    }
                }
            }
        }
        catch {
            // log silencieux : Meta réémet le webhook si non-200
        }
        return { ok: true };
    }
};
exports.LeadFunnelController = LeadFunnelController;
__decorate([
    (0, common_1.Post)("capture"),
    (0, common_1.HttpCode)(201),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LeadFunnelController.prototype, "capture", null);
__decorate([
    (0, common_1.Get)("lead/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeadFunnelController.prototype, "getLead", null);
__decorate([
    (0, common_1.Get)("list"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)("stage")),
    __param(1, (0, common_1.Query)("minScore")),
    __param(2, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LeadFunnelController.prototype, "list", null);
__decorate([
    (0, common_1.Post)("score/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeadFunnelController.prototype, "rescore", null);
__decorate([
    (0, common_1.Post)("stage/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LeadFunnelController.prototype, "setStage", null);
__decorate([
    (0, common_1.Get)("funnel-stats"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LeadFunnelController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)("webhook/whatsapp"),
    __param(0, (0, common_1.Query)("hub.mode")),
    __param(1, (0, common_1.Query)("hub.verify_token")),
    __param(2, (0, common_1.Query)("hub.challenge")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LeadFunnelController.prototype, "waChallenge", null);
__decorate([
    (0, common_1.Post)("webhook/whatsapp"),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Headers)("x-hub-signature-256")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], LeadFunnelController.prototype, "waInbound", null);
exports.LeadFunnelController = LeadFunnelController = __decorate([
    (0, tome_at_1.Tome)("tome0"),
    (0, common_1.Controller)("api/lead-funnel"),
    __metadata("design:paramtypes", [lead_funnel_service_1.LeadFunnelService])
], LeadFunnelController);
function safeEq(a, b) {
    try {
        const A = Buffer.from(a);
        const B = Buffer.from(b);
        if (A.length !== B.length)
            return false;
        return (0, crypto_1.timingSafeEqual)(A, B);
    }
    catch {
        return false;
    }
}
