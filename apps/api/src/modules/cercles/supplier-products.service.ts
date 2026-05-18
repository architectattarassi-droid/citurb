import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";

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

export type SupplierProductInput = {
  name?: string;
  category?: string;
  reference?: string;
  description?: string;
  photos?: string[];
  priceDH?: number;
  unit?: string;
  quantityAvailable?: number;
  minOrder?: number;
  showroomAddress?: string;
  showroomCity?: string;
  deliveryZones?: string[];
  deliveryDelayHours?: number;
  deliveryCostDH?: number;
  deliveryIncluded?: boolean;
  active?: boolean;
};

@Injectable()
export class SupplierProductsService {
  constructor(private readonly prisma: PrismaService) {}

  static readonly CATEGORIES = CATEGORIES;
  static readonly UNITS = UNITS;

  private normalize(input: SupplierProductInput, isCreate: boolean) {
    const data: any = {};
    if (input.name !== undefined) data.name = String(input.name).trim();
    if (input.category !== undefined) {
      data.category = CATEGORIES.includes(input.category) ? input.category : "AUTRE";
    }
    if (input.reference !== undefined) data.reference = input.reference?.trim() || null;
    if (input.description !== undefined) data.description = input.description?.trim() || null;
    if (input.photos !== undefined) data.photos = Array.isArray(input.photos) ? input.photos.slice(0, 12) : [];
    if (input.priceDH !== undefined) data.priceDH = input.priceDH != null ? Number(input.priceDH) : null;
    if (input.unit !== undefined) data.unit = UNITS.includes(input.unit) ? input.unit : "UNITE";
    if (input.quantityAvailable !== undefined) data.quantityAvailable = input.quantityAvailable != null ? Number(input.quantityAvailable) : null;
    if (input.minOrder !== undefined) data.minOrder = input.minOrder != null ? Number(input.minOrder) : null;
    if (input.showroomAddress !== undefined) data.showroomAddress = input.showroomAddress?.trim() || null;
    if (input.showroomCity !== undefined) data.showroomCity = input.showroomCity?.trim() || null;
    if (input.deliveryZones !== undefined) data.deliveryZones = Array.isArray(input.deliveryZones) ? input.deliveryZones : [];
    if (input.deliveryDelayHours !== undefined) data.deliveryDelayHours = input.deliveryDelayHours != null ? Number(input.deliveryDelayHours) : null;
    if (input.deliveryCostDH !== undefined) data.deliveryCostDH = input.deliveryCostDH != null ? Number(input.deliveryCostDH) : null;
    if (input.deliveryIncluded !== undefined) data.deliveryIncluded = !!input.deliveryIncluded;
    if (input.active !== undefined) data.active = !!input.active;

    if (isCreate) {
      if (!data.name) throw new BadRequestException("Nom du produit requis");
      if (!data.category) data.category = "AUTRE";
      if (!data.unit) data.unit = "UNITE";
    }
    return data;
  }

  async create(supplierId: string, input: SupplierProductInput) {
    const data = this.normalize(input, true);
    return this.prisma.supplierProduct.create({ data: { supplierId, ...data } });
  }

  async update(productId: string, supplierId: string, input: SupplierProductInput) {
    const p = await this.prisma.supplierProduct.findUnique({ where: { id: productId } });
    if (!p) throw new NotFoundException("Produit introuvable");
    if (p.supplierId !== supplierId) throw new ForbiddenException("Ce produit n'est pas le vôtre");
    const data = this.normalize(input, false);
    return this.prisma.supplierProduct.update({ where: { id: productId }, data });
  }

  async remove(productId: string, supplierId: string) {
    const p = await this.prisma.supplierProduct.findUnique({ where: { id: productId } });
    if (!p) throw new NotFoundException("Produit introuvable");
    if (p.supplierId !== supplierId) throw new ForbiddenException("Ce produit n'est pas le vôtre");
    await this.prisma.supplierProduct.delete({ where: { id: productId } });
    return { ok: true, deleted: productId };
  }

  /** Tous les produits du fournisseur connecté (actifs + inactifs). */
  async myProducts(supplierId: string) {
    return this.prisma.supplierProduct.findMany({
      where: { supplierId },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Vitrine publique d'un fournisseur : ses infos + produits actifs. */
  async storefront(supplierId: string) {
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
    if (!supplier) throw new NotFoundException("Fournisseur introuvable");
    const products = await this.prisma.supplierProduct.findMany({
      where: { supplierId, active: true },
      orderBy: { createdAt: "desc" },
    });
    return { supplier, products };
  }

  /** Détail public d'un produit. */
  async detail(productId: string) {
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
    if (!product) throw new NotFoundException("Produit introuvable");
    return product;
  }

  /** Recherche marketplace transversale (publique). */
  async browse(opts: { q?: string; category?: string; region?: string; page?: number }) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = 48;
    const where: any = { active: true };
    if (opts.category && CATEGORIES.includes(opts.category)) where.category = opts.category;
    if (opts.region) where.deliveryZones = { has: opts.region };
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
}
