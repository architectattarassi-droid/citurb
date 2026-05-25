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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialsCatalogController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const tome_decorators_1 = require("../../tome-at/kernel/tome.decorators");
const materials_catalog_service_1 = require("./materials-catalog.service");
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
let MaterialsCatalogController = class MaterialsCatalogController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    catalog(category, region) {
        return {
            ok: true,
            meta: this.svc.getMeta(),
            categories: this.svc.listCategories(),
            regions: this.svc.listRegions(),
            materials: this.svc.listMaterials({ category, region }),
        };
    }
    search(q, region) {
        return {
            ok: true,
            query: q,
            results: this.svc.search(q ?? "", region),
        };
    }
    categories() {
        return { ok: true, categories: this.svc.listCategories() };
    }
    regions() {
        return { ok: true, regions: this.svc.listRegions() };
    }
    meta() {
        return { ok: true, meta: this.svc.getMeta() };
    }
    index(region) {
        return { ok: true, index: this.svc.buildIndex(region ?? "06_CASABLANCA_SETTAT") };
    }
    /**
     * NOTE: this route MUST be declared AFTER the static routes above
     * (catalog, categories, regions, meta, index) because NestJS routes are
     * order-sensitive and ":code" would otherwise swallow them.
     */
    detail(code, region) {
        return { ok: true, material: this.svc.getByCode(code, region) };
    }
    prices(code, region) {
        return { ok: true, price: this.svc.getCurrentPrice(code, region ?? "06_CASABLANCA_SETTAT") };
    }
    history(code, region, months) {
        const m = months ? Math.max(1, Math.min(24, Number(months))) : 12;
        return {
            ok: true,
            history: this.svc.getPriceHistory(code, region ?? "06_CASABLANCA_SETTAT", m),
        };
    }
    observation(code, body) {
        return this.svc.recordObservation(code, body);
    }
};
exports.MaterialsCatalogController = MaterialsCatalogController;
__decorate([
    (0, common_1.Get)("catalog"),
    (0, common_1.Header)("Cache-Control", "public, max-age=3600"),
    (0, tome_decorators_1.Rule)("T5-MAT-CATALOG-001"),
    __param(0, (0, common_1.Query)("category")),
    __param(1, (0, common_1.Query)("region")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MaterialsCatalogController.prototype, "catalog", null);
__decorate([
    (0, common_1.Get)("catalog/search"),
    (0, tome_decorators_1.Rule)("T5-MAT-CATALOG-001"),
    __param(0, (0, common_1.Query)("q")),
    __param(1, (0, common_1.Query)("region")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MaterialsCatalogController.prototype, "search", null);
__decorate([
    (0, common_1.Get)("categories"),
    (0, common_1.Header)("Cache-Control", "public, max-age=3600"),
    (0, tome_decorators_1.Rule)("T5-MAT-CATALOG-001"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MaterialsCatalogController.prototype, "categories", null);
__decorate([
    (0, common_1.Get)("regions"),
    (0, common_1.Header)("Cache-Control", "public, max-age=3600"),
    (0, tome_decorators_1.Rule)("T5-MAT-CATALOG-001"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MaterialsCatalogController.prototype, "regions", null);
__decorate([
    (0, common_1.Get)("meta"),
    (0, common_1.Header)("Cache-Control", "public, max-age=3600"),
    (0, tome_decorators_1.Rule)("T5-MAT-CATALOG-001"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MaterialsCatalogController.prototype, "meta", null);
__decorate([
    (0, common_1.Get)("index/citurbarea"),
    (0, common_1.Header)("Cache-Control", "public, max-age=1800"),
    (0, tome_decorators_1.Rule)("T5-MAT-INDEX-003"),
    __param(0, (0, common_1.Query)("region")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MaterialsCatalogController.prototype, "index", null);
__decorate([
    (0, common_1.Get)(":code"),
    (0, common_1.Header)("Cache-Control", "public, max-age=600"),
    (0, tome_decorators_1.Rule)("T5-MAT-CATALOG-001"),
    __param(0, (0, common_1.Param)("code")),
    __param(1, (0, common_1.Query)("region")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MaterialsCatalogController.prototype, "detail", null);
__decorate([
    (0, common_1.Get)(":code/prices"),
    (0, common_1.Header)("Cache-Control", "public, max-age=600"),
    (0, tome_decorators_1.Rule)("T5-MAT-CATALOG-001"),
    __param(0, (0, common_1.Param)("code")),
    __param(1, (0, common_1.Query)("region")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MaterialsCatalogController.prototype, "prices", null);
__decorate([
    (0, common_1.Get)(":code/prices/history"),
    (0, common_1.Header)("Cache-Control", "public, max-age=3600"),
    (0, tome_decorators_1.Rule)("T5-MAT-CATALOG-001"),
    __param(0, (0, common_1.Param)("code")),
    __param(1, (0, common_1.Query)("region")),
    __param(2, (0, common_1.Query)("months")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], MaterialsCatalogController.prototype, "history", null);
__decorate([
    (0, common_1.Post)(":code/observation"),
    (0, tome_decorators_1.Rule)("T5-MAT-OBSERVATION-002"),
    __param(0, (0, common_1.Param)("code")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MaterialsCatalogController.prototype, "observation", null);
exports.MaterialsCatalogController = MaterialsCatalogController = __decorate([
    (0, tome_at_1.Tome)("tome5"),
    (0, common_1.Controller)("api/materials"),
    __metadata("design:paramtypes", [materials_catalog_service_1.MaterialsCatalogService])
], MaterialsCatalogController);
