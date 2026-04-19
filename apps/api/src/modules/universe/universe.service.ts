import { Injectable } from "@nestjs/common";
import * as path from "path";
import { buildUniverseSeeds } from "./build-universe";
import { PlanSeed, UniverseQuery } from "./universe.types";
import { readJson, writeJson } from "./storage";

type LotissementOverride = {
  lotId: string;
  overrides: Record<string, unknown>;
  updatedAt: string;
};

@Injectable()
export class UniverseService {
  private cachePath = path.join(process.cwd(), "storage", "universe", "universe.cache.json");
  private overridesPath = path.join(process.cwd(), "storage", "universe", "lotissement.overrides.json");

  private cache: { builtAt: string; seeds: PlanSeed[] } | null = null;

  private load(): { builtAt: string; seeds: PlanSeed[] } {
    if (this.cache) return this.cache;
    const fallback = { builtAt: "", seeds: [] as PlanSeed[] };
    const loaded = readJson(this.cachePath, fallback);
    if (!loaded.seeds?.length) {
      const seeds = buildUniverseSeeds();
      const builtAt = new Date().toISOString();
      this.cache = { builtAt, seeds };
      writeJson(this.cachePath, this.cache);
      return this.cache;
    }
    this.cache = loaded;
    return loaded;
  }

  getCount(query: UniverseQuery) {
    const { seeds } = this.load();
    return this.applyFilters(seeds, query).length;
  }

  getFacets(query: UniverseQuery) {
    const { seeds } = this.load();
    const filtered = this.applyFilters(seeds, query);

    const facet = <T extends string | number | boolean>(key: keyof PlanSeed) => {
      const map = new Map<T, number>();
      for (const s of filtered) {
        const v = s[key] as unknown as T;
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

  list(query: UniverseQuery) {
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

  exportCsv(query: UniverseQuery): string {
    const { items } = this.list({ ...query, page: 1, pageSize: 100000 });
    const header = [
      "id","projectType","facades","lotType","levels","hasBasement","cour","encorbellement",
      "maxRdcRatio","maxFloorRatio","maxBuiltRatio","notes"
    ];
    const rows = [header.join(",")];
    for (const s of items) {
      const row = [
        s.id, s.projectType, String(s.facades), s.lotType, String(s.levels), String(s.hasBasement),
        s.cour, s.encorbellement,
        String(s.maxRdcRatio), String(s.maxFloorRatio), String(s.maxBuiltRatio),
        `"${(s.notes ?? []).join(" | ").replace(/"/g,'""')}"`
      ];
      rows.push(row.join(","));
    }
    return rows.join("\n");
  }

  getOverrides(): LotissementOverride[] {
    return readJson(this.overridesPath, [] as LotissementOverride[]);
  }

  upsertOverride(lotId: string, overrides: Record<string, unknown>) {
    const current = this.getOverrides();
    const now = new Date().toISOString();
    const idx = current.findIndex((x) => x.lotId === lotId);
    const entry: LotissementOverride = { lotId, overrides, updatedAt: now };
    if (idx >= 0) current[idx] = entry;
    else current.push(entry);
    writeJson(this.overridesPath, current);
    return entry;
  }

  private applyFilters(seeds: PlanSeed[], q: UniverseQuery): PlanSeed[] {
    return seeds.filter((s) => {
      if (q.projectType && s.projectType !== q.projectType) return false;
      if (typeof q.facades === "number" && s.facades !== q.facades) return false;
      if (q.lotType && s.lotType !== q.lotType) return false;
      if (typeof q.levels === "number" && s.levels !== q.levels) return false;
      if (typeof q.hasBasement === "boolean" && s.hasBasement !== q.hasBasement) return false;
      if (q.cour && s.cour !== q.cour) return false;
      if (q.encorbellement && s.encorbellement !== q.encorbellement) return false;
      return true;
    });
  }

  private applySort(items: PlanSeed[], sort?: string, order?: "asc" | "desc") {
    const dir = order === "asc" ? 1 : -1;
    const key = sort ?? "maxBuiltRatio";
    const cloned = [...items];
    cloned.sort((a, b) => {
      const av = (a as any)[key];
      const bv = (b as any)[key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return cloned;
  }
}
