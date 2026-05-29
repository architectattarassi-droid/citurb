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
exports.CpsGeneratorController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const cps_generator_service_1 = require("./cps-generator.service");
const cps_marketplace_service_1 = require("./cps-marketplace.service");
function coerceLang(v) {
    return v === "ar" || v === "en" ? v : "fr";
}
/**
 * Tome 2 — Générateur de CPS (Cahier des Prescriptions Spéciales).
 *
 *  - GET  /api/cps/project-types     liste des types de projet disponibles
 *  - GET  /api/cps/lots              liste des lots techniques rédigés
 *  - POST /api/cps/generate          génère le CPS (markdown + html + méta)
 *  - POST /api/cps/generate/html     génère et renvoie le HTML imprimable
 */
let CpsGeneratorController = class CpsGeneratorController {
    service;
    marketplace;
    constructor(service, marketplace) {
        this.service = service;
        this.marketplace = marketplace;
    }
    async projectTypes(lang) {
        const items = await this.service.listProjectTypes(coerceLang(lang));
        return { items, total: items.length };
    }
    async lots(lang) {
        const items = await this.service.listLots(coerceLang(lang));
        return { items, total: items.length };
    }
    async generate(body) {
        return this.service.generate(body);
    }
    async generateHtml(body, res) {
        const doc = await this.service.generate(body);
        res.send(doc.html);
    }
    // ── Pont marketplace ──────────────────────────────────────────
    /** Recherche fédérée catalogue + marketplace pour un poste de CPS. */
    async match(body) {
        if (!body?.query)
            return { keywords: [], matches: [] };
        return this.marketplace.match(body);
    }
    /**
     * Génère le CPS puis renvoie le bordereau chiffré (produits + prix de
     * référence par poste, suivant les spécifications pré-rédigées).
     */
    async bordereauChiffre(body) {
        const doc = await this.service.generate(body);
        const priced = await this.marketplace.priceBordereau(doc.bordereau, body.region);
        return {
            projectTypeCode: doc.projectTypeCode,
            projectTypeLabel: doc.projectTypeLabel,
            projectName: doc.projectName,
            lang: doc.lang,
            region: body.region || "06_CASABLANCA_SETTAT",
            postesCount: priced.length,
            postesChiffres: priced.filter((r) => r.best).length,
            bordereau: priced,
        };
    }
};
exports.CpsGeneratorController = CpsGeneratorController;
__decorate([
    (0, common_1.Get)("project-types"),
    __param(0, (0, common_1.Query)("lang")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CpsGeneratorController.prototype, "projectTypes", null);
__decorate([
    (0, common_1.Get)("lots"),
    __param(0, (0, common_1.Query)("lang")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CpsGeneratorController.prototype, "lots", null);
__decorate([
    (0, common_1.Post)("generate"),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CpsGeneratorController.prototype, "generate", null);
__decorate([
    (0, common_1.Post)("generate/html"),
    (0, common_1.HttpCode)(200),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CpsGeneratorController.prototype, "generateHtml", null);
__decorate([
    (0, common_1.Post)("marketplace/match"),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CpsGeneratorController.prototype, "match", null);
__decorate([
    (0, common_1.Post)("bordereau-chiffre"),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CpsGeneratorController.prototype, "bordereauChiffre", null);
exports.CpsGeneratorController = CpsGeneratorController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("api/cps"),
    __metadata("design:paramtypes", [cps_generator_service_1.CpsGeneratorService,
        cps_marketplace_service_1.CpsMarketplaceService])
], CpsGeneratorController);
