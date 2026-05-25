import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type {
  Material,
  MaterialCategoryDescriptor,
  MaterialPriceHistoryPoint,
  MaterialPriceSnapshot,
  MaterialWithPrice,
  ObservationInput,
  RegionDescriptor,
  CiturbareaIndex,
} from "./materials-catalog.types";

/**
 * TOME 5 — Materials Catalog Service
 *
 * Reads the static catalog (catalog.json) and price snapshots (prices-YYYY-MM.json)
 * from `apps/api/data/materials/`. Cached in-memory at boot.
 *
 * For an MVP we do NOT yet persist observations to the DB — they go into an
 * in-memory buffer that flushes through ProbativeLog (when wired) and feeds the
 * next monthly snapshot computation. This keeps the module zero-migration.
 *
 * Doctrine refs:
 * - T5-MAT-CATALOG-001: read-only public catalog
 * - T5-MAT-OBSERVATION-002: anonymous price observation (rate-limited)
 */
@Injectable()
export class MaterialsCatalogService {
  private readonly logger = new Logger(MaterialsCatalogService.name);
  private catalog: {
    version: string;
    lastUpdated: string;
    currency: string;
    vatNote: string;
    categories: MaterialCategoryDescriptor[];
    materials: Material[];
  } | null = null;

  private prices: {
    yearMonth: string;
    currency: string;
    regions: RegionDescriptor[];
    regionFactors: Record<string, number>;
    baselinePrices: Record<
      string,
      { prixMin: number; prixMoyen: number; prixMax: number; source: string; observations: number }
    >;
  } | null = null;

  /** In-memory observations buffer (per material+region). */
  private observations: Array<ObservationInput & { materialCode: string; createdAt: string }> = [];

  constructor() {
    this.load();
  }

  /** Locate the data directory (works both in `src/` ts-node and `dist/` prod). */
  private resolveDataDir(): string {
    const candidates = [
      // ts-node-dev: cwd = apps/api OR repo root
      join(process.cwd(), "apps", "api", "data", "materials"),
      join(process.cwd(), "data", "materials"),
      // dist: __dirname-based
      join(__dirname, "..", "..", "..", "..", "data", "materials"),
      join(__dirname, "..", "..", "..", "..", "..", "data", "materials"),
    ];
    for (const c of candidates) {
      if (existsSync(c)) return c;
    }
    // Fallback (will throw at read)
    return candidates[0];
  }

