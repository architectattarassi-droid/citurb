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
exports.SupplierProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
/**
 * SupplierProductsService — Marketplace BTP Phase 1.
 *
 * Vitrine fournisseur : chaque produit appartient à un User (le fournisseur).
 * - Browse / storefront / détail = public (SEO, découverte)
 * - Créer / modifier / supprimer = le fournisseur propriétaire uniquement
 */
const CATEGORIES = [
    "CIMENT_BETON", "AGGLOMERES", "ACIER", "BOIS", "ETANCHEITE", "ISOLATION",
    "PLOMBERIE", "ELECTRICITE", "CARRELAGE", "REVETEMENT_SOL", "PEINTURE",
    "MENUISERIE_ALU", "MENUISERIE_BOIS", "QUINCAILLERIE", "CHAUFFAGE_CLIM", "AUTRE",
];
const UNITS = ["M3", "M2", "ML", "T", "KG", "SAC", "UNITE", "PALETTE"];
let SupplierProductsService = class SupplierProductsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    static CATEGORIES = CATEGORIES;
    static UNITS = UNITS;
    normalize(input, isCreate) {
        const data = {};
        if (input.name !== undefined)
            data.name = String(input.name).trim();
        if (input.category !== undefined) {
            data.category = CATEGORIES.includes(input.category) ? input.category : "AUTRE";
        }
        if (input.reference !== undefined)
            data.reference = input.reference?.trim() || null;
        if (input.description !== undefined)
            data.description = input.description?.trim() || null;
        if (input.photos !== undefined)
            data.photos = Array.isArray(input.photos) ? input.photos.slice(0, 12) : [];
        if (input.priceDH !== undefined)
            data.priceDH = input.priceDH != null ? Number(input.priceDH) : null;
        if (input.unit !== undefined)
            data.unit = UNITS.includes(input.unit) ? input.unit : "UNITE";
        if (input.quantityAvailable !== undefined)
            data.quantityAvailable = input.quantityAvailable != null ? Number(input.quantityAvailable) : null;
        if (input.minOrder !== undefined)
            data.minOrder = input.minOrder != null ? Number(input.minOrder) : null;
        if (input.showroomAddress !== undefined)
            data.showroomAddress = input.showroomAddress?.trim() || null;
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
        if (isCreate) {
            if (!data.name)
                throw new common_1.BadRequestException("Nom du produit requis");
            if (!data.category)
                data.category = "AUTRE";
            if (!data.unit)
                data.unit = "UNITE";
        }
        return data;
    }
    async create(supplierId, input) {
        const data = this.normalize(input, true);
        return this.prisma.supplierProduct.create({ data: { supplierId, ...data } });
    }
    async update(productId, supplierId, input) {
        const p = await this.prisma.supplierProduct.findUnique({ where: { id: productId } });
        if (!p)
            throw new common_1.NotFoundException("Produit introuvable");
        if (p.supplierId !== supplierId)
            throw new common_1.ForbiddenException("Ce produit n'est pas le vôtre");
        const data = this.normalize(input, false);
        return this.prisma.supplierProduct.update({ where: { id: productId }, data });
    }
    async remove(productId, supplierId) {
        const p = await this.prisma.supplierProduct.findUnique({ where: { id: productId } });
        if (!p)
            throw new common_1.NotFoundException("Produit introuvable");
        if (p.supplierId !== supplierId)
            throw new common_1.ForbiddenException("Ce produit n'est pas le vôtre");
        await this.prisma.supplierProduct.delete({ where: { id: productId } });
        return { ok: true, deleted: productId };
    }
    /** Tous les produits du fournisseur connecté (actifs + inactifs). */
    async myProducts(supplierId) {
        return this.prisma.supplierProduct.findMany({
            where: { supplierId },
            orderBy: { createdAt: "desc" },
        });
    }
    /** Vitrine publique d'un fournisseur : ses infos + produits actifs. */
    async storefront(supplierId) {
        const supplier = await this.prisma.user.findUnique({
            where: { id: supplierId },
            select: {
                id: true, username: true, email: true,
                proProfile: {
                    select: {
                        displayName: true, avatarUrl: true, coverUrl: true, metier: true,
                        cabinetName: true, villePrincipale: true, bio: true, isVerified: true,
                        phonePublic: true, emailPublic: true, websiteUrl: true,
                    },
                },
            },
        });
        if (!supplier)
            throw new common_1.NotFoundException("Fournisseur introuvable");
        const products = await this.prisma.supplierProduct.findMany({
            where: { supplierId, active: true },
            orderBy: { createdAt: "desc" },
        });
        return { supplier, products };
    }
    /** Détail public d'un produit. */
    async detail(productId) {
        const product = await this.prisma.supplierProduct.findUnique({
            where: { id: productId },
            include: {
                supplier: {
                    select: {
                        id: true, username: true, email: true,
                        proProfile: { select: { displayName: true, avatarUrl: true, villePrincipale: true, isVerified: true, phonePublic: true } },
                    },
                },
            },
        });
        if (!product)
            throw new common_1.NotFoundException("Produit introuvable");
        return product;
    }
    /** Recherche marketplace transversale (publique). */
    async browse(opts) {
        const page = Math.max(1, opts.page ?? 1);
        const pageSize = 48;
        const where = { active: true };
        if (opts.category && CATEGORIES.includes(opts.category))
            where.category = opts.category;
        if (opts.region)
            where.deliveryZones = { has: opts.region };
        if (opts.q && opts.q.trim()) {
            const q = opts.q.trim();
            where.OR = [
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { reference: { contains: q, mode: "insensitive" } },
            ];
        }
        const [data, total] = await Promise.all([
            this.prisma.supplierProduct.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    supplier: {
                        select: {
                            id: true, username: true,
                            proProfile: { select: { displayName: true, avatarUrl: true, villePrincipale: true, isVerified: true } },
                        },
                    },
                },
            }),
            this.prisma.supplierProduct.count({ where }),
        ]);
        return { data, meta: { page, pageSize, total } };
    }
};
exports.SupplierProductsService = SupplierProductsService;
exports.SupplierProductsService = SupplierProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SupplierProductsService);
