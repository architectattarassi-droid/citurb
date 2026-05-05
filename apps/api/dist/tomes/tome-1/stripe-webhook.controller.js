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
var StripeWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeWebhookController = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const tome_at_1 = require("../tome-at");
const pack_validation_service_1 = require("./pack-validation.service");
/**
 * StripeWebhookController — réception des événements Stripe.
 *
 * Doctrine T1: paiement → entitlements unlock (override par admin via PackValidationService)
 *
 * Flux:
 *  1. Stripe POST /webhooks/stripe avec body brut + header Stripe-Signature
 *  2. On vérifie la signature HMAC-SHA256 avec STRIPE_WEBHOOK_SECRET
 *  3. Sur payment_intent.succeeded → on extrait dossierId du metadata
 *  4. PackValidationService.handlePaymentReceived(...)
 *
 * NB: pas de dépendance npm `stripe` — on fait DIY avec crypto pour limiter
 * le poids (la lib pèse ~700KB). Si on a besoin de fonctionnalités avancées
 * (Refund automation, dispute handling, etc.) on installera la lib plus tard.
 *
 * Sécurité:
 *  - Si STRIPE_WEBHOOK_SECRET pas configuré → endpoint refuse 503
 *  - Tolérance timestamp: 5 minutes (anti-replay)
 *  - Comparaison HMAC en temps constant (timingSafeEqual)
 */
const TOLERANCE_SECONDS = 300;
let StripeWebhookController = StripeWebhookController_1 = class StripeWebhookController {
    packValidation;
    logger = new common_1.Logger(StripeWebhookController_1.name);
    constructor(packValidation) {
        this.packValidation = packValidation;
    }
    async stripe(signatureHeader, req, body) {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
            this.logger.warn("[StripeWebhook] STRIPE_WEBHOOK_SECRET non configuré — endpoint inactif");
            return { ok: false, error: "webhook not configured" };
        }
        if (!signatureHeader) {
            this.logger.warn("[StripeWebhook] Header Stripe-Signature manquant");
            return { ok: false, error: "signature missing" };
        }
        // Parse Stripe-Signature: "t=1234567890,v1=abc...,v0=xyz..."
        const parts = signatureHeader.split(",").map(s => s.trim());
        const ts = parts.find(p => p.startsWith("t="))?.slice(2);
        const v1 = parts.find(p => p.startsWith("v1="))?.slice(3);
        if (!ts || !v1) {
            return { ok: false, error: "signature malformed" };
        }
        // Anti-replay: timestamp doit être récent
        const tsNum = Number(ts);
        if (!Number.isFinite(tsNum))
            return { ok: false, error: "timestamp invalid" };
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - tsNum) > TOLERANCE_SECONDS) {
            this.logger.warn(`[StripeWebhook] Timestamp expiré (delta ${now - tsNum}s)`);
            return { ok: false, error: "timestamp expired" };
        }
        // Vérification HMAC-SHA256(secret, "${timestamp}.${rawBody}")
        // Note: NestJS @Body() parse déjà le JSON. Pour Stripe il faut le raw body.
        // Workaround: utiliser req.rawBody si disponible (configuré dans main.ts)
        // ou re-sérialiser (fragile mais fonctionnel pour la plupart des cas).
        const rawBody = req.rawBody ?? JSON.stringify(body);
        const signedPayload = `${ts}.${rawBody}`;
        const expected = (0, crypto_1.createHmac)("sha256", secret).update(signedPayload).digest("hex");
        let valid = false;
        try {
            const a = Buffer.from(expected, "hex");
            const b = Buffer.from(v1, "hex");
            valid = a.length === b.length && (0, crypto_1.timingSafeEqual)(a, b);
        }
        catch {
            valid = false;
        }
        if (!valid) {
            this.logger.warn(`[StripeWebhook] Signature invalide`);
            return { ok: false, error: "signature invalid" };
        }
        // Signature OK → traiter l'event
        const event = body;
        this.logger.log(`[StripeWebhook] Event ${event.type} (id ${event.id})`);
        if (event.type === "payment_intent.succeeded" || event.type === "checkout.session.completed") {
            const obj = event.data?.object ?? {};
            const dossierId = obj.metadata?.dossierId ?? obj.metadata?.dossier_id;
            const amount = (obj.amount_received ?? obj.amount_total ?? obj.amount ?? 0) / 100; // Stripe amounts en centimes
            const currency = (obj.currency ?? "MAD").toUpperCase();
            const paymentRef = obj.id ?? `STRIPE-${Date.now()}`;
            if (!dossierId) {
                this.logger.warn(`[StripeWebhook] Pas de dossierId dans metadata pour event ${event.id}`);
                return { ok: true, received: true, processed: false, reason: "no dossierId" };
            }
            try {
                await this.packValidation.handlePaymentReceived({
                    dossierId, paymentRef, amount, currency, author: "stripe-webhook",
                });
                return { ok: true, received: true, processed: true, dossierId };
            }
            catch (e) {
                this.logger.error(`[StripeWebhook] handlePaymentReceived failed: ${e?.message}`);
                return { ok: false, error: "processing failed" };
            }
        }
        // Autres events ignorés (charge.refunded, etc.) — on log et on accuse réception
        return { ok: true, received: true, processed: false, type: event.type };
    }
};
exports.StripeWebhookController = StripeWebhookController;
__decorate([
    (0, common_1.Post)("stripe"),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Headers)("stripe-signature")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], StripeWebhookController.prototype, "stripe", null);
exports.StripeWebhookController = StripeWebhookController = StripeWebhookController_1 = __decorate([
    (0, tome_at_1.Tome)("tome1"),
    (0, common_1.Controller)("webhooks"),
    __metadata("design:paramtypes", [pack_validation_service_1.PackValidationService])
], StripeWebhookController);
