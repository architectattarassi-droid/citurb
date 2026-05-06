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
exports.SupplierCatalogService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
let SupplierCatalogService = class SupplierCatalogService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Liste le catalogue d'un fournisseur (public si actif, ou propre fiche si owner).
     */
    async list(opts) {
        const dossier = await this.prisma.dossier.findUnique({
            where: { id: opts.dossierId },
            select: { id: true, payload: true, raisonSociale: true, clientNom: true, ownerId: true },
        });
        if (!dossier)
            throw new common_1.NotFoundException("Fournisseur introuvable");
        const items = (dossier.payload?.supplierCatalog) ?? [];
        let filtered = items;
        if (opts.activeOnly)
            filtered = filtered.filter(i => i.active);
        if (opts.categorie)
            filtered = filtered.filter(i => i.categorie === opts.categorie);
        if (opts.zone) {
            const z = opts.zone.toLowerCase();
            filtered = filtered.filter(i => (i.zonesFourniture ?? []).some(zone => zone.toLowerCase().includes(z)));
        }
        if (opts.search) {
            const s = opts.search.toLowerCase();
            filtered = filtered.filter(i => i.materialName.toLowerCase().includes(s) ||
                (i.materialCode ?? "").toLowerCase().includes(s) ||
                (i.description ?? "").toLowerCase().includes(s));
        }
        return {
            supplier: { id: dossier.id, raisonSociale: dossier.raisonSociale, clientNom: dossier.clientNom },
            items: filtered,
            total: items.length,
            activeCount: items.filter(i => i.active).length,
        };
    }
    /**
     * Création d'un nouvel item (par le supplier owner ou admin).
     */
    async create(opts) {
        const dossier = await this.assertOwnerOrAdmin(opts.dossierId, opts.userId, opts.isAdmin);
        const payload = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
        const items = Array.isArray(payload.supplierCatalog) ? payload.supplierCatalog : [];
        const now = new Date().toISOString();
        const newItem = {
            ...opts.input,
            id: (0, crypto_1.randomUUID)(),
            active: opts.input.active !== false,
            createdAt: now,
            updatedAt: now,
            updatedBy: opts.userEmail ?? opts.userId ?? "system",
            // Defaults
            livraisonIncluse: opts.input.livraisonIncluse ?? false,
            prixLivraisonDH: Number(opts.input.prixLivraisonDH ?? 0),
            prixFournitureDH: Number(opts.input.prixFournitureDH),
            zonesFourniture: opts.input.zonesFourniture ?? [],
        };
        items.push(newItem);
        payload.supplierCatalog = items;
        await this.prisma.dossier.update({ where: { id: opts.dossierId }, data: { payload } });
        return newItem;
    }
    /**
     * Update item (par le supplier owner ou admin).
     */
    async update(opts) {
        const dossier = await this.assertOwnerOrAdmin(opts.dossierId, opts.userId, opts.isAdmin);
        const payload = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
        const items = Array.isArray(payload.supplierCatalog) ? payload.supplierCatalog : [];
        const idx = items.findIndex(i => i.id === opts.itemId);
        if (idx < 0)
            throw new common_1.NotFoundException("Item de catalogue introuvable");
        const now = new Date().toISOString();
        items[idx] = {
            ...items[idx],
            ...opts.patch,
            id: items[idx].id,
            createdAt: items[idx].createdAt,
            updatedAt: now,
            updatedBy: opts.userEmail ?? opts.userId ?? items[idx].updatedBy,
        };
        payload.supplierCatalog = items;
        await this.prisma.dossier.update({ where: { id: opts.dossierId }, data: { payload } });
        return items[idx];
    }
    /**
     * Soft-delete: passe active=false (conservé en historique).
     */
    async deactivate(opts) {
        return this.update({ ...opts, patch: { active: false } });
    }
    /**
     * Hard-delete admin uniquement.
     */
    async hardDelete(opts) {
        if (!opts.isAdmin)
            throw new common_1.ForbiddenException("Hard-delete réservé aux admins");
        const dossier = await this.assertOwnerOrAdmin(opts.dossierId, opts.userId, true);
        const payload = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
        const items = Array.isArray(payload.supplierCatalog) ? payload.supplierCatalog : [];
        const filtered = items.filter(i => i.id !== opts.itemId);
        if (filtered.length === items.length)
            throw new common_1.NotFoundException("Item introuvable");
        payload.supplierCatalog = filtered;
        await this.prisma.dossier.update({ where: { id: opts.dossierId }, data: { payload } });
        return { ok: true, removed: opts.itemId };
    }
    /**
     * Recherche cross-fournisseur (public): trouve les fournisseurs qui ont
     * tel matériau dans telle zone.
     */
    async searchCrossSuppliers(opts) {
        const dossiers = await this.prisma.dossier.findMany({
            where: { porteType: "P6" },
            select: { id: true, raisonSociale: true, clientNom: true, commune: true, payload: true },
            take: 200,
        });
        const matches = [];
        for (const d of dossiers) {
            const brief = d.payload?.brief;
            if (brief?.p6Type !== "FOURNISSEUR_MATERIAUX")
                continue;
            const validation = d.payload?.packValidation?.status;
            const isPublic = validation === "ACTIVATED";
            if (!isPublic)
                continue;
            const items = (d.payload?.supplierCatalog) ?? [];
            for (const item of items) {
                if (!item.active)
                    continue;
                if (opts.categorie && item.categorie !== opts.categorie)
                    continue;
                if (opts.zone) {
                    const z = opts.zone.toLowerCase();
                    if (!(item.zonesFourniture ?? []).some(zone => zone.toLowerCase().includes(z)))
                        continue;
                }
                if (opts.search) {
                    const s = opts.search.toLowerCase();
                    const hay = `${item.materialName} ${item.materialCode ?? ""} ${item.description ?? ""}`.toLowerCase();
                    if (!hay.includes(s))
                        continue;
                }
                matches.push({
                    supplier: { id: d.id, raisonSociale: d.raisonSociale, clientNom: d.clientNom, commune: d.commune },
                    item,
                });
            }
        }
        matches.sort((a, b) => a.item.prixFournitureDH - b.item.prixFournitureDH);
        return { ok: true, results: matches.slice(0, opts.take ?? 50), totalMatches: matches.length };
    }
    // ── Helpers ──────────────────────────────────────────────────────────
    async assertOwnerOrAdmin(dossierId, userId, isAdmin) {
        const dossier = await this.prisma.dossier.findUnique({
            where: { id: dossierId },
            select: { id: true, payload: true, ownerId: true },
        });
        if (!dossier)
            throw new common_1.NotFoundException("Fournisseur introuvable");
        if (!isAdmin && dossier.ownerId !== userId) {
            throw new common_1.ForbiddenException("Accès réservé au propriétaire de la fiche ou aux admins");
        }
        return dossier;
    }
};
exports.SupplierCatalogService = SupplierCatalogService;
exports.SupplierCatalogService = SupplierCatalogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SupplierCatalogService);
