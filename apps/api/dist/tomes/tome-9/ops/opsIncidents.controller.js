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
exports.OpsIncidentsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const tome_at_1 = require("../../tome-at");
const tome_at_2 = require("../../tome-at");
const roles_decorator_1 = require("../../tome-5/auth/roles.decorator");
const roles_guard_1 = require("../../tome-5/auth/roles.guard");
let OpsIncidentsController = class OpsIncidentsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async byId(id) {
        const incident = await this.prisma.incident.findUnique({ where: { id } });
        return { incident };
    }
    async list() {
        const incidents = await this.prisma.incident.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
        });
        return { incidents };
    }
};
exports.OpsIncidentsController = OpsIncidentsController;
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OpsIncidentsController.prototype, "byId", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OpsIncidentsController.prototype, "list", null);
exports.OpsIncidentsController = OpsIncidentsController = __decorate([
    (0, tome_at_1.Tome)('tome9'),
    (0, common_1.Controller)("ops/incidents"),
    (0, common_1.UseGuards)(tome_at_2.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("OPS", "ADMIN", "OWNER"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OpsIncidentsController);
