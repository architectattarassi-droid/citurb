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
exports.P6ReviewController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const jwt_auth_guard_1 = require("../../tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../../tome-5/auth/roles.guard");
const roles_decorator_1 = require("../../tome-5/auth/roles.decorator");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const scoring_service_1 = require("./scoring.service");
const registry_1 = require("./registry");
/**
 * Endpoints admin pour review des fiches prestataires/fournisseurs P6.
 *
 *  GET    /api/cc/p6-review/pending             → liste fiches en attente de review
 *  GET    /api/cc/p6-review/:dossierId          → détail fiche + score recalculé
 *  PATCH  /api/cc/p6-review/:dossierId/verify   → marquer VERIFIED
 *  PATCH  /api/cc/p6-review/:dossierId/blacklist → marquer BLACKLISTED
 *  PATCH  /api/cc/p6-review/:dossierId/needs-docs → renvoyer demande docs
 */
let P6ReviewController = class P6ReviewController {
    prisma;
    scoring;
    constructor(prisma, scoring) {
        this.prisma = prisma;
        this.scoring = scoring;
    }
    async listPending(take) {
        const t = Math.min(Number(take ?? 50), 200);
        const items = await this.prisma.dossier.findMany({
            where: { porteType: "P6" },
            orderBy: { createdAt: "desc" },
            take: t * 5,
            select: {
                id: true, createdAt: true, updatedAt: true,
                title: true, commune: true,
                clientNom: true, clientEmail: true, clientTel: true,
                raisonSociale: true, payload: true,
            },
        });
        const filtered = items
            .map(d => {
            const validation = d.payload?.p6Validation;
            const status = validation?.status ?? "DRAFT";
            const brief = d.payload?.brief ?? {};
            const scoreSnapshot = brief?.scoreSnapshot;
            return {
                dossier: {
                    id: d.id, createdAt: d.createdAt, updatedAt: d.updatedAt,
                    title: d.title, commune: d.commune,
                    clientNom: d.clientNom, clientEmail: d.clientEmail, clientTel: d.clientTel,
                    raisonSociale: d.raisonSociale,
                },
                p6Type: brief?.p6Type,
                classeBTP: brief?.classeBTP,
                score: scoreSnapshot?.score,
                tier: scoreSnapshot?.tier,
                status,
                statusLabel: registry_1.P6_STATUS_LABELS[status]?.label ?? status,
            };
        })
            .filter(x => x.status === "DRAFT" || x.status === "PENDING_REVIEW" || x.status === "NEEDS_DOCS")
            .slice(0, t);
        return { ok: true, items: filtered, total: filtered.length };
    }
    async detail(id) {
        const d = await this.prisma.dossier.findUniqueOrThrow({
            where: { id },
            select: {
                id: true, createdAt: true, updatedAt: true,
                title: true, commune: true,
                clientNom: true, clientEmail: true, clientTel: true,
                raisonSociale: true, payload: true,
            },
        });
        const brief = d.payload?.brief ?? {};
        const validation = d.payload?.p6Validation;
        // Recalculer le score depuis brief (au cas où la doctrine de scoring a évolué)
        let recomputedScore = null;
        try {
            recomputedScore = this.scoring.computeScore({
                type: brief.p6Type,
                raisonSociale: d.raisonSociale ?? "",
                rc: brief.rc, ice: brief.ice,
                classeBTP: brief.classeBTP,
                categoriesAgrement: brief.categoriesAgrement,
                agrementMetleNumero: brief.agrementMetleNumero,
                agrementMetleValidite: brief.agrementMetleValidite,
                decennaleValide: brief.decennaleValide,
                rcProValide: brief.rcProValide,
                documents: brief.documents,
                nbReferences: brief.nbReferences,
                nbPhotosChantiers: brief.nbPhotosChantiers,
                ancienneteAnnees: brief.ancienneteAnnees,
                nbMateriauxCatalogue: brief.nbMateriauxCatalogue,
                zonesFourniture: typeof brief.zonesFourniture === "string"
                    ? brief.zonesFourniture.split(",").map((s) => s.trim())
                    : (brief.zonesFourniture ?? []),
            });
        }
        catch (e) {
            // Snapshot brief incomplet — on retourne ce qu'on a
        }
        return {
            ok: true,
            dossier: d,
            brief,
            validation: validation ?? { status: "DRAFT", history: [] },
            recomputedScore,
        };
    }
    async verify(id, body, req) {
        return this.transition(id, "VERIFIED", req, body.note, { expiresInDays: body.expiresInDays });
    }
    async blacklist(id, body, req) {
        if (!body.reason?.trim())
            throw new Error("Motif blacklist requis");
        return this.transition(id, "BLACKLISTED", req, body.reason);
    }
    async needsDocs(id, body, req) {
        return this.transition(id, "NEEDS_DOCS", req, body.note, { docsToProvide: body.docsToProvide });
    }
    async transition(dossierId, newStatus, req, note, extra = {}) {
        const dossier = await this.prisma.dossier.findUniqueOrThrow({
            where: { id: dossierId },
            select: { payload: true },
        });
        const payload = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
        const prev = payload.p6Validation ?? { status: "DRAFT", history: [] };
        const now = new Date().toISOString();
        const author = req.user?.email || req.user?.userId || "admin";
        const next = {
            ...prev,
            status: newStatus,
            reviewedAt: now,
            reviewedBy: author,
            reviewNote: note,
        };
        if (newStatus === "VERIFIED" && extra.expiresInDays) {
            const expiresAt = new Date(Date.now() + extra.expiresInDays * 24 * 3600 * 1000).toISOString();
            next.expiresAt = expiresAt;
        }
        if (newStatus === "NEEDS_DOCS" && extra.docsToProvide) {
            next.docsToProvide = extra.docsToProvide;
        }
        next.history = [...(prev.history ?? []), { ts: now, status: newStatus, author, note }];
        payload.p6Validation = next;
        await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload } });
        return { ok: true, validation: next };
    }
};
exports.P6ReviewController = P6ReviewController;
__decorate([
    (0, common_1.Get)("pending"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Query)("take")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], P6ReviewController.prototype, "listPending", null);
__decorate([
    (0, common_1.Get)(":dossierId"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], P6ReviewController.prototype, "detail", null);
__decorate([
    (0, common_1.Patch)(":dossierId/verify"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], P6ReviewController.prototype, "verify", null);
__decorate([
    (0, common_1.Patch)(":dossierId/blacklist"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], P6ReviewController.prototype, "blacklist", null);
__decorate([
    (0, common_1.Patch)(":dossierId/needs-docs"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], P6ReviewController.prototype, "needsDocs", null);
exports.P6ReviewController = P6ReviewController = __decorate([
    (0, tome_at_1.Tome)("tome7"),
    (0, common_1.Controller)("api/cc/p6-review"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        scoring_service_1.P6ScoringService])
], P6ReviewController);
