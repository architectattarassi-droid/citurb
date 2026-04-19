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
exports.OpsDossiersController = void 0;
const common_1 = require("@nestjs/common");
const prisma_dossiers_service_1 = require("../../../tome-at/kernel/prisma-dossiers/prisma-dossiers.service");
const jwt_auth_guard_1 = require("../../../tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../../../tome-5/auth/roles.guard");
const roles_decorator_1 = require("../../../tome-5/auth/roles.decorator");
let OpsDossiersController = class OpsDossiersController {
    dossiers;
    constructor(dossiers) {
        this.dossiers = dossiers;
    }
    async list(projectType, regionCode, provinceCode, communeCode, lotissementRef, maitreOuvrageName, packCode, stepCode, status, q, take, skip) {
        const where = {};
        if (projectType)
            where.projectType = projectType;
        if (regionCode)
            where.regionCode = regionCode;
        if (provinceCode)
            where.provinceCode = provinceCode;
        if (communeCode)
            where.communeCode = communeCode;
        if (lotissementRef)
            where.lotissementRef = lotissementRef;
        if (maitreOuvrageName)
            where.maitreOuvrageName = { contains: maitreOuvrageName, mode: "insensitive" };
        if (packCode)
            where.packCode = packCode;
        if (stepCode)
            where.stepCode = stepCode;
        if (status)
            where.status = status;
        if (q) {
            where.OR = [
                { phone: { contains: q } },
                { email: { contains: q, mode: "insensitive" } },
                { maitreOuvrageName: { contains: q, mode: "insensitive" } },
                { lotissementRef: { contains: q, mode: "insensitive" } },
            ];
        }
        const takeN = Math.min(Math.max(parseInt(take || "50", 10), 1), 200);
        const skipN = Math.max(parseInt(skip || "0", 10), 0);
        const [items, total] = await Promise.all([
            this.dossiers.dossier.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: takeN,
                skip: skipN,
            }),
            this.dossiers.dossier.count({ where }),
        ]);
        return { total, take: takeN, skip: skipN, items };
    }
};
exports.OpsDossiersController = OpsDossiersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("projectType")),
    __param(1, (0, common_1.Query)("regionCode")),
    __param(2, (0, common_1.Query)("provinceCode")),
    __param(3, (0, common_1.Query)("communeCode")),
    __param(4, (0, common_1.Query)("lotissementRef")),
    __param(5, (0, common_1.Query)("maitreOuvrageName")),
    __param(6, (0, common_1.Query)("packCode")),
    __param(7, (0, common_1.Query)("stepCode")),
    __param(8, (0, common_1.Query)("status")),
    __param(9, (0, common_1.Query)("q")),
    __param(10, (0, common_1.Query)("take")),
    __param(11, (0, common_1.Query)("skip")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], OpsDossiersController.prototype, "list", null);
exports.OpsDossiersController = OpsDossiersController = __decorate([
    (0, common_1.Controller)("ops/dossiers"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("OWNER", "ADMIN"),
    __metadata("design:paramtypes", [prisma_dossiers_service_1.PrismaDossiersService])
], OpsDossiersController);
