import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs/promises";
import * as path from "path";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";

/**
 * CpsMarketplaceService — pont CPS ↔ marketplace.
 *
 * À partir d'un poste de bordereau CPS (désignation + famille + unité), retrouve :
 *   - des matériaux du **catalogue CITURBAREA** (prix de référence par région) ;
 *   - des **produits de la marketplace Cercles** (MarketProduct + offres
 *     fournisseurs SupplierOffer), commandables si l'offre est sous contrat.
 *
 * Sert à : faire sortir produits + prix « suivant CPS », rechercher des
 * similaires, et pré-remplir une commande livraisons depuis une offre.
 *
 * Sources lues directement (zéro couplage de modules) : fichiers
 * `data/materials/` + Prisma (MarketProduct/SupplierOffer).
 */

const DEFAULT_REGION = "06_CASABLANCA_SETTAT";

const STOPWORDS = new Set([
  "de", "des", "du", "le", "la", "les", "un", "une", "et", "ou", "en", "au", "aux",
  "sur", "sous", "pour", "avec", "par", "selon", "type", "y", "compris", "comprise",
  "comprises", "inclus", "incluse", "ml", "ms", "the", "and", "of", "to", "for", "with",
  "fourniture", "pose", "posee", "posees", "fournie", "fourni", "mise", "oeuvre",
]);
const UNIT_TOKENS = new Set(["m2", "m3", "ml", "kg", "t", "u", "ens", "ff", "forfait", "ms"]);

// CPS famille → catégories catalogue à privilégier (boost de pertinence).
const FAMILLE_TO_CATEGORIES: Record<string, string[]> = {
  GROS_OEUVRE: ["ciment", "acier", "granulats", "beton", "maconnerie", "enduits"],
  CLOS_COUVERT: ["etancheite", "menuiserie_alu", "acier"],
  SECOND_OEUVRE: ["maconnerie", "enduits", "peinture", "menuiserie_bois", "revetement"],
  TECHNIQUE_CES: ["sanitaire", "electrique"],
  VRD: ["granulats", "beton", "acier"],
  GENERALITES: [],
  SPECIAL: [],
};
// CPS famille → corpsMetier marketplace (filtre optionnel).
const FAMILLE_TO_CORPS: Record<string, string | null> = {
  GROS_OEUVRE: "GROS_OEUVRE",
  TECHNIQUE_CES: null, // plomberie OU électricité — on ne filtre pas
  CLOS_COUVERT: null,
  SECOND_OEUVRE: null,
  VRD: null,
  GENERALITES: null,
  SPECIAL: null,
};

type CatalogProduct = {
  code: string;
  category?: string;
  label?: string;
  labelAr?: string;
  description?: string;
  unit?: string;
  marquesCourantes?: string[];
};
type PricesFile = {
  regionFactors?: Record<string, number>;
  baselinePrices?: Record<string, { prixMin?: number; prixMoyen?: number; prixMax?: number }>;
};

export type CpsMatch = {
  source: "CATALOGUE" | "MARKETPLACE";
  code: string;
  label: string;
  unit: string;
  category: string | null;
  score: number;
  priceMin: number | null;
  priceMoyen: number | null;
  priceMax: number | null;
  currency: "MAD";
  productId?: string;
  offers?: Array<{
    offerId: string;
    priceDH: number;
    supplierId: string | null;
    supplierName: string;
    contracted: boolean;
    showroomCity?: string | null;
    deliveryZones?: string[];
  }>;
  orderable: boolean;
};

@Injectable()
export class CpsMarketplaceService {
  private readonly log = new Logger(CpsMarketplaceService.name);
  private catalogCache: CatalogProduct[] | null = null;
  private pricesCache: PricesFile | null = null;
  private materialsRoot: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  // ── Matching principal ──────────────────────────────────────────

