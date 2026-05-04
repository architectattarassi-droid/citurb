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
exports.P4QuoteController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const pricing_service_1 = require("./pricing.service");
/**
 * P4 Quote — endpoints publics (sans auth) pour le devis.
 *  GET  /p4/packs   → liste 3 packs (BASIQUE / MOYEN / RENTABILITE)
 *  POST /p4/quote   → devis détaillé selon prix vente foncier
 */
let P4QuoteController = class P4QuoteController {
    pricing;
    constructor(pricing) {
        this.pricing = pricing;
    }
    packs() {
        return { ok: true, items: this.pricing.listPacks() };
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
exports.P4QuoteController = P4QuoteController;
__decorate([
    (0, common_1.Get)("packs"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], P4QuoteController.prototype, "packs", null);
__decorate([
    (0, common_1.Post)("quote"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], P4QuoteController.prototype, "quote", null);
exports.P4QuoteController = P4QuoteController = __decorate([
    (0, tome_at_1.Tome)("tome4"),
    (0, common_1.Controller)("p4"),
    __metadata("design:paramtypes", [pricing_service_1.P4PricingService])
], P4QuoteController);
