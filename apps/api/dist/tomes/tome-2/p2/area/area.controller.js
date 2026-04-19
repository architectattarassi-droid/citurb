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
exports.AreaController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../../tome-at");
const tome_at_2 = require("../../../tome-at");
const tome_at_3 = require("../../../tome-at");
const area_service_1 = require("./area.service");
let AreaController = class AreaController {
    areas;
    constructor(areas) {
        this.areas = areas;
    }
    // Read current area (owner or internal roles)
    async current(req, id) {
        const area = await this.areas.current(req.user, id);
        return { ok: true, area };
    }
    async history(req, id) {
        const items = await this.areas.history(req.user, id);
        return { ok: true, items };
    }
    // Client may declare a surface, but it never drives decisions
    async declare(req, id, body) {
        const valueM2 = Number(body?.valueM2);
        const row = await this.areas.declare(req.user, id, valueM2);
        return { ok: true, area: row };
    }
    // Estimated area from payload facts (internal/system)
    async estimate(req, id) {
        const row = await this.areas.estimate(req.user, id);
        return { ok: true, area: row };
    }
    // Verified (ADMIN/OWNER)
    async verify(req, id, body) {
        const valueM2 = Number(body?.valueM2);
        const sources = Array.isArray(body?.sources) ? body.sources : [];
        const row = await this.areas.verify(req.user, id, valueM2, sources);
        return { ok: true, area: row };
    }
    // Complexity based on VERIFIED or ESTIMATED only
    async complexity(req, id) {
        const res = await this.areas.complexity(req.user, id);
        return { ok: true, complexity: res };
    }
};
exports.AreaController = AreaController;
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:read"),
    (0, common_1.Get)("dossier/:id/area"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AreaController.prototype, "current", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:read"),
    (0, common_1.Get)("dossier/:id/area/history"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AreaController.prototype, "history", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:area:declare"),
    (0, common_1.Post)("dossier/:id/area/declare"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AreaController.prototype, "declare", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:area:estimate"),
    (0, common_1.Post)("dossier/:id/area/estimate"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AreaController.prototype, "estimate", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:area:verify"),
    (0, common_1.Post)("dossier/:id/area/verify"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AreaController.prototype, "verify", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:read"),
    (0, common_1.Get)("dossier/:id/complexity"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AreaController.prototype, "complexity", null);
exports.AreaController = AreaController = __decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard, tome_at_2.CapsGuard),
    (0, tome_at_1.Tome)('tome2'),
    (0, common_1.Controller)("p2"),
    __metadata("design:paramtypes", [area_service_1.AreaService])
], AreaController);
