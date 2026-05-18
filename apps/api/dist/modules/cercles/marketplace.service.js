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
exports.MarketplaceService = exports.CORPS_METIER = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
/**
 * MarketplaceService — Marketplace BTP (modèle référentiel + offres).
 *
 * MarketProduct = catalogue maître pré-chargé, organisé par corps de métier.
 * SupplierOffer = offre d'un fournisseur sur un produit du référentiel.
 *
 * Règle : tant que le fournisseur n'a pas signé de contrat
 * (ProProfile.supplierContractSignedAt = null), son identité est masquée
 * dans les offres affichées aux acheteurs.
 */
exports.CORPS_METIER = [
    { code: "GROS_OEUVRE", label: "Gros œuvre" },
    { code: "PLOMBERIE", label: "Plomberie & sanitaire" },
    { code: "ELECTRICITE", label: "Électricité" },
    { code: "ETANCHEITE", label: "Étanchéité" },
    { code: "ISOLATION", label: "Isolation" },
    { code: "MENUISERIE", label: "Menuiserie (alu / bois / PVC)" },
    { code: "REVETEMENT", label: "Revêtements & carrelage" },
    { code: "MARBRERIE", label: "Marbrerie & pierre" },
    { code: "PEINTURE", label: "Peinture & enduits" },
    { code: "CHAUFFAGE_CLIM", label: "Chauffage & climatisation" },
    { code: "VRD", label: "VRD & aménagements extérieurs" },
    { code: "QUINCAILLERIE", label: "Quincaillerie & outillage" },
];
const CORPS_CODES = exports.CORPS_METIER.map(c => c.code);
const UNITS = ["M3", "M2", "ML", "T", "KG", "SAC", "UNITE", "PALETTE", "ROULEAU", "BARRE"];
let MarketplaceService = class MarketplaceService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    static CORPS_METIER = exports.CORPS_METIER;
    static UNITS = UNITS;
    /** Arborescence de navigation : corps de métier → familles + compteurs. */
    async taxonomy() {
        const rows = await this.prisma.marketProduct.groupBy({
            by: ["corpsMetier", "famille"],
            where: { active: true },
            _count: { _all: true },
        });
        const byCorps = {};
        let total = 0;
        for (const r of rows) {
            (byCorps[r.corpsMetier] ||= []).push({ famille: r.famille, count: r._count._all });
            total += r._count._all;
        }
        return {
            total,
            corpsMetier: exports.CORPS_METIER.map(c => ({
                code: c.code,
                label: c.label,
                familles: (byCorps[c.code] || []).sort((a, b) => a.famille.localeCompare(b.famille)),
                count: (byCorps[c.code] || []).reduce((s, f) => s + f.count, 0),
            })),
        };
    }
    /** Liste paginée du référentiel, filtrable par corps de métier / famille / recherche. */
    async browse(opts) {
        const page = Math.max(1, opts.page ?? 1);
        const pageSize = 60;
        const where = { active: true };
        if (opts.corpsMetier && CORPS_CODES.includes(opts.corpsMetier))
            where.corpsMetier = opts.corpsMetier;
        if (opts.famille)
            where.famille = opts.famille;
        if (opts.q && opts.q.trim()) {
            const q = opts.q.trim();
            where.OR = [
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
            ];
        }
        const [rows, total] = await Promise.all([
            this.prisma.marketProduct.findMany({
                where,
                orderBy: [{ corpsMetier: "asc" }, { famille: "asc" }, { name: "asc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: { _count: { select: { offers: { where: { active: true } } } } },
            }),
            this.prisma.marketProduct.count({ where }),
        ]);
        return { data: rows, meta: { page, pageSize, total } };
    }
    /** Fiche d'un produit du référentiel + ses offres (fournisseurs masqués si non contractés). */
    async productDetail(id) {
        const product = await this.prisma.marketProduct.findUnique({
            where: { id },
            include: {
                offers: {
                    where: { active: true },
                    orderBy: { priceDH: "asc" },
                    include: {
                        supplier: {
                            select: {
                                id: true, username: true,
                                proProfile: {
                                    select: {
                                        displayName: true, avatarUrl: true, villePrincipale: true,
                                        isVerified: true, supplierContractSignedAt: true, supplierCitCode: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!product)
            throw new common_1.NotFoundException("Produit introuvable");
        return { ...product, offers: product.offers.map(o => this.maskOffer(o, product.citCode)) };
    }
    /** Génère / récupère le code fournisseur CITURBAREA (CIT-FRN-00001). */
    async ensureSupplierCode(supplierId) {
        const profile = await this.prisma.proProfile.findUnique({
            where: { userId: supplierId },
            select: { supplierCitCode: true },
        });
        if (profile?.supplierCitCode)
            return profile.supplierCitCode;
        const last = await this.prisma.proProfile.findFirst({
            where: { supplierCitCode: { not: null } },
            orderBy: { supplierCitCode: "desc" },
            select: { supplierCitCode: true },
        });
        let next = 1;
        if (last?.supplierCitCode) {
            const m = last.supplierCitCode.match(/(\d+)$/);
            if (m)
                next = parseInt(m[1], 10) + 1;
        }
        const code = `CIT-FRN-${String(next).padStart(5, "0")}`;
        await this.prisma.proProfile.upsert({
            where: { userId: supplierId },
            update: { supplierCitCode: code },
            create: { userId: supplierId, supplierCitCode: code, displayName: "Fournisseur", metier: "FOURNISSEUR_MATERIAUX" },
        });
        return code;
    }
    /** Masque l'identité du fournisseur tant que son contrat n'est pas signé. */
    maskOffer(offer, materialCitCode) {
        const contracted = !!offer.supplier?.proProfile?.supplierContractSignedAt;
        const supplierCitCode = offer.supplier?.proProfile?.supplierCitCode || null;
        return {
            id: offer.id,
            priceDH: offer.priceDH,
            quantityAvailable: offer.quantityAvailable,
            minOrder: offer.minOrder,
            showroomCity: offer.showroomCity,
            deliveryZones: offer.deliveryZones,
            deliveryDelayHours: offer.deliveryDelayHours,
            deliveryCostDH: offer.deliveryCostDH,
            deliveryIncluded: offer.deliveryIncluded,
            contracted,
            // Référence de l'offre = combo code matériau · code fournisseur (anonyme)
            supplierCitCode,
            offerRef: materialCitCode && supplierCitCode ? `${materialCitCode} · ${supplierCitCode}` : null,
            supplier: contracted
                ? {
                    id: offer.supplier.id,
                    displayName: offer.supplier.proProfile?.displayName || offer.supplier.username || "Fournisseur",
                    villePrincipale: offer.supplier.proProfile?.villePrincipale || null,
                    isVerified: !!offer.supplier.proProfile?.isVerified,
                }
                : {
                    // Identité masquée — contrat non signé
                    id: null,
                    displayName: "Fournisseur partenaire",
                    villePrincipale: offer.supplier?.proProfile?.villePrincipale || null,
                    isVerified: false,
                },
        };
    }
    // ── Offres du fournisseur connecté ────────────────────────────
    normalizeOffer(input, isCreate) {
        const data = {};
        if (input.priceDH !== undefined)
            data.priceDH = Number(input.priceDH);
        if (input.quantityAvailable !== undefined)
            data.quantityAvailable = input.quantityAvailable != null ? Number(input.quantityAvailable) : null;
        if (input.minOrder !== undefined)
            data.minOrder = input.minOrder != null ? Number(input.minOrder) : null;
        if (input.showroomCity !== undefined)
            data.showroomCity = input.showroomCity?.trim() || null;
        if (input.deliveryZones !== undefined)
            data.deliveryZones = Array.isArray(input.deliveryZones) ? input.deliveryZones : [];
        if (input.deliveryDelayHours !== undefined)
            data.deliveryDelayHours = input.deliveryDelayHours != null ? Number(input.deliveryDelayHours) : null;
        if (input.deliveryCostDH !== undefined)
            data.deliveryCostDH = input.deliveryCostDH != null ? Number(input.deliveryCostDH) : null;
        if (input.deliveryIncluded !== undefined)
            data.deliveryIncluded = !!input.deliveryIncluded;
        if (input.active !== undefined)
            data.active = !!input.active;
        if (isCreate && (data.priceDH == null || isNaN(data.priceDH) || data.priceDH <= 0)) {
            throw new common_1.BadRequestException("Prix valide requis");
        }
        return data;
    }
    async myOffers(supplierId) {
        const [offers, profile] = await Promise.all([
            this.prisma.supplierOffer.findMany({
                where: { supplierId },
                orderBy: { createdAt: "desc" },
                include: {
                    marketProduct: {
                        select: { id: true, citCode: true, name: true, corpsMetier: true, famille: true, unit: true, photo: true },
                    },
                },
            }),
            this.prisma.proProfile.findUnique({
                where: { userId: supplierId },
                select: { supplierCitCode: true, supplierContractSignedAt: true },
            }),
        ]);
        return {
            supplierCitCode: profile?.supplierCitCode || null,
            contracted: !!profile?.supplierContractSignedAt,
            offers,
        };
    }
    async createOffer(supplierId, input) {
        if (!input.marketProductId)
            throw new common_1.BadRequestException("Produit du référentiel requis");
        const product = await this.prisma.marketProduct.findUnique({ where: { id: input.marketProductId } });
        if (!product)
            throw new common_1.NotFoundException("Produit du référentiel introuvable");
        const existing = await this.prisma.supplierOffer.findUnique({
            where: { marketProductId_supplierId: { marketProductId: input.marketProductId, supplierId } },
        });
        if (existing)
            throw new common_1.BadRequestException("Vous avez déjà une offre sur ce produit — modifiez-la");
        // Attribue le code fournisseur CITURBAREA dès la 1re offre
        await this.ensureSupplierCode(supplierId);
        const data = this.normalizeOffer(input, true);
        return this.prisma.supplierOffer.create({
            data: { supplierId, marketProductId: input.marketProductId, ...data },
        });
    }
    async updateOffer(offerId, supplierId, input) {
        const o = await this.prisma.supplierOffer.findUnique({ where: { id: offerId } });
        if (!o)
            throw new common_1.NotFoundException("Offre introuvable");
        if (o.supplierId !== supplierId)
            throw new common_1.ForbiddenException("Cette offre n'est pas la vôtre");
        const data = this.normalizeOffer(input, false);
        return this.prisma.supplierOffer.update({ where: { id: offerId }, data });
    }
    async removeOffer(offerId, supplierId) {
        const o = await this.prisma.supplierOffer.findUnique({ where: { id: offerId } });
        if (!o)
            throw new common_1.NotFoundException("Offre introuvable");
        if (o.supplierId !== supplierId)
            throw new common_1.ForbiddenException("Cette offre n'est pas la vôtre");
        await this.prisma.supplierOffer.delete({ where: { id: offerId } });
        return { ok: true, deleted: offerId };
    }
    /** Recherche dans le référentiel pour aider le fournisseur à choisir un produit. */
    async searchReferentiel(q) {
        const term = (q || "").trim();
        if (!term)
            return [];
        return this.prisma.marketProduct.findMany({
            where: { active: true, name: { contains: term, mode: "insensitive" } },
            orderBy: { name: "asc" },
            take: 25,
            select: { id: true, name: true, corpsMetier: true, famille: true, unit: true },
        });
    }
};
exports.MarketplaceService = MarketplaceService;
exports.MarketplaceService = MarketplaceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MarketplaceService);
