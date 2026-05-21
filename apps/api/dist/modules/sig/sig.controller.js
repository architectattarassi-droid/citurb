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
exports.SigController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const sig_data_service_1 = require("./sig-data.service");
/**
 * SigController — expose les couches SIG publiques institutionnelles
 * marocaines via notre propre origine (doctrine : aucune redirection externe).
 *
 *  GET /api/sig/sources                       — liste des sources et couches dispo
 *  GET /api/sig/:source/:layer.geojson        — couche GeoJSON (cache 24 h)
 *
 * Tous les endpoints sont publics (pas d'auth) pour permettre l'affichage
 * de la carte SIG dans les wizards P1/P2/P5 sans login. Les données servies
 * sont elles-mêmes publiques (PA homologués au sens loi 12-90).
 */
let SigController = class SigController {
    sig;
    constructor(sig) {
        this.sig = sig;
    }
    listSources() {
        return { ok: true, sources: this.sig.listSources() };
    }
    async getLayer(source, layerWithExt, res) {
        // layerWithExt = "28.geojson" — on retire le suffixe
        const layer = layerWithExt.replace(/\.geojson$/i, "");
        const data = await this.sig.getLayerGeoJson(source, layer);
        // Cache CDN agressif côté Railway / Cloudflare
        res.setHeader("Content-Type", "application/geo+json; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
        res.send(JSON.stringify(data));
    }
};
exports.SigController = SigController;
__decorate([
    (0, common_1.Get)("sources"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SigController.prototype, "listSources", null);
__decorate([
    (0, common_1.Get)(":source/:layerWithExt"),
    __param(0, (0, common_1.Param)("source")),
    __param(1, (0, common_1.Param)("layerWithExt")),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SigController.prototype, "getLayer", null);
exports.SigController = SigController = __decorate([
    (0, tome_at_1.Tome)("tome0"),
    (0, common_1.Controller)("api/sig"),
    __metadata("design:paramtypes", [sig_data_service_1.SigDataService])
], SigController);
