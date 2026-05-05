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
exports.AntiDesintController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("./../tome-at");
const jwt_auth_guard_1 = require("../tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../tome-5/auth/roles.guard");
const roles_decorator_1 = require("../tome-5/auth/roles.decorator");
const prisma_service_1 = require("../tome-at/kernel/prisma/prisma.service");
const anti_desint_service_1 = require("./anti-desint.service");
/**
 * Endpoints admin pour anti-désintermédiation:
 *  POST /api/cc/anti-desint/scan         → scan ad-hoc (depuis date donnée ou X jours)
 *  GET  /api/cc/anti-desint/dossier/:id  → liste flags d'un dossier
 *  GET  /api/cc/anti-desint/dossiers     → tous les dossiers ayant ≥1 flag (recap)
 */
let AntiDesintController = class AntiDesintController {
    svc;
    prisma;
    constructor(svc, prisma) {
        this.svc = svc;
        this.prisma = prisma;
    }
    async scan(body) {
        const days = body.days ?? 1;
        const sinceDate = body.since ? new Date(body.since) : new Date(Date.now() - days * 24 * 3600 * 1000);
        const stats = await this.svc.scanSince(sinceDate);
        return { ok: true, stats };
    }
    async dossier(id) {
        const d = await this.prisma.dossier.findUnique({
            where: { id },
            select: { id: true, title: true, clientNom: true, payload: true },
        });
        if (!d)
            return { ok: false, error: "dossier not found" };
        const flags = (d.payload?.antiDesintFlags) || [];
        return { ok: true, dossierId: d.id, title: d.title, clientNom: d.clientNom, flagsCount: flags.length, flags };
    }
    async dossiers(take) {
        const t = Math.min(Number(take ?? 50), 200);
        const items = await this.prisma.dossier.findMany({
            orderBy: { updatedAt: "desc" },
            take: t * 5, // sur-fetch puis filtrer côté code
            select: {
                id: true, title: true, commune: true,
                clientNom: true, raisonSociale: true,
                porteType: true, payload: true, updatedAt: true,
            },
        });
        const filtered = items
            .map(d => {
            const flags = (d.payload?.antiDesintFlags) || [];
            return {
                dossier: { id: d.id, title: d.title, clientNom: d.clientNom, raisonSociale: d.raisonSociale, porteType: d.porteType, commune: d.commune, updatedAt: d.updatedAt },
                flagsCount: flags.length,
                recentFlags: flags.slice(-5),
            };
        })
            .filter(x => x.flagsCount > 0)
            .slice(0, t);
        return { ok: true, items: filtered };
    }
};
exports.AntiDesintController = AntiDesintController;
__decorate([
    (0, common_1.Post)("scan"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AntiDesintController.prototype, "scan", null);
__decorate([
    (0, common_1.Get)("dossier/:id"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AntiDesintController.prototype, "dossier", null);
__decorate([
    (0, common_1.Get)("dossiers"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Query)("take")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AntiDesintController.prototype, "dossiers", null);
exports.AntiDesintController = AntiDesintController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("api/cc/anti-desint"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [anti_desint_service_1.AntiDesintService,
        prisma_service_1.PrismaService])
], AntiDesintController);
