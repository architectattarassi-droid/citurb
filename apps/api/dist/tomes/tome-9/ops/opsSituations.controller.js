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
exports.OpsSituationsController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const roles_decorator_1 = require("../../tome-5/auth/roles.decorator");
const roles_guard_1 = require("../../tome-5/auth/roles.guard");
const opsSituations_service_1 = require("./opsSituations.service");
let OpsSituationsController = class OpsSituationsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async list(projectId) {
        return { ok: true, items: await this.svc.listByProject(projectId) };
    }
    async create(projectId, body) {
        return { ok: true, item: await this.svc.create(projectId, Number(body?.amountDeclared)) };
    }
    async validate(id, body) {
        const patch = {};
        for (const k of ["architectOk", "betOk", "controlOk", "topoOk"]) {
            if (typeof body?.[k] === "boolean")
                patch[k] = body[k];
        }
        return { ok: true, item: await this.svc.setValidation(id, patch) };
    }
    async pay(id) {
        return { ok: true, item: await this.svc.pay(id) };
    }
};
exports.OpsSituationsController = OpsSituationsController;
__decorate([
    (0, common_1.Get)("projects/:projectId/situations"),
    __param(0, (0, common_1.Param)("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OpsSituationsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)("projects/:projectId/situations"),
    __param(0, (0, common_1.Param)("projectId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OpsSituationsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)("situations/:id/validate"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OpsSituationsController.prototype, "validate", null);
__decorate([
    (0, common_1.Post)("situations/:id/pay"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OpsSituationsController.prototype, "pay", null);
exports.OpsSituationsController = OpsSituationsController = __decorate([
    (0, tome_at_1.Tome)('tome9'),
    (0, common_1.Controller)("ops"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("OPS", "OWNER", "ADMIN"),
    __metadata("design:paramtypes", [opsSituations_service_1.OpsSituationsService])
], OpsSituationsController);
