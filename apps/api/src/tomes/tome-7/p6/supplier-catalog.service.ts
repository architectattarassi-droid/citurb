import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";

/**
 * SupplierCatalogService — gestion du catalogue matériaux des fournisseurs P6.
 *
 * Doctrine P6: les fournisseurs (FOURNISSEUR_MATERIAUX) ont une fiche réactive
 * où ils déposent leurs matériaux avec prix, zones, délais. Les prix peuvent
 * être mis à jour par le prestataire lui-même.
 *
 * Stockage: Dossier.payload.supplierCatalog = CatalogItem[] (no schema migration).
 */

export type CatalogCategory =
  | "CIMENT_BETON"        // Ciment, mortier, béton préparé
  | "AGGLOMERES"          // Briques, parpaings, hourdis
  | "ACIER"               // Fer à béton, treillis, profils
  | "BOIS"                // Bois de coffrage, charpente, menuiserie
  | "ETANCHEITE"          // Bitume, EPDM, membranes
  | "ISOLATION"           // Laine, polystyrène, ouate
  | "PLOMBERIE"           // Tuyauterie, raccords, sanitaire
  | "ELECTRICITE"         // Câbles, gaines, appareillage
  | "CARRELAGE"           // Carreaux, faïence, mosaïque
  | "REVETEMENT_SOL"      // Parquet, vinyle, marbre, granit
  | "PEINTURE"            // Peintures, vernis, enduits
  | "MENUISERIE_ALU"      // Profils alu, baies, fenêtres
  | "MENUISERIE_BOIS"     // Portes, placards, parquet
  | "QUINCAILLERIE"       // Vis, chevilles, ferrures
  | "CHAUFFAGE_CLIM"      // Radiateurs, chaudières, splits
  | "AUTRE";

export type CatalogUnit = "M3" | "M2" | "ML" | "T" | "KG" | "SAC" | "UNITE" | "PALETTE";

export type CatalogItem = {
  id: string;
  materialName: string;
  materialCode?: string;
  categorie: CatalogCategory;
  unite: CatalogUnit;
  // Prix
  prixFournitureDH: number;
  prixMainOeuvreDH?: number; // optionnel (cas pose incluse)
  prixLivraisonDH: number;   // 0 = gratuit ou inclus
  livraisonIncluse: boolean;
  minLivraisonDH?: number;   // commande minimum pour livraison
  // Logistique
  delaiLivraisonHeures?: number;
  quantiteDisponibleMax?: number;
  zonesFourniture: string[]; // communes / villes desservies
  // Méta
  description?: string;
  fichesTechniqueUrls?: string[];
  certifications?: string[]; // ex: ["ISO 9001", "NM 10.1.005"]
  active: boolean;            // false = retiré du catalogue mais conservé en historique
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
};

export type CatalogItemInput = Omit<CatalogItem, "id" | "createdAt" | "updatedAt" | "updatedBy" | "active"> & {
  active?: boolean;
};

