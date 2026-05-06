import { Controller, Get, Logger, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../tome-at";
import { JwtAuthGuard } from "../tome-5/auth/jwt-auth.guard";
import { PrismaService } from "../tome-at/kernel/prisma/prisma.service";

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

@Tome("tome1")
@Controller("api/payment")
@UseGuards(JwtAuthGuard)
export class StripeCheckoutController {
  private readonly logger = new Logger(StripeCheckoutController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post("checkout-session/:dossierId")
  async createSession(@Param("dossierId") dossierId: string, @Req() req: any) {
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
    const brief = (dossier.payload as any)?.brief ?? {};
    const quote = brief.quoteSnapshot ?? {};
    let amountMAD = 0;

    // Selon la porte le montant est dans honoraires.totalTTC ou amounts.totalTTC
    if (quote.honoraires?.totalTTC) amountMAD = quote.honoraires.totalTTC;
    else if (quote.amounts?.totalTTC) amountMAD = quote.amounts.totalTTC;

    if (!amountMAD || amountMAD <= 0) {
      return { ok: false, error: "no_amount", message: "Aucun montant calculable depuis le devis du dossier." };
    }

    // Vérifier que le pack n'est pas déjà payé
    const pv = (dossier.payload as any)?.packValidation;
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
    if (customerEmail) params.append("customer_email", customerEmail);

    try {
      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const data: any = await res.json();
      if (!res.ok) {
        this.logger.error(`[StripeCheckout] Stripe error: ${JSON.stringify(data?.error || data)}`);
        return { ok: false, error: "stripe_api_error", message: data?.error?.message || "Erreur Stripe" };
      }
      this.logger.log(`[StripeCheckout] Session ${data.id} créée pour dossier ${dossierId} (${amountMAD} MAD)`);
      return { ok: true, sessionId: data.id, url: data.url, amountMAD };
    } catch (e: any) {
      this.logger.error(`[StripeCheckout] Network error: ${e?.message}`);
      return { ok: false, error: "network", message: e?.message };
    }
  }

  @Get("session/:sessionId/status")
  async getSessionStatus(@Param("sessionId") sessionId: string, @Query("dossierId") dossierId: string) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return { ok: false, error: "stripe_not_configured" };

    try {
      const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data: any = await res.json();
      if (!res.ok) return { ok: false, error: data?.error?.message };
      return {
        ok: true,
        paymentStatus: data.payment_status, // paid / unpaid / no_payment_required
        status: data.status,                  // open / complete / expired
        amountTotal: data.amount_total ? data.amount_total / 100 : null,
        currency: data.currency,
        customerEmail: data.customer_email,
        dossierId: data.metadata?.dossierId,
      };
    } catch (e: any) {
      return { ok: false, error: e?.message };
    }
  }
}
