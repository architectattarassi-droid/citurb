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
exports.CapsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const caps_decorator_1 = require("./caps.decorator");
/**
 * Minimal guard:
 * - relies on JwtAuthGuard having populated req.user
 * - checks that req.user.caps includes all required caps
 */
let CapsGuard = class CapsGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(ctx) {
        const reqCaps = this.reflector.getAllAndOverride(caps_decorator_1.REQ_CAPS_KEY, [ctx.getHandler(), ctx.getClass()]) || [];
        if (reqCaps.length === 0)
            return true;
        const req = ctx.switchToHttp().getRequest();
        const user = req.user;
        const userCaps = Array.isArray(user?.caps) ? user.caps : [];
        return reqCaps.every((c) => userCaps.includes(c));
    }
};
exports.CapsGuard = CapsGuard;
exports.CapsGuard = CapsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], CapsGuard);
