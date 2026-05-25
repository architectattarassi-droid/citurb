import { Body, Controller, Get, Logger, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../tome-at";
import { JwtAuthGuard } from "../tome-5/auth/jwt-auth.guard";
import { PrismaService } from "../tome-at/kernel/prisma/prisma.service";
import { OwnerNotifyService } from "../../modules/owner-notify/owner-notify.service";

/**
 * ManualPaymentController — déclaration de paiement par TPE / Chèque certifié /
 * Virement RIB. Workflow alternatif à Stripe Checkout, pour les clients qui
 * préfèrent les méthodes traditionnelles.
 *
 * Doctrine T1 — extension multi-méthodes :
 *   Stripe (auto)    → webhook → PAYMENT_RECEIVED → PENDING_ADMIN_VALIDATION
 *   TPE/Chèque/RIB   → déclaration client → pendingManualPayment → notif admin
 *                    → admin vérifie réception → mark-paid → PAYMENT_RECEIVED
 *
 * Pour les 3 méthodes manuelles, le client INDIQUE qu'il va payer via X méthode,
 * et l'admin valide manuellement la réception du paiement (depuis le backoffice
 * CC, onglet Validations Packs).
 */

type ManualPaymentMethod = "TPE" | "CHEQUE_CERTIFIE" | "VIREMENT_RIB";

type ManualPaymentDeclaration = {
  method: ManualPaymentMethod;
  declaredAt: string;
  declaredBy: string;            // user id
  reference?: string;            // chèque n° / RIB transfert ref / TPE transaction id
  amountMAD?: number;
  expectedDate?: string;          // date prévue de paiement (ex. dépôt chèque)
  note?: string;                  // info libre client
  status: "AWAITING_VERIFICATION" | "VERIFIED" | "REJECTED";
};

@Tome("tome1")
@Controller("api/payment")
export class ManualPaymentController {
  // Guard appliqué par méthode : methods/info est public (catalogue),
  // declare-manual et manual-status nécessitent un JWT.
  private readonly logger = new Logger(ManualPaymentController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ownerNotify: OwnerNotifyService,
  ) {}

  /**
   * Renvoie les coordonnées bancaires CITURBAREA + instructions par méthode.
   * Public — n'expose pas de données sensibles.
   *
   *   GET /api/payment/methods/info
   */
  @Get("methods/info")
  getMethodsInfo() {
    return {
      ok: true,
      methods: [
        {
          id: "STRIPE",
          label: "Carte bancaire en ligne (Stripe)",
          subtitle: "Paiement sécurisé instantané — Visa, Mastercard, Amex",
          icon: "💳",
          processing: "instant",
          activation: "Sous 24h après validation admin",
          fee: "Aucun frais supplémentaire",
        },
        {
          id: "TPE",
          label: "TPE — Carte bancaire en présentiel",
          subtitle: "Présenter la carte au siège CITURBAREA (Rabat) — terminal physique",
          icon: "📟",
          processing: "Lors de votre passage au siège",
          activation: "Immédiate après transaction TPE confirmée",
          fee: "Aucun frais supplémentaire",
          contact: "Rabat — sur RDV : +212 700 127 892",
        },
        {
          id: "CHEQUE_CERTIFIE",
          label: "Chèque certifié",
          subtitle: "À l'ordre de CITURBAREA — déposé/envoyé au siège",
          icon: "🧾",
          processing: "À réception + encaissement (3-5 jours bancaires)",
          activation: "Sous 7 jours ouvrables après dépôt du chèque",
          fee: "Aucun frais",
          beneficiaire: "CITURBAREA SARL",
          adresseDepot: "Rabat — adresse communiquée par email après déclaration",
        },
        {
          id: "VIREMENT_RIB",
          label: "Virement bancaire (RIB)",
          subtitle: "Virement sur compte CITURBAREA — référence dossier obligatoire",
          icon: "🏦",
          processing: "Selon délai de votre banque (24-72h)",
          activation: "Sous 48h après crédit du compte",
          fee: "Aucun frais CITURBAREA — frais bancaires éventuels à votre charge",
          rib: "Communiqué par email après déclaration",
          banque: "—",
          reference: "Obligatoire : N° dossier CITURBAREA (ex. dossier-abc123)",
        },
      ],
    };
  }

  /**
   * Déclaration d'un paiement manuel par le client.
   * Le client n'effectue PAS le paiement ici — il déclare qu'il va le faire
   * via TPE / Chèque / Virement, ce qui notifie l'admin de surveiller la
   * réception. L'admin valide manuellement quand le paiement arrive.
   *
   *   POST /api/payment/declare-manual/:dossierId
   *   Body: { method, reference?, expectedDate?, note? }
   */
  @Post("declare-manual/:dossierId")
  @UseGuards(JwtAuthGuard)
  async declareManual(
    @Param("dossierId") dossierId: string,
    @Body() body: { method: ManualPaymentMethod; reference?: string; expectedDate?: string; note?: string },
    @Req() req: any,
  ) {
    const method = body?.method;
    if (!method || !["TPE", "CHEQUE_CERTIFIE", "VIREMENT_RIB"].includes(method)) {
      return { ok: false, error: "invalid_method", message: "Méthode invalide. Valides : TPE, CHEQUE_CERTIFIE, VIREMENT_RIB." };
    }

    const dossier = await this.prisma.dossier.findUniqueOrThrow({
      where: { id: dossierId },
      select: { id: true, ownerId: true, porteType: true, title: true, clientNom: true, clientEmail: true, payload: true },
    });

    const userId = req.user?.userId;
    const role = (req.user?.role || "").toString().toUpperCase();
    const isAdmin = ["ADMIN", "OWNER", "OPS"].includes(role);
    if (!isAdmin && dossier.ownerId !== userId) {
      return { ok: false, error: "forbidden", message: "Accès refusé" };
    }

    const payload: any = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
    const pv = payload.packValidation;
    if (pv?.status === "ACTIVATED") {
      return { ok: false, error: "already_activated", message: "Pack déjà activé" };
    }
    if (pv?.status === "PENDING_ADMIN_VALIDATION") {
      return { ok: false, error: "already_paid", message: "Paiement déjà reçu, en attente de validation admin" };
    }

    // Montant attendu depuis quoteSnapshot
    const brief = payload.brief ?? {};
    const quote = brief.quoteSnapshot ?? {};
    const amountMAD = quote.honoraires?.totalTTC ?? quote.amounts?.totalTTC ?? null;

    const now = new Date().toISOString();
    const declaration: ManualPaymentDeclaration = {
      method,
      declaredAt: now,
      declaredBy: userId,
      reference: body?.reference?.trim() || undefined,
      amountMAD: amountMAD ?? undefined,
      expectedDate: body?.expectedDate?.trim() || undefined,
      note: body?.note?.trim() || undefined,
      status: "AWAITING_VERIFICATION",
    };

    payload.pendingManualPayment = declaration;
    payload.packValidation = {
      ...(pv ?? { history: [] }),
      status: "PENDING_PAYMENT",
      history: [
        ...((pv?.history) || []),
        { ts: now, status: "PENDING_PAYMENT", author: userId, note: `Déclaration paiement manuel ${method}${body?.reference ? ` (réf: ${body.reference})` : ""}` },
      ],
    };

    await this.prisma.dossier.update({
      where: { id: dossierId },
      data: { payload },
    });

    // Notification admin/owner — quelqu'un doit surveiller la réception du paiement
    try {
      await this.ownerNotify.notify("PACK_AWAITING_VALIDATION", {
        dossierId,
        porteType: dossier.porteType,
        title: dossier.title,
        clientName: dossier.clientNom || dossier.clientEmail,
        manualPaymentMethod: method,
        manualPaymentReference: body?.reference,
        expectedAmountMAD: amountMAD,
        expectedDate: body?.expectedDate,
        clientNote: body?.note,
      });
    } catch (e: any) {
      this.logger.warn(`[ManualPayment] Notif owner échec : ${e?.message}`);
    }

    this.logger.log(`[ManualPayment] Dossier ${dossierId} — méthode ${method} déclarée par ${userId}`);

    return {
      ok: true,
      dossierId,
      declaration,
      instructions: this.instructionsFor(method, dossierId, amountMAD),
    };
  }

  /**
   * Renvoie l'état actuel de la déclaration manuelle (pour la page success).
   *
   *   GET /api/payment/manual-status/:dossierId
   */
  @Get("manual-status/:dossierId")
  @UseGuards(JwtAuthGuard)
  async getManualStatus(@Param("dossierId") dossierId: string, @Req() req: any) {
    const dossier = await this.prisma.dossier.findUniqueOrThrow({
      where: { id: dossierId },
      select: { id: true, ownerId: true, payload: true },
    });
    const userId = req.user?.userId;
    const role = (req.user?.role || "").toString().toUpperCase();
    const isAdmin = ["ADMIN", "OWNER", "OPS"].includes(role);
    if (!isAdmin && dossier.ownerId !== userId) {
      return { ok: false, error: "forbidden" };
    }
    const payload: any = dossier.payload && typeof dossier.payload === "object" ? dossier.payload : {};
    return {
      ok: true,
      pendingManualPayment: payload.pendingManualPayment ?? null,
      packValidation: payload.packValidation ?? null,
    };
  }

  private instructionsFor(method: ManualPaymentMethod, dossierId: string, amountMAD: number | null) {
    const dossierRef = `CITURB-${dossierId.slice(0, 8).toUpperCase()}`;
    const amount = amountMAD ? `${amountMAD.toLocaleString("fr-FR")} MAD` : "montant à confirmer";
    switch (method) {
      case "TPE":
        return {
          method: "TPE",
          steps: [
            "Prenez rendez-vous au siège CITURBAREA : +212 700 127 892",
            "Présentez-vous au siège avec votre carte bancaire",
            `Montant à régler : ${amount}`,
            `Référence dossier : ${dossierRef}`,
            "La transaction TPE sera confirmée immédiatement",
            "Votre pack sera activé sous 24h après confirmation admin",
          ],
          contact: {
            phone: "+212 700 127 892",
            email: "architectattarassi@gmail.com",
            hours: "Lun-Ven 9h-18h",
          },
        };
      case "CHEQUE_CERTIFIE":
        return {
          method: "CHEQUE_CERTIFIE",
          steps: [
            "Faites établir un chèque certifié à l'ordre de CITURBAREA SARL",
            `Montant : ${amount}`,
            "Au dos du chèque, inscrivez la référence dossier",
            `Référence dossier : ${dossierRef}`,
            "Déposez le chèque au siège ou envoyez-le par courrier sécurisé",
            "Email à architectattarassi@gmail.com pour confirmer l'envoi + numéro de chèque",
            "Activation sous 7 jours ouvrables après dépôt + encaissement",
          ],
          beneficiaire: "CITURBAREA SARL",
          adresse: "Adresse exacte communiquée par email après votre déclaration",
        };
      case "VIREMENT_RIB":
        return {
          method: "VIREMENT_RIB",
          steps: [
            "Effectuez un virement depuis votre compte bancaire",
            `Montant : ${amount}`,
            "Bénéficiaire : CITURBAREA SARL",
            `Référence virement OBLIGATOIRE : ${dossierRef}`,
            "RIB communiqué par email après votre déclaration (sécurité)",
            "Envoyez le justificatif de virement à architectattarassi@gmail.com",
            "Activation sous 48h après crédit du compte CITURBAREA",
          ],
          dossierRef,
          warning: "Le virement sans la référence dossier ne pourra pas être affecté à votre dossier — risque de retard d'activation.",
        };
    }
  }
}
