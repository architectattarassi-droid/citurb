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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
/**
 * AdsService — Régie publicitaire native "promo fournisseurs matériaux".
 *
 * Un fournisseur booste une de ses SupplierOffer, ciblée sur un lot de finition
 * (REV/PEI/ALU/FAC/BOI/PLO). Après modération admin (ACTIVE), l'offre s'affiche
 * comme carte "Sponsorisé" dans le devis client, au bon contexte (ex. REV → carrelage).
 * Impressions & clics comptés sur l'offre. Aucun réseau pub tiers.
 */
const FINITION_LOTS = ["REV", "PEI", "ALU", "FAC", "BOI", "PLO"];
let AdsService = class AdsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /** Promos ACTIVE groupées par lot → cartes sponsorisées (public, contexte devis). */
    async materials(lots) {
        const valid = lots.filter((l) => FINITION_LOTS.includes(l));
        const byLot = {};
        if (!valid.length)
            return byLot;
        const offers = await this.prisma.supplierOffer.findMany({
            where: {
                active: true,
                promoStatus: "ACTIVE",
                promoLot: { in: valid },
                OR: [{ promoUntil: null }, { promoUntil: { gt: new Date() } }],
            },
            include: {
                marketProduct: { select: { name: true, photo: true, unit: true, famille: true } },
                supplier: { select: { username: true, email: true } },
            },
            take: 24,
            orderBy: { promoClicks: "asc" }, // rotation douce
        });
        const ids = offers.map((o) => o.id);
        if (ids.length) {
            this.prisma.supplierOffer
                .updateMany({ where: { id: { in: ids } }, data: { promoImpressions: { increment: 1 } } })
                .catch(() => { });
        }
        for (const o of offers) {
            const lot = o.promoLot;
            (byLot[lot] ??= []);
            if (byLot[lot].length >= 4)
                continue;
            byLot[lot].push({
                offerId: o.id,
                productId: o.marketProductId,
                lot,
                name: o.marketProduct?.name,
                photo: o.marketProduct?.photo || null,
                unit: o.marketProduct?.unit,
                famille: o.marketProduct?.famille,
                priceDH: o.priceDH,
                city: o.showroomCity || null,
                deliveryZones: o.deliveryZones || [],
                supplier: o.supplier?.username || o.supplier?.email?.split("@")[0] || "Fournisseur",
            });
        }
        return byLot;
    }
    async click(offerId) {
        await this.prisma.supplierOffer
            .updateMany({ where: { id: offerId }, data: { promoClicks: { increment: 1 } } })
            .catch(() => { });
        return { ok: true };
    }
    /** Fournisseur : demande une mise en avant sur une de ses offres. */
    async requestPromo(userId, offerId, lot) {
        if (!FINITION_LOTS.includes(lot))
            return { ok: false, message: "Lot de finition invalide." };
        const offer = await this.prisma.supplierOffer.findFirst({ where: { id: offerId, supplierId: userId } });
        if (!offer)
            return { ok: false, message: "Offre introuvable ou non autorisée." };
        await this.prisma.supplierOffer.update({ where: { id: offerId }, data: { promoStatus: "PENDING", promoLot: lot } });
        return { ok: true, status: "PENDING" };
    }
    async myPromos(userId) {
        const offers = await this.prisma.supplierOffer.findMany({
            where: { supplierId: userId, promoStatus: { not: "NONE" } },
            include: { marketProduct: { select: { name: true, photo: true } } },
            orderBy: { updatedAt: "desc" },
        });
        return offers.map((o) => ({
            offerId: o.id, name: o.marketProduct?.name, photo: o.marketProduct?.photo,
            lot: o.promoLot, status: o.promoStatus, until: o.promoUntil,
            impressions: o.promoImpressions, clicks: o.promoClicks,
        }));
    }
    /** Admin : promos à modérer + actives. */
    async adminList() {
        const offers = await this.prisma.supplierOffer.findMany({
            where: { promoStatus: { in: ["PENDING", "ACTIVE", "PAUSED"] } },
            include: {
                marketProduct: { select: { name: true, photo: true, famille: true } },
                supplier: { select: { username: true, email: true } },
            },
            orderBy: [{ promoStatus: "asc" }, { updatedAt: "desc" }],
            take: 200,
        });
        return offers.map((o) => ({
            offerId: o.id, name: o.marketProduct?.name, photo: o.marketProduct?.photo, famille: o.marketProduct?.famille,
            supplier: o.supplier?.username || o.supplier?.email, priceDH: o.priceDH, city: o.showroomCity,
            lot: o.promoLot, status: o.promoStatus, until: o.promoUntil,
            impressions: o.promoImpressions, clicks: o.promoClicks,
        }));
    }
    async adminUpdate(offerId, action, days) {
        const data = {};
        if (action === "activate" || action === "resume") {
            data.promoStatus = "ACTIVE";
            if (action === "activate")
                data.promoUntil = new Date(Date.now() + (days && days > 0 ? days : 30) * 86400000);
        }
        else if (action === "pause") {
            data.promoStatus = "PAUSED";
        }
        else if (action === "reject") {
            data.promoStatus = "REJECTED";
        }
        else {
            return { ok: false, message: "Action inconnue." };
        }
        await this.prisma.supplierOffer.update({ where: { id: offerId }, data });
        return { ok: true, status: data.promoStatus };
    }
};
exports.AdsService = AdsService;
exports.AdsService = AdsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdsService);
