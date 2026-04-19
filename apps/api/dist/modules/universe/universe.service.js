"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniverseService = void 0;
const common_1 = require("@nestjs/common");
const path = require("path");
const build_universe_1 = require("./build-universe");
const storage_1 = require("./storage");
let UniverseService = class UniverseService {
    cachePath = path.join(process.cwd(), "storage", "universe", "universe.cache.json");
    overridesPath = path.join(process.cwd(), "storage", "universe", "lotissement.overrides.json");
    cache = null;
    load() {
        if (this.cache)
            return this.cache;
        const fallback = { builtAt: "", seeds: [] };
        const loaded = (0, storage_1.readJson)(this.cachePath, fallback);
        if (!loaded.seeds?.length) {
            const seeds = (0, build_universe_1.buildUniverseSeeds)();
            const builtAt = new Date().toISOString();
            this.cache = { builtAt, seeds };
            (0, storage_1.writeJson)(this.cachePath, this.cache);
            return this.cache;
        }
        this.cache = loaded;
        return loaded;
    }
    getCount(query) {
        const { seeds } = this.load();
        return this.applyFilters(seeds, query).length;
    }
    getFacets(query) {
        const { seeds } = this.load();
        const filtered = this.applyFilters(seeds, query);
        const facet = (key) => {
            const map = new Map();
            for (const s of filtered) {
                const v = s[key];
                map.set(v, (map.get(v) ?? 0) + 1);
            }
            return Array.from(map.entries())
                .sort((a, b) => (String(a[0]).localeCompare(String(b[0]))))
                .map(([value, count]) => ({ value, count }));
        };
        return {
            builtAt: this.load().builtAt,
            total: filtered.length,
            facets: {
                projectType: facet("projectType"),
                facades: facet("facades"),
                lotType: facet("lotType"),
                levels: facet("levels"),
                hasBasement: facet("hasBasement"),
                cour: facet("cour"),
                encorbellement: facet("encorbellement"),
            },
        };
    }
    list(query) {
        const { seeds } = this.load();
        const filtered = this.applyFilters(seeds, query);
        const pageSize = Math.max(1, Math.min(200, query.pageSize ?? 50));
        const page = Math.max(1, query.page ?? 1);
        const sorted = this.applySort(filtered, query.sort, query.order);
        const start = (page - 1) * pageSize;
        const items = sorted.slice(start, start + pageSize);
        return {
            builtAt: this.load().builtAt,
            total: sorted.length,
            page,
            pageSize,
            items,
        };
    }
    exportCsv(query) {
        const { items } = this.list({ ...query, page: 1, pageSize: 100000 });
        const header = [
            "id", "projectType", "facades", "lotType", "levels", "hasBasement", "cour", "encorbellement",
            "maxRdcRatio", "maxFloorRatio", "maxBuiltRatio", "notes"
        ];
        const rows = [header.join(",")];
        for (const s of items) {
            const row = [
                s.id, s.projectType, String(s.facades), s.lotType, String(s.levels), String(s.hasBasement),
                s.cour, s.encorbellement,
                String(s.maxRdcRatio), String(s.maxFloorRatio), String(s.maxBuiltRatio),
                `"${(s.notes ?? []).join(" | ").replace(/"/g, '""')}"`
            ];
            rows.push(row.join(","));
        }
        return rows.join("\n");
    }
    getOverrides() {
        return (0, storage_1.readJson)(this.overridesPath, []);
    }
    upsertOverride(lotId, overrides) {
        const current = this.getOverrides();
        const now = new Date().toISOString();
        const idx = current.findIndex((x) => x.lotId === lotId);
        const entry = { lotId, overrides, updatedAt: now };
        if (idx >= 0)
            current[idx] = entry;
        else
            current.push(entry);
        (0, storage_1.writeJson)(this.overridesPath, current);
        return entry;
    }
    applyFilters(seeds, q) {
        return seeds.filter((s) => {
            if (q.projectType && s.projectType !== q.projectType)
                return false;
            if (typeof q.facades === "number" && s.facades !== q.facades)
                return false;
            if (q.lotType && s.lotType !== q.lotType)
                return false;
            if (typeof q.levels === "number" && s.levels !== q.levels)
                return false;
            if (typeof q.hasBasement === "boolean" && s.hasBasement !== q.hasBasement)
                return false;
            if (q.cour && s.cour !== q.cour)
                return false;
            if (q.encorbellement && s.encorbellement !== q.encorbellement)
                return false;
            return true;
        });
    }
    applySort(items, sort, order) {
        const dir = order === "asc" ? 1 : -1;
        const key = sort ?? "maxBuiltRatio";
        const cloned = [...items];
        cloned.sort((a, b) => {
            const av = a[key];
            const bv = b[key];
            if (typeof av === "number" && typeof bv === "number")
                return (av - bv) * dir;
            return String(av).localeCompare(String(bv)) * dir;
        });
        return cloned;
    }
};
exports.UniverseService = UniverseService;
exports.UniverseService = UniverseService = __decorate([
    (0, common_1.Injectable)()
], UniverseService);
