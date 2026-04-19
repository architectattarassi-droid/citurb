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
exports.LotissementController = exports.UniverseController = void 0;
const common_1 = require("@nestjs/common");
const universe_service_1 = require("./universe.service");
const tome_at_1 = require("../../tomes/tome-at");
function parseBool(v) {
    if (v === undefined)
        return undefined;
    if (v === true || v === "true" || v === "1" || v === 1)
        return true;
    if (v === false || v === "false" || v === "0" || v === 0)
        return false;
    return undefined;
}
function parseNum(v) {
    if (v === undefined)
        return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}
function normalizeQuery(q) {
    return {
        projectType: q.projectType,
        facades: parseNum(q.facades),
        lotType: q.lotType,
        levels: parseNum(q.levels),
        hasBasement: parseBool(q.hasBasement),
        cour: q.cour,
        encorbellement: q.encorbellement,
        page: parseNum(q.page),
        pageSize: parseNum(q.pageSize),
        sort: q.sort,
        order: q.order,
    };
}
let UniverseController = class UniverseController {
    universe;
    constructor(universe) {
        this.universe = universe;
    }
    count(q) {
        const query = normalizeQuery(q);
        return { count: this.universe.getCount(query) };
    }
    facets(q) {
        const query = normalizeQuery(q);
        return this.universe.getFacets(query);
    }
    list(q) {
        const query = normalizeQuery(q);
        return this.universe.list(query);
    }
    export(q, res) {
        const query = normalizeQuery(q);
        const csv = this.universe.exportCsv(query);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="universe.csv"');
        res.send(csv);
    }
};
exports.UniverseController = UniverseController;
__decorate([
    (0, common_1.Get)("count"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UniverseController.prototype, "count", null);
__decorate([
    (0, common_1.Get)("facets"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UniverseController.prototype, "facets", null);
__decorate([
    (0, common_1.Get)("list"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UniverseController.prototype, "list", null);
__decorate([
    (0, common_1.Get)("export"),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UniverseController.prototype, "export", null);
exports.UniverseController = UniverseController = __decorate([
    (0, tome_at_1.Tome)('tome_at'),
    (0, common_1.Controller)("api/universe"),
    __metadata("design:paramtypes", [universe_service_1.UniverseService])
], UniverseController);
let LotissementController = class LotissementController {
    universe;
    constructor(universe) {
        this.universe = universe;
    }
    listOverrides() {
        return { items: this.universe.getOverrides() };
    }
    upsert(body) {
        const lotId = String(body?.lotId ?? "");
        const overrides = (body?.overrides ?? {});
        if (!lotId)
            return { ok: false, error: "lotId is required" };
        return { ok: true, item: this.universe.upsertOverride(lotId, overrides) };
    }
};
exports.LotissementController = LotissementController;
__decorate([
    (0, common_1.Get)("override"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LotissementController.prototype, "listOverrides", null);
__decorate([
    (0, common_1.Post)("override"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LotissementController.prototype, "upsert", null);
exports.LotissementController = LotissementController = __decorate([
    (0, tome_at_1.Tome)('tome_at'),
    (0, common_1.Controller)("api/lotissement"),
    __metadata("design:paramtypes", [universe_service_1.UniverseService])
], LotissementController);
