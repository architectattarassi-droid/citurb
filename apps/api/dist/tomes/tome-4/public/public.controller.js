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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicController = void 0;
const common_1 = require("@nestjs/common");
const p1_catalog_1 = require("../../tome-2/doors/p1.catalog");
const p1_tunnel_1 = require("../../tome-3/tunnels/p1.tunnel");
const tome_at_1 = require("../../tome-at");
/**
 * Tome 4 — Wiring
 * Public read-only endpoints (no mutations)
 *
 * Doctrine: the front office may read catalogs/tunnels as configuration,
 * but can never infer entitlements or transitions. Actual allowed_actions must
 * come from state endpoint (Tome @/Tome 3).
 */
let PublicController = class PublicController {
    getP1Catalog() {
        return {
            version: p1_catalog_1.P1_CATALOG_VERSION,
            offers: p1_catalog_1.P1_OFFERS,
            upsells: p1_catalog_1.P1_UPSELLS,
        };
    }
    getP1Tunnel() {
        return {
            version: p1_tunnel_1.P1_TUNNEL_VERSION,
            phases: p1_tunnel_1.P1_PHASES,
        };
    }
};
exports.PublicController = PublicController;
__decorate([
    (0, common_1.Get)("catalog/p1"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getP1Catalog", null);
__decorate([
    (0, common_1.Get)("tunnel/p1"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getP1Tunnel", null);
exports.PublicController = PublicController = __decorate([
    (0, tome_at_1.Tome)('tome4'),
    (0, common_1.Controller)("public")
], PublicController);
