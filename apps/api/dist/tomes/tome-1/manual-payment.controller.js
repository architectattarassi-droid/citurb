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
var ManualPaymentController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManualPaymentController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../tome-at");
const jwt_auth_guard_1 = require("../tome-5/auth/jwt-auth.guard");
const prisma_service_1 = require("../tome-at/kernel/prisma/prisma.service");
const owner_notify_service_1 = require("../../modules/owner-notify/owner-notify.service");
let ManualPaymentController = ManualPaymentController_1 = class ManualPaymentController {
    prisma;
    ownerNotify;
    // Guard appliqué par méthode : methods/info est public (catalogue),
    // declare-manual et manual-status nécessitent un JWT.
    logger = new common_1.Logger(ManualPaymentController_1.name);
    constructor(prisma, ownerNotify) {
        this.prisma = prisma;
        this.ownerNotify = ownerNotify;
    }
    /**
     * Renvoie les coordonnées bancaires CITURBAREA + instructions par méthode.
     * Public — n'expose pas de données sensibles.
     *
     *   GET /api/payment/methods/info
     */
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
    async declareManual(dossierId, body, req) {
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
        const payload = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
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
        const declaration = {
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
        }
        catch (e) {
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
    async getManualStatus(dossierId, req) {
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
        const payload = dossier.payload && typeof dossier.payload === "object" ? dossier.payload : {};
        return {
            ok: true,
            pendingManualPayment: payload.pendingManualPayment ?? null,
            packValidation: payload.packValidation ?? null,
        };
    }
    instructionsFor(method, dossierId, amountMAD) {
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
};
exports.ManualPaymentController = ManualPaymentController;
__decorate([
    (0, common_1.Get)("methods/info"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ManualPaymentController.prototype, "getMethodsInfo", null);
__decorate([
    (0, common_1.Post)("declare-manual/:dossierId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ManualPaymentController.prototype, "declareManual", null);
__decorate([
    (0, common_1.Get)("manual-status/:dossierId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ManualPaymentController.prototype, "getManualStatus", null);
exports.ManualPaymentController = ManualPaymentController = ManualPaymentController_1 = __decorate([
    (0, tome_at_1.Tome)("tome1"),
    (0, common_1.Controller)("api/payment"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        owner_notify_service_1.OwnerNotifyService])
], ManualPaymentController);
