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
var MaterialsCatalogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialsCatalogService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
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
let MaterialsCatalogService = MaterialsCatalogService_1 = class MaterialsCatalogService {
    logger = new common_1.Logger(MaterialsCatalogService_1.name);
    catalog = null;
    prices = null;
    /** In-memory observations buffer (per material+region). */
    observations = [];
    constructor() {
        this.load();
    }
    /** Locate the data directory (works both in `src/` ts-node and `dist/` prod). */
    resolveDataDir() {
        const candidates = [
            // ts-node-dev: cwd = apps/api OR repo root
            (0, path_1.join)(process.cwd(), "apps", "api", "data", "materials"),
            (0, path_1.join)(process.cwd(), "data", "materials"),
            // dist: __dirname-based
            (0, path_1.join)(__dirname, "..", "..", "..", "..", "data", "materials"),
            (0, path_1.join)(__dirname, "..", "..", "..", "..", "..", "data", "materials"),
        ];
        for (const c of candidates) {
            if ((0, fs_1.existsSync)(c))
                return c;
        }
        // Fallback (will throw at read)
        return candidates[0];
    }
    /** Load catalog + latest price snapshot into memory. */
    load() {
        const dir = this.resolveDataDir();
        try {
            const catalogPath = (0, path_1.join)(dir, "catalog.json");
            const pricesPath = (0, path_1.join)(dir, "prices-2026-05.json");
            this.catalog = JSON.parse((0, fs_1.readFileSync)(catalogPath, "utf-8"));
            this.prices = JSON.parse((0, fs_1.readFileSync)(pricesPath, "utf-8"));
            this.logger.log(`Loaded ${this.catalog?.materials.length ?? 0} materials, ${this.prices?.regions.length ?? 0} regions (snapshot ${this.prices?.yearMonth}).`);
        }
        catch (err) {
            this.logger.error(`Failed to load materials catalog from ${dir}: ${err.message}`);
            this.catalog = { version: "0", lastUpdated: "", currency: "MAD", vatNote: "", categories: [], materials: [] };
            this.prices = { yearMonth: "2026-05", currency: "MAD", regions: [], regionFactors: {}, baselinePrices: {} };
        }
    }
    /** All categories. */
    listCategories() {
        return this.catalog?.categories ?? [];
    }
    /** All regions. */
    listRegions() {
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
    listMaterials(opts = {}) {
        if (!this.catalog)
            return [];
        const region = opts.region ?? "06_CASABLANCA_SETTAT";
        const materials = opts.category
            ? this.catalog.materials.filter((m) => m.category === opts.category)
            : this.catalog.materials;
        return materials.map((m) => this.decorateWithPrice(m, region));
    }
    /** Fuzzy search (substring, case-insensitive) on code, label, labelAr, marquesCourantes. */
    search(q, region) {
        if (!q || !this.catalog)
            return [];
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
    getByCode(code, region) {
        const material = this.catalog?.materials.find((m) => m.code === code);
        if (!material)
            throw new common_1.NotFoundException(`Material ${code} not found`);
        return this.decorateWithPrice(material, region ?? "06_CASABLANCA_SETTAT");
    }
    /** Get current price for a material in a region. */
    getCurrentPrice(code, region) {
        const baseline = this.prices?.baselinePrices[code];
        if (!baseline)
            throw new common_1.NotFoundException(`Material ${code} has no price snapshot`);
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
    getPriceHistory(code, region, months = 12) {
        const baseline = this.prices?.baselinePrices[code];
        if (!baseline)
            throw new common_1.NotFoundException(`Material ${code} has no price snapshot`);
        const factor = this.prices?.regionFactors[region] ?? 1.0;
        const current = baseline.prixMoyen * factor;
        const seed = hashCode(`${code}|${region}`);
        const out = [];
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
    recordObservation(materialCode, input) {
        if (!this.catalog?.materials.find((m) => m.code === materialCode)) {
            throw new common_1.NotFoundException(`Material ${materialCode} not found`);
        }
        this.observations.push({ ...input, materialCode, createdAt: new Date().toISOString() });
        // Cap buffer to last 5000 to avoid OOM
        if (this.observations.length > 5000)
            this.observations = this.observations.slice(-5000);
        return { ok: true, received: this.observations.length };
    }
    /**
     * Build the CITURBAREA index for a region.
     * Weights: ciment 30%, acier 30%, granulats 15%, beton 25%.
     * Indice base 100 = baseline (Casablanca-Settat factor 1.0) moyen national mai 2026.
     */
    buildIndex(region) {
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
    decorateWithPrice(material, region) {
        const baseline = this.prices?.baselinePrices[material.code];
        if (!baseline)
            return { ...material };
        const factor = this.prices?.regionFactors[region] ?? 1.0;
        const currentPrice = {
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
};
exports.MaterialsCatalogService = MaterialsCatalogService;
exports.MaterialsCatalogService = MaterialsCatalogService = MaterialsCatalogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MaterialsCatalogService);
/** Round to 2 decimals. */
function round2(n) {
    return Math.round(n * 100) / 100;
}
/** Tiny string→int hash for deterministic seeding. */
function hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i);
        h |= 0;
    }
    return h;
}
