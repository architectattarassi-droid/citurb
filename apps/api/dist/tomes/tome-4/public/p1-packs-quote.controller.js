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
exports.P1PacksQuoteController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const p1_packs_quote_service_1 = require("./p1-packs-quote.service");
let P1PacksQuoteController = class P1PacksQuoteController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    /**
     * Quote pack/service amounts (no engine disclosure)
     */
    async quote(body) {
        const input = body?.input || body;
        return this.svc.quote({
            surfaceM2: Number(input?.surfaceM2 ?? 0),
            hasBasement: Boolean(input?.hasBasement),
            constructionLevel: String(input?.constructionLevel || "STANDING"),
            pack: String(input?.pack || "AVANCE"),
            addRemoteFollow: Boolean(input?.addRemoteFollow),
            betMode: String(input?.betMode || "PLATFORM"),
            modEnabled: Boolean(input?.modEnabled),
            decoEnabled: Boolean(input?.decoEnabled),
            mandateEntreprise: Boolean(input?.mandateEntreprise),
            blackBudgetMAD: input?.blackBudgetMAD != null ? Number(input.blackBudgetMAD) : null,
        });
    }
};
exports.P1PacksQuoteController = P1PacksQuoteController;
__decorate([
    (0, common_1.Post)("quote"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], P1PacksQuoteController.prototype, "quote", null);
exports.P1PacksQuoteController = P1PacksQuoteController = __decorate([
    (0, tome_at_1.Tome)('tome4'),
    (0, common_1.Controller)("p1/packs"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __metadata("design:paramtypes", [p1_packs_quote_service_1.P1PacksQuoteService])
], P1PacksQuoteController);
