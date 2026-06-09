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
exports.PhaseEngineController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const phase_engine_service_1 = require("./phase-engine.service");
/**
 * PhaseEngineController — endpoint snapshot v7 (lecture seule).
 *
 * Route :
 *   GET /api/dossier/:dossierId/phases  (JWT, lecture seule)
 *
 * Doctrine :
 *  - Lecture seule → pas de MutationGate ; pas dans l'allow-list mutations.
 *  - L'utilisateur doit être propriétaire OU rôle ADMIN/OPS/OWNER/SUPER_ADMIN.
 *  - Calculé à la volée à partir du catalogue v7 + DossierPhaseRecord. Aucun write.
 *  - Indépendant du flag USE_V7_PHASES (v7 par nature, pas de fallback legacy
 *    sur le format de réponse).
 *
 * Métadonnée Tome 0 (gouvernance données / lecture transverse, comme
 * dossier-overview).
 */
let PhaseEngineController = class PhaseEngineController {
    engine;
    prisma;
    constructor(engine, prisma) {
        this.engine = engine;
        this.prisma = prisma;
    }
    async phases(dossierId, req) {
        // ── Autorisation : owner OU admin/ops/owner/super_admin
        const userId = req.user?.userId ?? req.user?.id ?? "";
        const role = req.user?.role ?? "CLIENT";
        const isAdmin = ["ADMIN", "SUPER_ADMIN", "OWNER", "OPS"].includes(role);
        const dossierOwn = await this.prisma.dossier.findUnique({
            where: { id: dossierId },
            select: { ownerId: true },
        });
        if (!dossierOwn)
            throw new common_1.NotFoundException(`Dossier ${dossierId} introuvable`);
        if (!isAdmin && dossierOwn.ownerId !== userId) {
            throw new common_1.ForbiddenException("Accès refusé sur ce dossier");
        }
        try {
            return await this.engine.getDossierPhasesSnapshot(dossierId);
        }
        catch (e) {
            // Service utilise des erreurs custom avec err.status (404/422/4xx) pour
            // ne pas dépendre de Nest dans la couche service. On les retraduit ici.
            if (e instanceof common_1.HttpException)
                throw e;
            if (e?.status === 404)
                throw new common_1.NotFoundException(e.message);
            if (e?.status === 422) {
                throw new common_1.UnprocessableEntityException({
                    message: e.message,
                    errors: e.details?.errors ?? [],
                });
            }
            throw e;
        }
    }
};
exports.PhaseEngineController = PhaseEngineController;
__decorate([
    (0, common_1.Get)("phases"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PhaseEngineController.prototype, "phases", null);
exports.PhaseEngineController = PhaseEngineController = __decorate([
    (0, tome_at_1.Tome)("tome0"),
    (0, common_1.Controller)("api/dossier/:dossierId"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __metadata("design:paramtypes", [phase_engine_service_1.PhaseEngineService,
        prisma_service_1.PrismaService])
], PhaseEngineController);