  /** Load catalog + latest price snapshot into memory. */
  private load(): void {
    const dir = this.resolveDataDir();
    try {
      const catalogPath = join(dir, "catalog.json");
      const pricesPath = join(dir, "prices-2026-05.json");
      this.catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));
      this.prices = JSON.parse(readFileSync(pricesPath, "utf-8"));
      this.logger.log(
        `Loaded ${this.catalog?.materials.length ?? 0} materials, ${this.prices?.regions.length ?? 0} regions (snapshot ${this.prices?.yearMonth}).`,
      );
    } catch (err) {
      this.logger.error(`Failed to load materials catalog from ${dir}: ${(err as Error).message}`);
      this.catalog = { version: "0", lastUpdated: "", currency: "MAD", vatNote: "", categories: [], materials: [] };
      this.prices = { yearMonth: "2026-05", currency: "MAD", regions: [], regionFactors: {}, baselinePrices: {} };
    }
  }

  /** All categories. */
  listCategories(): MaterialCategoryDescriptor[] {
    return this.catalog?.categories ?? [];
  }

  /** All regions. */
  listRegions(): RegionDescriptor[] {
    return this.prices?.regions ?? [];
  }

  /** Snapshot meta (year/month, currency, vatNote, lastUpdated). */
  getMeta() {
    return {
      version: this.catalog?.version,
      lastUpdated: this.catalog?.lastUpdated,
      yearMonth: this.prices?.yearMonth,
      currency: this.catalog?.currency ?? "MAD",
      vatNote: this.catalog?.vatNote ?? "Prix HT",
      materialsCount: this.catalog?.materials.length ?? 0,
      regionsCount: this.prices?.regions.length ?? 0,
    };
  }

  /** List materials with optional category filter. Includes current price for the default region. */
  listMaterials(opts: { category?: string; region?: string } = {}): MaterialWithPrice[] {
    if (!this.catalog) return [];
    const region = opts.region ?? "06_CASABLANCA_SETTAT";
    const materials = opts.category
      ? this.catalog.materials.filter((m) => m.category === opts.category)
      : this.catalog.materials;
    return materials.map((m) => this.decorateWithPrice(m, region));
  }

  /** Fuzzy search (substring, case-insensitive) on code, label, labelAr, marquesCourantes. */
  search(q: string, region?: string): MaterialWithPrice[] {
    if (!q || !this.catalog) return [];
    const needle = q.trim().toLowerCase();
    const r = region ?? "06_CASABLANCA_SETTAT";
    return this.catalog.materials
      .filter((m) => {
        const hay = [
          m.code,
          m.label,
          m.labelAr,
          m.category,
          ...(m.marquesCourantes ?? []),
        ]
          .join("|")
          .toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, 50)
      .map((m) => this.decorateWithPrice(m, r));
  }

  /** Get one material by code. */
  getByCode(code: string, region?: string): MaterialWithPrice {
    const material = this.catalog?.materials.find((m) => m.code === code);
    if (!material) throw new NotFoundException(`Material ${code} not found`);
    return this.decorateWithPrice(material, region ?? "06_CASABLANCA_SETTAT");
  }

  /** Get current price for a material in a region. */
  getCurrentPrice(code: string, region: string): MaterialPriceSnapshot {
    const baseline = this.prices?.baselinePrices[code];
    if (!baseline) throw new NotFoundException(`Material ${code} has no price snapshot`);
    const factor = this.prices?.regionFactors[region] ?? 1.0;
    return {
      materialCode: code,
      region,
      yearMonth: this.prices?.yearMonth ?? "2026-05",
      prixMin: round2(baseline.prixMin * factor),
      prixMoyen: round2(baseline.prixMoyen * factor),
      prixMax: round2(baseline.prixMax * factor),
      source: baseline.source,
      observations: baseline.observations,
      updatedAt: `${this.prices?.yearMonth ?? "2026-05"}-01T00:00:00.000Z`,
    };
  }

  /**
   * Generate a 12-month synthetic history.
   * Strategy: deterministic seeded variation around the current month moyen.
   * Real implementation would query a snapshots table.
   */
  getPriceHistory(code: string, region: string, months = 12): MaterialPriceHistoryPoint[] {
    const baseline = this.prices?.baselinePrices[code];
    if (!baseline) throw new NotFoundException(`Material ${code} has no price snapshot`);
    const factor = this.prices?.regionFactors[region] ?? 1.0;
    const current = baseline.prixMoyen * factor;
    const seed = hashCode(`${code}|${region}`);

    const out: MaterialPriceHistoryPoint[] = [];
    // Year-month string parser (e.g. "2026-05")
    const [yStr, mStr] = (this.prices?.yearMonth ?? "2026-05").split("-");
    let year = Number(yStr);
    let month = Number(mStr);
    for (let i = months - 1; i >= 0; i--) {
      // Walk backward i months from current
      let y = year;
      let m = month - i;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      // Deterministic pseudo-random variation in [-6%, +6%] based on seed+i
      const wobble = (Math.sin(seed + i * 1.7) + Math.cos(seed * 0.3 + i)) * 0.03;
      // Light upward trend (~1.5% over 12 months)
      const trend = (months - 1 - i) * 0.00125;
      const value = current * (1 - trend) * (1 + wobble);
      out.push({
        yearMonth: `${y}-${String(m).padStart(2, "0")}`,
        prixMoyen: round2(value),
      });
    }
    return out;
  }

  /** Record a user observation (in-memory). */
  recordObservation(materialCode: string, input: ObservationInput): { ok: true; received: number } {
    if (!this.catalog?.materials.find((m) => m.code === materialCode)) {
      throw new NotFoundException(`Material ${materialCode} not found`);
    }
    this.observations.push({ ...input, materialCode, createdAt: new Date().toISOString() });
    // Cap buffer to last 5000 to avoid OOM
    if (this.observations.length > 5000) this.observations = this.observations.slice(-5000);
    return { ok: true, received: this.observations.length };
  }

  /**
   * Build the CITURBAREA index for a region.
   * Weights: ciment 30%, acier 30%, granulats 15%, beton 25%.
   * Indice base 100 = baseline (Casablanca-Settat factor 1.0) moyen national mai 2026.
   */
  buildIndex(region: string): CiturbareaIndex {
    const region_ = region || "06_CASABLANCA_SETTAT";
    const factor = this.prices?.regionFactors[region_] ?? 1.0;
    const components = [
      { category: "ciment", weight: 0.30, key: "CIMENT_CPJ_45_SAC50" },
      { category: "acier", weight: 0.30, key: "ACIER_HA_FE500_12" },
      { category: "granulats", weight: 0.15, key: "GRAVETTE_5_15" },
      { category: "beton", weight: 0.25, key: "BPE_C25_30" },
    ];
    const baselineSum = components.reduce((acc, c) => {
      const p = this.prices?.baselinePrices[c.key];
      return acc + (p ? p.prixMoyen * c.weight : 0);
    }, 0);
    const regionalSum = baselineSum * factor;
    // Indice base 100 = baselineSum at factor=1.0
    const indice = round2((regionalSum / baselineSum) * 100);
    return {
      region: region_,
      yearMonth: this.prices?.yearMonth ?? "2026-05",
      indice,
      variationVsBaseline: round2(indice - 100),
      components: components.map((c) => {
        const p = this.prices?.baselinePrices[c.key];
        return {
          category: c.category,
          weight: c.weight,
          value: p ? round2(p.prixMoyen * factor) : 0,
        };
      }),
    };
  }

  /** Decorate a material with current price + variation vs previous month. */
  private decorateWithPrice(material: Material, region: string): MaterialWithPrice {
    const baseline = this.prices?.baselinePrices[material.code];
    if (!baseline) return { ...material };
    const factor = this.prices?.regionFactors[region] ?? 1.0;
    const currentPrice: MaterialPriceSnapshot = {
      materialCode: material.code,
      region,
      yearMonth: this.prices?.yearMonth ?? "2026-05",
      prixMin: round2(baseline.prixMin * factor),
      prixMoyen: round2(baseline.prixMoyen * factor),
      prixMax: round2(baseline.prixMax * factor),
      source: baseline.source,
      observations: baseline.observations,
      updatedAt: `${this.prices?.yearMonth ?? "2026-05"}-01T00:00:00.000Z`,
    };
    // Compute variation vs M-1 from synthetic history
    const history = this.getPriceHistory(material.code, region, 2);
    const prevMoyen = history.length >= 2 ? history[0].prixMoyen : currentPrice.prixMoyen;
    const variationPct = prevMoyen > 0 ? round2(((currentPrice.prixMoyen - prevMoyen) / prevMoyen) * 100) : 0;
    return { ...material, currentPrice, variationPct };
  }
}

/** Round to 2 decimals. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Tiny string→int hash for deterministic seeding. */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}
