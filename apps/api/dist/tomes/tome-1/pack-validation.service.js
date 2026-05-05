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
var PackValidationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackValidationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../tome-at/kernel/prisma/prisma.service");
let PackValidationService = PackValidationService_1 = class PackValidationService {
    prisma;
    logger = new common_1.Logger(PackValidationService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getState(dossierId) {
        const dossier = await this.prisma.dossier.findUniqueOrThrow({
            where: { id: dossierId },
            select: { payload: true },
        });
        const payload = dossier.payload && typeof dossier.payload === "object" ? dossier.payload : {};
        return payload.packValidation ?? { status: "PENDING_PAYMENT", history: [] };
    }
    /**
     * Appelé par Stripe webhook OU par admin (manual mark as paid).
     */
    async handlePaymentReceived(opts) {
        const dossier = await this.prisma.dossier.findUniqueOrThrow({
            where: { id: opts.dossierId },
            select: { payload: true },
        });
        const payload = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
        const prev = payload.packValidation ?? { status: "PENDING_PAYMENT", history: [] };
        const now = new Date().toISOString();
        const next = {
            ...prev,
            status: "PENDING_ADMIN_VALIDATION",
            paidAt: now,
            paymentRef: opts.paymentRef,
            paymentAmount: opts.amount,
            paymentCurrency: opts.currency ?? "MAD",
            history: [
                ...(prev.history ?? []),
                { ts: now, status: "PAYMENT_RECEIVED", author: opts.author, note: `Paiement ${opts.amount} ${opts.currency ?? "MAD"} (ref: ${opts.paymentRef})` },
                { ts: now, status: "PENDING_ADMIN_VALIDATION", author: "system", note: "En attente de validation admin" },
            ],
        };
        payload.packValidation = next;
        await this.prisma.dossier.update({ where: { id: opts.dossierId }, data: { payload } });
        this.logger.log(`[PackValidation] ${opts.dossierId} → PENDING_ADMIN_VALIDATION (paid ${opts.amount} ${opts.currency})`);
        return next;
    }
    /**
     * Admin valide le pack (clique "Valider le pack" dans backoffice).
     * Doctrine: nécessaire avant activation du dossier.
     */
    async adminValidate(opts) {
        const dossier = await this.prisma.dossier.findUniqueOrThrow({
            where: { id: opts.dossierId },
            select: { payload: true },
        });
        const payload = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
        const prev = payload.packValidation ?? { status: "PENDING_PAYMENT", history: [] };
        const now = new Date().toISOString();
        if (prev.status === "ACTIVATED") {
            throw new Error("Pack déjà activé");
        }
        const next = {
            ...prev,
            status: "ACTIVATED",
            validatedAt: now,
            validatedBy: opts.author,
            validationNote: opts.note,
            history: [
                ...(prev.history ?? []),
                { ts: now, status: "ACTIVATED", author: opts.author, note: opts.note ?? "Pack validé par admin" },
            ],
        };
        payload.packValidation = next;
        await this.prisma.dossier.update({ where: { id: opts.dossierId }, data: { payload } });
        this.logger.log(`[PackValidation] ${opts.dossierId} → ACTIVATED by ${opts.author}`);
        return next;
    }
    /**
     * Admin révoque (issue détectée post-validation).
     */
    async adminRevoke(opts) {
        const dossier = await this.prisma.dossier.findUniqueOrThrow({
            where: { id: opts.dossierId },
            select: { payload: true },
        });
        const payload = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
        const prev = payload.packValidation ?? { status: "PENDING_PAYMENT", history: [] };
        const now = new Date().toISOString();
        const next = {
            ...prev,
            status: "REVOKED",
            revokedAt: now,
            revokedBy: opts.author,
            revokedReason: opts.reason,
            history: [
                ...(prev.history ?? []),
                { ts: now, status: "REVOKED", author: opts.author, note: opts.reason },
            ],
        };
        payload.packValidation = next;
        await this.prisma.dossier.update({ where: { id: opts.dossierId }, data: { payload } });
        return next;
    }
    /**
     * Liste les dossiers en attente de validation admin (backoffice).
     */
    async listPending(opts = {}) {
        const dossiers = await this.prisma.dossier.findMany({
            orderBy: { createdAt: "desc" },
            take: Math.min(opts.take ?? 50, 200),
            select: {
                id: true, createdAt: true, title: true, commune: true,
                clientNom: true, clientEmail: true, clientTel: true, raisonSociale: true,
                porteType: true, payload: true,
            },
        });
        return dossiers
            .map(d => {
            const pv = d.payload?.packValidation;
            return { dossier: d, packValidation: pv ?? null };
        })
            .filter(x => x.packValidation?.status === "PENDING_ADMIN_VALIDATION");
    }
};
exports.PackValidationService = PackValidationService;
exports.PackValidationService = PackValidationService = PackValidationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PackValidationService);
