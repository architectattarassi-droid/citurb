import { Body, Controller, Get, Header, Param, Post, Query } from "@nestjs/common";
import { Tome } from "../../tome-at";
import { Rule } from "../../tome-at/kernel/tome.decorators";
import { MaterialsCatalogService } from "./materials-catalog.service";
import type { ObservationInput } from "./materials-catalog.types";

/**
 * TOME 5 — Materials Catalog Controller
 *
 * Public read endpoints + one rate-limited observation endpoint.
 *
 * Endpoints:
 *  GET  /api/materials/catalog
 *  GET  /api/materials/catalog?category=<code>
 *  GET  /api/materials/catalog/search?q=<q>
 *  GET  /api/materials/categories
 *  GET  /api/materials/regions
 *  GET  /api/materials/meta
 *  GET  /api/materials/index/citurbarea?region=<code>
 *  GET  /api/materials/:code
 *  GET  /api/materials/:code/prices?region=<code>
 *  GET  /api/materials/:code/prices/history?region=<code>&months=12
 *  POST /api/materials/:code/observation        (rate-limited, anonymous)
 */
@Tome("tome5")
@Controller("api/materials")
export class MaterialsCatalogController {
  constructor(private readonly svc: MaterialsCatalogService) {}

  @Get("catalog")
  @Header("Cache-Control", "public, max-age=3600")
  @Rule("T5-MAT-CATALOG-001")
  catalog(@Query("category") category?: string, @Query("region") region?: string) {
    return {
      ok: true,
      meta: this.svc.getMeta(),
      categories: this.svc.listCategories(),
      regions: this.svc.listRegions(),
      materials: this.svc.listMaterials({ category, region }),
    };
  }

  @Get("catalog/search")
  @Rule("T5-MAT-CATALOG-001")
  search(@Query("q") q: string, @Query("region") region?: string) {
    return {
      ok: true,
      query: q,
      results: this.svc.search(q ?? "", region),
    };
  }

  @Get("categories")
  @Header("Cache-Control", "public, max-age=3600")
  @Rule("T5-MAT-CATALOG-001")
  categories() {
    return { ok: true, categories: this.svc.listCategories() };
  }

  @Get("regions")
  @Header("Cache-Control", "public, max-age=3600")
  @Rule("T5-MAT-CATALOG-001")
  regions() {
    return { ok: true, regions: this.svc.listRegions() };
  }

  @Get("meta")
  @Header("Cache-Control", "public, max-age=3600")
  @Rule("T5-MAT-CATALOG-001")
  meta() {
    return { ok: true, meta: this.svc.getMeta() };
  }

  @Get("index/citurbarea")
  @Header("Cache-Control", "public, max-age=1800")
  @Rule("T5-MAT-INDEX-003")
  index(@Query("region") region?: string) {
    return { ok: true, index: this.svc.buildIndex(region ?? "06_CASABLANCA_SETTAT") };
  }

  /**
   * NOTE: this route MUST be declared AFTER the static routes above
   * (catalog, categories, regions, meta, index) because NestJS routes are
   * order-sensitive and ":code" would otherwise swallow them.
   */
  @Get(":code")
  @Header("Cache-Control", "public, max-age=600")
  @Rule("T5-MAT-CATALOG-001")
  detail(@Param("code") code: string, @Query("region") region?: string) {
    return { ok: true, material: this.svc.getByCode(code, region) };
  }

  @Get(":code/prices")
  @Header("Cache-Control", "public, max-age=600")
  @Rule("T5-MAT-CATALOG-001")
  prices(@Param("code") code: string, @Query("region") region?: string) {
    return { ok: true, price: this.svc.getCurrentPrice(code, region ?? "06_CASABLANCA_SETTAT") };
  }

  @Get(":code/prices/history")
  @Header("Cache-Control", "public, max-age=3600")
  @Rule("T5-MAT-CATALOG-001")
  history(
    @Param("code") code: string,
    @Query("region") region?: string,
    @Query("months") months?: string,
  ) {
    const m = months ? Math.max(1, Math.min(24, Number(months))) : 12;
    return {
      ok: true,
      history: this.svc.getPriceHistory(code, region ?? "06_CASABLANCA_SETTAT", m),
    };
  }

  @Post(":code/observation")
  @Rule("T5-MAT-OBSERVATION-002")
  observation(@Param("code") code: string, @Body() body: ObservationInput) {
    return this.svc.recordObservation(code, body);
  }
}
