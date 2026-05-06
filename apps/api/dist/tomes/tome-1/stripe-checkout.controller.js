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
var StripeCheckoutController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeCheckoutController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../tome-at");
const jwt_auth_guard_1 = require("../tome-5/auth/jwt-auth.guard");
const prisma_service_1 = require("../tome-at/kernel/prisma/prisma.service");
/**
 * StripeCheckoutController — création d'une session Stripe Checkout.
 *
 * Doctrine T1: paiement → entitlements unlock (gated par admin validation).
 *
 * Flux:
 *   1. Client connecté soumet wizard → Dossier créé
 *   2. Client appelle POST /api/payment/checkout-session/:dossierId
 *   3. Backend crée une Checkout Session Stripe avec metadata.dossierId
 *   4. Backend renvoie session.url, frontend redirige
 *   5. Client paie sur Stripe-hosted page
 *   6. Stripe webhook (déjà implémenté en D.2) → PackValidationService
 *   7. Status passe à PENDING_ADMIN_VALIDATION
 *   8. Client redirigé vers /payment/success?session_id=xxx
 *
 * Sécurité:
 *   - Gated sur ownership dossier (client doit être ownerId du dossier)
 *   - STRIPE_SECRET_KEY requis sinon 503 gracieux
 *   - Montant lu directement depuis payload.brief.quoteSnapshot (pas de
 *     manipulation côté client)
 */
let StripeCheckoutController = StripeCheckoutController_1 = class StripeCheckoutController {
    prisma;
    logger = new common_1.Logger(StripeCheckoutController_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createSession(dossierId, req) {
        const secret = process.env.STRIPE_SECRET_KEY;
        if (!secret) {
            this.logger.warn("[StripeCheckout] STRIPE_SECRET_KEY non configuré");
            return { ok: false, error: "stripe_not_configured", message: "Le paiement Stripe n'est pas encore configuré. Contactez l'admin pour le mode manuel." };
        }
        const dossier = await this.prisma.dossier.findUniqueOrThrow({
            where: { id: dossierId },
            select: {
                id: true, ownerId: true, porteType: true, title: true,
                clientNom: true, clientEmail: true, raisonSociale: true,
                payload: true,
            },
        });
        // Vérifier ownership ou admin
        const userId = req.user?.userId;
        const role = (req.user?.role || "").toString().toUpperCase();
        const isAdmin = ["ADMIN", "OWNER", "OPS"].includes(role);
        if (!isAdmin && dossier.ownerId !== userId) {
            return { ok: false, error: "forbidden", message: "Accès refusé" };
        }
        // Extraire le montant TTC depuis brief.quoteSnapshot
        const brief = dossier.payload?.brief ?? {};
        const quote = brief.quoteSnapshot ?? {};
        let amountMAD = 0;
        // Selon la porte le montant est dans honoraires.totalTTC ou amounts.totalTTC
        if (quote.honoraires?.totalTTC)
            amountMAD = quote.honoraires.totalTTC;
        else if (quote.amounts?.totalTTC)
            amountMAD = quote.amounts.totalTTC;
        if (!amountMAD || amountMAD <= 0) {
            return { ok: false, error: "no_amount", message: "Aucun montant calculable depuis le devis du dossier." };
        }
        // Vérifier que le pack n'est pas déjà payé
        const pv = dossier.payload?.packValidation;
        if (pv?.status === "ACTIVATED") {
            return { ok: false, error: "already_activated", message: "Pack déjà activé" };
        }
        if (pv?.status === "PENDING_ADMIN_VALIDATION") {
            return { ok: false, error: "already_paid", message: "Paiement déjà reçu, en attente de validation admin" };
        }
        const productName = `${dossier.porteType} — ${dossier.title || "CITURBAREA"}`.slice(0, 100);
        const customerEmail = dossier.clientEmail || req.user?.email;
        const successUrl = `${process.env.PUBLIC_WEB_URL || "https://citurb-web-production.up.railway.app"}/payment/success?session_id={CHECKOUT_SESSION_ID}&dossierId=${dossierId}`;
        const cancelUrl = `${process.env.PUBLIC_WEB_URL || "https://citurb-web-production.up.railway.app"}/payment/cancel?dossierId=${dossierId}`;
        // Créer la session via Stripe REST API (sans lib stripe)
        const params = new URLSearchParams();
        params.append("mode", "payment");
        params.append("payment_method_types[0]", "card");
        params.append("line_items[0][price_data][currency]", "mad");
        params.append("line_items[0][price_data][product_data][name]", productName);
        params.append("line_items[0][price_data][unit_amount]", String(Math.round(amountMAD * 100))); // Stripe en centimes
        params.append("line_items[0][quantity]", "1");
        params.append("success_url", successUrl);
        params.append("cancel_url", cancelUrl);
        params.append("metadata[dossierId]", dossierId);
        params.append("metadata[porteType]", dossier.porteType ?? "");
        if (customerEmail)
            params.append("customer_email", customerEmail);
        try {
            const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${secret}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params.toString(),
            });
            const data = await res.json();
            if (!res.ok) {
                this.logger.error(`[StripeCheckout] Stripe error: ${JSON.stringify(data?.error || data)}`);
                return { ok: false, error: "stripe_api_error", message: data?.error?.message || "Erreur Stripe" };
            }
            this.logger.log(`[StripeCheckout] Session ${data.id} créée pour dossier ${dossierId} (${amountMAD} MAD)`);
            return { ok: true, sessionId: data.id, url: data.url, amountMAD };
        }
        catch (e) {
            this.logger.error(`[StripeCheckout] Network error: ${e?.message}`);
            return { ok: false, error: "network", message: e?.message };
        }
    }
    async getSessionStatus(sessionId, dossierId) {
        const secret = process.env.STRIPE_SECRET_KEY;
        if (!secret)
            return { ok: false, error: "stripe_not_configured" };
        try {
            const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
                method: "GET",
                headers: { Authorization: `Bearer ${secret}` },
            });
            const data = await res.json();
            if (!res.ok)
                return { ok: false, error: data?.error?.message };
            return {
                ok: true,
                paymentStatus: data.payment_status, // paid / unpaid / no_payment_required
                status: data.status, // open / complete / expired
                amountTotal: data.amount_total ? data.amount_total / 100 : null,
                currency: data.currency,
                customerEmail: data.customer_email,
                dossierId: data.metadata?.dossierId,
            };
        }
        catch (e) {
            return { ok: false, error: e?.message };
        }
    }
};
exports.StripeCheckoutController = StripeCheckoutController;
__decorate([
    (0, common_1.Post)("checkout-session/:dossierId"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StripeCheckoutController.prototype, "createSession", null);
__decorate([
    (0, common_1.Get)("session/:sessionId/status"),
    __param(0, (0, common_1.Param)("sessionId")),
    __param(1, (0, common_1.Query)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StripeCheckoutController.prototype, "getSessionStatus", null);
exports.StripeCheckoutController = StripeCheckoutController = StripeCheckoutController_1 = __decorate([
    (0, tome_at_1.Tome)("tome1"),
    (0, common_1.Controller)("api/payment"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StripeCheckoutController);