@Injectable()
export class SupplierCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liste le catalogue d'un fournisseur (public si actif, ou propre fiche si owner).
   */
  async list(opts: { dossierId: string; activeOnly?: boolean; search?: string; zone?: string; categorie?: CatalogCategory }) {
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: opts.dossierId },
      select: { id: true, payload: true, raisonSociale: true, clientNom: true, ownerId: true },
    });
    if (!dossier) throw new NotFoundException("Fournisseur introuvable");
    const items: CatalogItem[] = ((dossier.payload as any)?.supplierCatalog) ?? [];
    let filtered = items;
    if (opts.activeOnly) filtered = filtered.filter(i => i.active);
    if (opts.categorie) filtered = filtered.filter(i => i.categorie === opts.categorie);
    if (opts.zone) {
      const z = opts.zone.toLowerCase();
      filtered = filtered.filter(i => (i.zonesFourniture ?? []).some(zone => zone.toLowerCase().includes(z)));
    }
    if (opts.search) {
      const s = opts.search.toLowerCase();
      filtered = filtered.filter(i =>
        i.materialName.toLowerCase().includes(s) ||
        (i.materialCode ?? "").toLowerCase().includes(s) ||
        (i.description ?? "").toLowerCase().includes(s)
      );
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
  async create(opts: { dossierId: string; input: CatalogItemInput; userId?: string; userEmail?: string; isAdmin?: boolean }) {
    const dossier = await this.assertOwnerOrAdmin(opts.dossierId, opts.userId, opts.isAdmin);
    const payload: any = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
    const items: CatalogItem[] = Array.isArray(payload.supplierCatalog) ? payload.supplierCatalog : [];
    const now = new Date().toISOString();

    const newItem: CatalogItem = {
      ...opts.input,
      id: randomUUID(),
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
  async update(opts: { dossierId: string; itemId: string; patch: Partial<CatalogItemInput>; userId?: string; userEmail?: string; isAdmin?: boolean }) {
    const dossier = await this.assertOwnerOrAdmin(opts.dossierId, opts.userId, opts.isAdmin);
    const payload: any = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
    const items: CatalogItem[] = Array.isArray(payload.supplierCatalog) ? payload.supplierCatalog : [];
    const idx = items.findIndex(i => i.id === opts.itemId);
    if (idx < 0) throw new NotFoundException("Item de catalogue introuvable");

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
  async deactivate(opts: { dossierId: string; itemId: string; userId?: string; userEmail?: string; isAdmin?: boolean }) {
    return this.update({ ...opts, patch: { active: false } });
  }

  /**
   * Hard-delete admin uniquement.
   */
  async hardDelete(opts: { dossierId: string; itemId: string; userId?: string; isAdmin: boolean }) {
    if (!opts.isAdmin) throw new ForbiddenException("Hard-delete réservé aux admins");
    const dossier = await this.assertOwnerOrAdmin(opts.dossierId, opts.userId, true);
    const payload: any = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
    const items: CatalogItem[] = Array.isArray(payload.supplierCatalog) ? payload.supplierCatalog : [];
    const filtered = items.filter(i => i.id !== opts.itemId);
    if (filtered.length === items.length) throw new NotFoundException("Item introuvable");
    payload.supplierCatalog = filtered;
    await this.prisma.dossier.update({ where: { id: opts.dossierId }, data: { payload } });
    return { ok: true, removed: opts.itemId };
  }

  /**
   * Recherche cross-fournisseur (public): trouve les fournisseurs qui ont
   * tel matériau dans telle zone.
   */
  async searchCrossSuppliers(opts: { search?: string; zone?: string; categorie?: CatalogCategory; take?: number }) {
    const dossiers = await this.prisma.dossier.findMany({
      where: { porteType: "P6" },
      select: { id: true, raisonSociale: true, clientNom: true, commune: true, payload: true },
      take: 200,
    });
    const matches: Array<{ supplier: any; item: CatalogItem }> = [];
    for (const d of dossiers) {
      const brief: any = (d.payload as any)?.brief;
      if (brief?.p6Type !== "FOURNISSEUR_MATERIAUX") continue;
      const validation = (d.payload as any)?.packValidation?.status;
      const isPublic = validation === "ACTIVATED";
      if (!isPublic) continue;
      const items: CatalogItem[] = ((d.payload as any)?.supplierCatalog) ?? [];
      for (const item of items) {
        if (!item.active) continue;
        if (opts.categorie && item.categorie !== opts.categorie) continue;
        if (opts.zone) {
          const z = opts.zone.toLowerCase();
          if (!(item.zonesFourniture ?? []).some(zone => zone.toLowerCase().includes(z))) continue;
        }
        if (opts.search) {
          const s = opts.search.toLowerCase();
          const hay = `${item.materialName} ${item.materialCode ?? ""} ${item.description ?? ""}`.toLowerCase();
          if (!hay.includes(s)) continue;
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
  private async assertOwnerOrAdmin(dossierId: string, userId?: string, isAdmin?: boolean) {
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { id: true, payload: true, ownerId: true },
    });
    if (!dossier) throw new NotFoundException("Fournisseur introuvable");
    if (!isAdmin && dossier.ownerId !== userId) {
      throw new ForbiddenException("Accès réservé au propriétaire de la fiche ou aux admins");
    }
    return dossier;
  }
}
