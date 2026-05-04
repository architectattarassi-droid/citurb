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
exports.QuoteController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const pricing_service_1 = require("./pricing.service");
/**
 * QuoteController — Devis publique P2 (sans auth, comme P1 packs/quote)
 *
 * Endpoints:
 *  - GET  /p2/categories?section=IMM|GR|EPIG|AMG  → liste catégories du barème
 *  - POST /p2/quote                                → calcul honoraires
 */
let QuoteController = class QuoteController {
    pricing;
    constructor(pricing) {
        this.pricing = pricing;
    }
    categories(section) {
        if (!section || !["IMM", "GR", "LOT", "EPIG", "AMG"].includes(section)) {
            return { ok: false, error: "section invalide (IMM|GR|LOT|EPIG|AMG)" };
        }
        return { ok: true, section, items: this.pricing.listCategories(section) };
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
exports.QuoteController = QuoteController;
__decorate([
    (0, common_1.Get)("categories"),
    __param(0, (0, common_1.Query)("section")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QuoteController.prototype, "categories", null);
__decorate([
    (0, common_1.Post)("quote"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QuoteController.prototype, "quote", null);
exports.QuoteController = QuoteController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("p2"),
    __metadata("design:paramtypes", [pricing_service_1.P2PricingService])
], QuoteController);