  async match(input: {
    query: string;
    famille?: string;
    unite?: string;
    region?: string;
    limit?: number;
    catalogOnly?: boolean;
  }): Promise<{ keywords: string[]; matches: CpsMatch[] }> {
    const region = input.region || DEFAULT_REGION;
    const limit = Math.min(Math.max(input.limit ?? 8, 1), 30);
    const keywords = this.keywords(input.query);
    if (!keywords.length) return { keywords, matches: [] };

    const boostCats = new Set(FAMILLE_TO_CATEGORIES[input.famille ?? ""] ?? []);
    const corps = FAMILLE_TO_CORPS[input.famille ?? ""] ?? null;

    const cat = await this.searchCatalog(keywords, region, boostCats);
    const mkt = input.catalogOnly ? [] : await this.searchMarketplace(keywords, corps);

    const matches = [...cat, ...mkt]
      .sort((a, b) => b.score - a.score || (b.orderable ? 1 : 0) - (a.orderable ? 1 : 0))
      .slice(0, limit);
    return { keywords, matches };
  }

  /**
   * Chiffrage rapide d'un bordereau (catalogue uniquement, sans requête DB)
   * → produits + prix de référence « suivant CPS » pour chaque poste.
   */
  async priceBordereau(
    rows: Array<{ code: string; lotCode: string; lotIntitule: string; famille: string; designation: string; unite: string }>,
    region?: string,
  ): Promise<
    Array<{
      code: string;
      lotCode: string;
      lotIntitule: string;
      famille: string;
      designation: string;
      unite: string;
      best: CpsMatch | null;
      alternatives: number;
    }>
  > {
    // Postes à l'unité forfaitaire (lump-sum) : pas de prix matière.
    const lumpSum = new Set(["ff", "ens", "forfait", "u"]);
    const out = [];
    for (const r of rows) {
      const isLump = lumpSum.has((r.unite || "").toLowerCase());
      const { matches } = isLump
        ? { matches: [] as CpsMatch[] }
        : await this.match({ query: r.designation, famille: r.famille, unite: r.unite, region, limit: 3, catalogOnly: true });
      // On ne retient un prix de référence que si la pertinence est réelle (≥2 mots-clés).
      const best = matches[0] && matches[0].score >= 2 ? matches[0] : null;
      out.push({
        code: r.code,
        lotCode: r.lotCode,
        lotIntitule: r.lotIntitule,
        famille: r.famille,
        designation: r.designation,
        unite: r.unite,
        best,
        alternatives: matches.filter((m) => m.score >= 2).length,
      });
    }
    return out;
  }

  // ── Catalogue CITURBAREA ────────────────────────────────────────

  private async searchCatalog(
    keywords: string[],
    region: string,
    boostCats: Set<string>,
  ): Promise<CpsMatch[]> {
    const products = await this.loadCatalog();
    const out: CpsMatch[] = [];
    for (const p of products) {
      const hay = [p.label, p.labelAr, p.category, p.description, ...(p.marquesCourantes ?? [])]
        .filter(Boolean)
        .join(" ");
      let score = this.score(hay, keywords);
      if (score <= 0) continue;
      if (p.category && boostCats.has(p.category)) score += 2;
      const price = this.priceFor(p.code, region);
      out.push({
        source: "CATALOGUE",
        code: p.code,
        label: p.label ?? p.code,
        unit: p.unit ?? "",
        category: p.category ?? null,
        score,
        priceMin: price?.min ?? null,
        priceMoyen: price?.moyen ?? null,
        priceMax: price?.max ?? null,
        currency: "MAD",
        orderable: false,
      });
    }
    return out;
  }

  // ── Marketplace Cercles (Prisma) ────────────────────────────────

