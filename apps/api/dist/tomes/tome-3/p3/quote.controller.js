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
exports.P3QuoteController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const pricing_service_1 = require("./pricing.service");
const corps_metiers_1 = require("./corps-metiers");
/**
 * P3 Quote — endpoints publics (sans auth) pour le devis MOD.
 *  GET  /p3/corps-metiers           → liste des corps de métiers (groupés)
 *  GET  /p3/corps-metiers/count     → nombre total
 *  POST /p3/quote                    → devis P3 (10% du coût de réalisation)
 *
 * Note: pour le formulaire, on réutilise le /p2/categories et /p2/quote
 * pour récupérer les catégories CNOA (source de vérité unique).
 */
let P3QuoteController = class P3QuoteController {
    pricing;
    constructor(pricing) {
        this.pricing = pricing;
    }
    corpsMetiers(groupe) {
        if (groupe) {
            const filtered = corps_metiers_1.CORPS_METIERS.filter(c => c.groupe === groupe);
            return { ok: true, items: filtered };
        }
        return { ok: true, groupes: (0, corps_metiers_1.listCorpsMetiersGrouped)(), max: (0, corps_metiers_1.maxCorpsMetiers)() };
    }
    quote(input) {
        try {
            return this.pricing.computeQuote(input);
        }
        catch (e) {
            return { ok: false, error: e.message || "Erreur de calcul" };
        }
    }
};
exports.P3QuoteController = P3QuoteController;
__decorate([
    (0, common_1.Get)("corps-metiers"),
    __param(0, (0, common_1.Query)("groupe")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], P3QuoteController.prototype, "corpsMetiers", null);
__decorate([
    (0, common_1.Post)("quote"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], P3QuoteController.prototype, "quote", null);
exports.P3QuoteController = P3QuoteController = __decorate([
    (0, tome_at_1.Tome)("tome3"),
    (0, common_1.Controller)("p3"),
    __metadata("design:paramtypes", [pricing_service_1.P3PricingService])
], P3QuoteController);
