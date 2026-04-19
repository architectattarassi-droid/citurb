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
exports.P5Controller = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const tome_at_2 = require("../../tome-at");
const tome_at_3 = require("../../tome-at");
/**
 * P5 v1 — endpoints métier (contracts only)
 * Doctrine: endpoints stables, impl itérative.
 */
let P5Controller = class P5Controller {
    status() {
        return { ok: true, door: "p5", version: "v1" };
    }
    requestSignature(body) {
        return { ok: true, action: "signature_request", body, note: "stub v1" };
    }
};
exports.P5Controller = P5Controller;
__decorate([
    (0, tome_at_3.RequireCaps)("partner:sign"),
    (0, common_1.Get)("status"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], P5Controller.prototype, "status", null);
__decorate([
    (0, tome_at_3.RequireCaps)("partner:sign"),
    (0, common_1.Post)("signature/request"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], P5Controller.prototype, "requestSignature", null);
exports.P5Controller = P5Controller = __decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard, tome_at_2.CapsGuard),
    (0, tome_at_1.Tome)('tome6'),
    (0, common_1.Controller)("p5")
], P5Controller);
