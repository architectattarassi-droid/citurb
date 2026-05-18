import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";

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

export const CORPS_METIER: { code: string; label: string }[] = [
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
const CORPS_CODES = CORPS_METIER.map(c => c.code);
const UNITS = ["M3", "M2", "ML", "T", "KG", "SAC", "UNITE", "PALETTE", "ROULEAU", "BARRE"];

export type OfferInput = {
  marketProductId?: string;
  priceDH?: number;
  quantityAvailable?: number;
  minOrder?: number;
  showroomCity?: string;
  deliveryZones?: string[];
  deliveryDelayHours?: number;
  deliveryCostDH?: number;
  deliveryIncluded?: boolean;
  active?: boolean;
};

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  static readonly CORPS_METIER = CORPS_METIER;
  static readonly UNITS = UNITS;

  /** Arborescence de navigation : corps de métier → familles + compteurs. */
  async taxonomy() {
    const rows = await this.prisma.marketProduct.groupBy({
      by: ["corpsMetier", "famille"],
      where: { active: true },
      _count: { _all: true },
    });
    const byCorps: Record<string, { famille: string; count: number }[]> = {};
    let total = 0;
    for (const r of rows) {
      (byCorps[r.corpsMetier] ||= []).push({ famille: r.famille, count: r._count._all });
      total += r._count._all;
    }
    return {
      total,
      corpsMetier: CORPS_METIER.map(c => ({
        code: c.code,
        label: c.label,
        familles: (byCorps[c.code] || []).sort((a, b) => a.famille.localeCompare(b.famille)),
        count: (byCorps[c.code] || []).reduce((s, f) => s + f.count, 0),
      })),
    };
  }

  /** Liste paginée du référentiel, filtrable par corps de métier / famille / recherche. */
  async browse(opts: { corpsMetier?: string; famille?: string; q?: string; page?: number }) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = 60;
    const where: any = { active: true };
    if (opts.corpsMetier && CORPS_CODES.includes(opts.corpsMetier)) where.corpsMetier = opts.corpsMetier;
    if (opts.famille) where.famille = opts.famille;
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
  async productDetail(id: string) {
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
                    isVerified: true, supplierContractSignedAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!product) throw new NotFoundException("Produit introuvable");
    return { ...product, offers: product.offers.map(o => this.maskOffer(o)) };
  }

  /** Masque l'identité du fournisseur tant que son contrat n'est pas signé. */
  private maskOffer(offer: any) {
    const contracted = !!offer.supplier?.proProfile?.supplierContractSignedAt;
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

  private normalizeOffer(input: OfferInput, isCreate: boolean) {
    const data: any = {};
    if (input.priceDH !== undefined) data.priceDH = Number(input.priceDH);
    if (input.quantityAvailable !== undefined) data.quantityAvailable = input.quantityAvailable != null ? Number(input.quantityAvailable) : null;
    if (input.minOrder !== undefined) data.minOrder = input.minOrder != null ? Number(input.minOrder) : null;
    if (input.showroomCity !== undefined) data.showroomCity = input.showroomCity?.trim() || null;
    if (input.deliveryZones !== undefined) data.deliveryZones = Array.isArray(input.deliveryZones) ? input.deliveryZones : [];
    if (input.deliveryDelayHours !== undefined) data.deliveryDelayHours = input.deliveryDelayHours != null ? Number(input.deliveryDelayHours) : null;
    if (input.deliveryCostDH !== undefined) data.deliveryCostDH = input.deliveryCostDH != null ? Number(input.deliveryCostDH) : null;
    if (input.deliveryIncluded !== undefined) data.deliveryIncluded = !!input.deliveryIncluded;
    if (input.active !== undefined) data.active = !!input.active;
    if (isCreate && (data.priceDH == null || isNaN(data.priceDH) || data.priceDH <= 0)) {
      throw new BadRequestException("Prix valide requis");
    }
    return data;
  }

  async myOffers(supplierId: string) {
    return this.prisma.supplierOffer.findMany({
      where: { supplierId },
      orderBy: { createdAt: "desc" },
      include: { marketProduct: { select: { id: true, name: true, corpsMetier: true, famille: true, unit: true, photo: true } } },
    });
  }

  async createOffer(supplierId: string, input: OfferInput) {
    if (!input.marketProductId) throw new BadRequestException("Produit du référentiel requis");
    const product = await this.prisma.marketProduct.findUnique({ where: { id: input.marketProductId } });
    if (!product) throw new NotFoundException("Produit du référentiel introuvable");
    const existing = await this.prisma.supplierOffer.findUnique({
      where: { marketProductId_supplierId: { marketProductId: input.marketProductId, supplierId } },
    });
    if (existing) throw new BadRequestException("Vous avez déjà une offre sur ce produit — modifiez-la");
    const data = this.normalizeOffer(input, true);
    return this.prisma.supplierOffer.create({
      data: { supplierId, marketProductId: input.marketProductId, ...data },
    });
  }

  async updateOffer(offerId: string, supplierId: string, input: OfferInput) {
    const o = await this.prisma.supplierOffer.findUnique({ where: { id: offerId } });
    if (!o) throw new NotFoundException("Offre introuvable");
    if (o.supplierId !== supplierId) throw new ForbiddenException("Cette offre n'est pas la vôtre");
    const data = this.normalizeOffer(input, false);
    return this.prisma.supplierOffer.update({ where: { id: offerId }, data });
  }

  async removeOffer(offerId: string, supplierId: string) {
    const o = await this.prisma.supplierOffer.findUnique({ where: { id: offerId } });
    if (!o) throw new NotFoundException("Offre introuvable");
    if (o.supplierId !== supplierId) throw new ForbiddenException("Cette offre n'est pas la vôtre");
    await this.prisma.supplierOffer.delete({ where: { id: offerId } });
    return { ok: true, deleted: offerId };
  }

  /** Recherche dans le référentiel pour aider le fournisseur à choisir un produit. */
  async searchReferentiel(q: string) {
    const term = (q || "").trim();
    if (!term) return [];
    return this.prisma.marketProduct.findMany({
      where: { active: true, name: { contains: term, mode: "insensitive" } },
      orderBy: { name: "asc" },
      take: 25,
      select: { id: true, name: true, corpsMetier: true, famille: true, unit: true },
    });
  }
}