  private async searchMarketplace(keywords: string[], corps: string | null): Promise<CpsMatch[]> {
    try {
      const where: any = {
        active: true,
        OR: keywords.map((k) => ({ name: { contains: k, mode: "insensitive" } })),
      };
      if (corps) where.corpsMetier = corps;
      const products: any[] = await this.prisma.marketProduct.findMany({
        where,
        take: 40,
        include: {
          offers: {
            where: { active: true },
            include: { supplier: { include: { proProfile: true } } },
          },
        },
      });

      const out: CpsMatch[] = [];
      for (const mp of products) {
        const hay = [mp.name, mp.famille, mp.corpsMetier, mp.description].filter(Boolean).join(" ");
        const score = this.score(hay, keywords);
        if (score <= 0) continue;

        const offers = (mp.offers ?? []).map((o: any) => {
          const contracted = !!o.supplier?.proProfile?.supplierContractSignedAt;
          return {
            offerId: o.id,
            priceDH: o.priceDH,
            supplierId: contracted ? o.supplierId : null,
            supplierName: contracted
              ? o.supplier?.proProfile?.displayName || o.supplier?.username || "Fournisseur"
              : "Fournisseur partenaire",
            contracted,
            showroomCity: o.showroomCity ?? null,
            deliveryZones: o.deliveryZones ?? [],
          };
        });
        const offerPrices = offers.map((o: any) => o.priceDH).filter((n: any) => typeof n === "number");
        const priceMin = offerPrices.length ? Math.min(...offerPrices) : mp.indicativePriceMin ?? null;
        const priceMax = offerPrices.length ? Math.max(...offerPrices) : mp.indicativePriceMax ?? null;
        const priceMoyen = offerPrices.length
          ? Math.round(offerPrices.reduce((s: number, n: number) => s + n, 0) / offerPrices.length)
          : null;

        out.push({
          source: "MARKETPLACE",
          code: mp.citCode || mp.slug || mp.id,
          label: mp.name,
          unit: mp.unit ?? "",
          category: mp.corpsMetier ?? mp.famille ?? null,
          score: score + 1, // léger boost : commandable & prix réels
          priceMin,
          priceMoyen,
          priceMax,
          currency: "MAD",
          productId: mp.id,
          offers,
          orderable: offers.some((o: any) => o.contracted && o.supplierId),
        });
      }
      return out;
    } catch (e: any) {
      this.log.warn(`[CpsMarketplace] requête marketplace échouée: ${e?.message}`);
      return [];
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private keywords(text: string): string[] {
    const norm = (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, " ");
    const seen = new Set<string>();
    const out: string[] = [];
    for (const tok of norm.split(/\s+/)) {
      if (tok.length < 3) continue;
      if (/^\d+$/.test(tok)) continue;
      if (STOPWORDS.has(tok) || UNIT_TOKENS.has(tok)) continue;
      if (seen.has(tok)) continue;
      seen.add(tok);
      out.push(tok);
      if (out.length >= 8) break;
    }
    return out;
  }

  private score(haystack: string, keywords: string[]): number {
    const h = haystack
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    let s = 0;
    for (const k of keywords) if (h.includes(k)) s += 1;
    return s;
  }

  private priceFor(code: string, region: string): { min: number; moyen: number; max: number } | null {
    const prices = this.pricesCache;
    const base = prices?.baselinePrices?.[code];
    if (!base) return null;
    const factor = prices?.regionFactors?.[region] ?? 1;
    const round = (n: number | undefined) => (typeof n === "number" ? Math.round(n * factor) : 0);
    return { min: round(base.prixMin), moyen: round(base.prixMoyen), max: round(base.prixMax) };
  }

  private async loadCatalog(): Promise<CatalogProduct[]> {
    if (this.catalogCache) return this.catalogCache;
    const root = await this.root();
    const catalogRaw = await this.readJson<any>(path.join(root, "catalog.json"));
    this.pricesCache = (await this.readJson<PricesFile>(path.join(root, "prices-2026-05.json"))) ?? {};
    const products: CatalogProduct[] = Array.isArray(catalogRaw)
      ? catalogRaw
      : Array.isArray(catalogRaw?.materials)
        ? catalogRaw.materials
        : Array.isArray(catalogRaw?.products)
          ? catalogRaw.products
          : [];
    this.catalogCache = products.filter((p) => p && p.code);
    return this.catalogCache;
  }

  private async root(): Promise<string> {
    if (this.materialsRoot) return this.materialsRoot;
    const candidates = [
      process.env.MATERIALS_DATA_ROOT,
      path.resolve(process.cwd(), "apps/api/data/materials"),
      path.resolve(process.cwd(), "data/materials"),
      path.resolve(__dirname, "../../../data/materials"),
      path.resolve(__dirname, "../../../../data/materials"),
    ].filter(Boolean) as string[];
    for (const c of candidates) {
      try {
        await fs.access(path.join(c, "catalog.json"));
        this.materialsRoot = c;
        return c;
      } catch {
        /* next */
      }
    }
    this.materialsRoot = candidates[1] ?? candidates[0];
    return this.materialsRoot;
  }

  private async readJson<T>(file: string): Promise<T | null> {
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as T;
    } catch (e: any) {
      this.log.warn(`[CpsMarketplace] lecture ${path.basename(file)} échouée: ${e?.message}`);
      return null;
    }
  }
}
