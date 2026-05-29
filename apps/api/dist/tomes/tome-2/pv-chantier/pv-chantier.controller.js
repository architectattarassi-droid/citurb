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
exports.PvChantierController = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs/promises");
const tome_at_1 = require("../../tome-at");
const jwt_auth_guard_1 = require("../../tome-5/auth/jwt-auth.guard");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const pv_chantier_renderer_1 = require("./pv-chantier.renderer");
const pv_chantier_service_1 = require("./pv-chantier.service");
const pv_compliance_service_1 = require("./pv-compliance.service");
/**
 * Tome 2 — PV de Chantier (Procès-Verbaux).
 *
 * Endpoints :
 *  - GET    /api/pv-chantier/dossier/:dossierId        liste
 *  - POST   /api/pv-chantier/dossier/:dossierId        create (auth)
 *  - GET    /api/pv-chantier/:pvId                     detail
 *  - PATCH  /api/pv-chantier/:pvId                     patch DRAFT (auth)
 *  - POST   /api/pv-chantier/:pvId/sign                add signature (auth)
 *  - POST   /api/pv-chantier/:pvId/finalize            finalize → FINAL + hash + log (auth)
 *  - POST   /api/pv-chantier/:pvId/photos              upload photo base64 (auth)
 *  - GET    /api/pv-chantier/:pvId/pdf                 HTML imprimable (Print → PDF)
 */
let PvChantierController = class PvChantierController {
    service;
    renderer;
    prisma;
    compliance;
    constructor(service, renderer, prisma, compliance) {
        this.service = service;
        this.renderer = renderer;
        this.prisma = prisma;
        this.compliance = compliance;
    }
    // ───────── Listes & lectures (publiques en GET)
    async list(dossierId) {
        const items = await this.service.list(dossierId);
        return { items, total: items.length };
    }
    // ───────── Cadence PV obligatoire (1 PV / 15 jours)
    async complianceStatus(dossierId) {
        return this.compliance.getStatus(dossierId);
    }
    async complianceScan() {
        return this.compliance.runScanNow();
    }
    async detail(pvId) {
        return this.service.get(pvId);
    }
    // ───────── Mutations (auth requise)
    async create(dossierId, body, req) {
        const authorId = req.user?.userId ?? req.user?.sub;
        return this.service.create(dossierId, authorId, body ?? {});
    }
    async patch(pvId, body, req) {
        const authorId = req.user?.userId ?? req.user?.sub;
        return this.service.patch(pvId, authorId, body ?? {});
    }
    async sign(pvId, body) {
        return this.service.addSignature(pvId, body);
    }
    async finalize(pvId) {
        const pv = await this.service.get(pvId);
        const dossier = await this.prisma.dossier.findUnique({
            where: { id: pv.dossierId },
            select: { title: true, commune: true },
        });
        const html = this.renderer.renderHtml(pv, {
            dossierTitle: dossier?.title ?? undefined,
            commune: dossier?.commune ?? undefined,
        });
        return this.service.finalize(pvId, html);
    }
    async uploadPhoto(pvId, body) {
        const pv = await this.service.get(pvId);
        return this.service.savePhoto({
            dossierId: pv.dossierId,
            pvId: pv.id,
            contentBase64: body?.contentBase64 ?? "",
            mimeType: body?.mimeType ?? "image/jpeg",
            filenameHint: body?.filenameHint,
        });
    }
    // ───────── Export HTML imprimable (sert de PDF source)
    async pdf(pvId, res) {
        const pv = await this.service.get(pvId);
        // Si finalisé, sert le snapshot stocké (immuable) ; sinon rendu live.
        if (pv.status === "FINAL" && pv.pdfUrl) {
            try {
                const abs = await this.service.resolveSnapshotPath(pvId);
                const html = await fs.readFile(abs, "utf8");
                res.send(html);
                return;
            }
            catch {
                // fallback rendu live
            }
        }
        const dossier = await this.prisma.dossier.findUnique({
            where: { id: pv.dossierId },
            select: { title: true, commune: true },
        });
        const html = this.renderer.renderHtml(pv, {
            dossierTitle: dossier?.title ?? undefined,
            commune: dossier?.commune ?? undefined,
        });
        res.send(html);
    }
};
exports.PvChantierController = PvChantierController;
__decorate([
    (0, common_1.Get)("dossier/:dossierId"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PvChantierController.prototype, "list", null);
__decorate([
    (0, common_1.Get)("compliance/:dossierId"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PvChantierController.prototype, "complianceStatus", null);
__decorate([
    (0, common_1.Post)("compliance/scan"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(200),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PvChantierController.prototype, "complianceScan", null);
__decorate([
    (0, common_1.Get)(":pvId"),
    __param(0, (0, common_1.Param)("pvId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PvChantierController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(201),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PvChantierController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(":pvId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("pvId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PvChantierController.prototype, "patch", null);
__decorate([
    (0, common_1.Post)(":pvId/sign"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("pvId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PvChantierController.prototype, "sign", null);
__decorate([
    (0, common_1.Post)(":pvId/finalize"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("pvId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PvChantierController.prototype, "finalize", null);
__decorate([
    (0, common_1.Post)(":pvId/photos"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("pvId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PvChantierController.prototype, "uploadPhoto", null);
__decorate([
    (0, common_1.Get)(":pvId/pdf"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("pvId")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PvChantierController.prototype, "pdf", null);
exports.PvChantierController = PvChantierController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("api/pv-chantier"),
    __metadata("design:paramtypes", [pv_chantier_service_1.PvChantierService,
        pv_chantier_renderer_1.PvChantierRenderer,
        prisma_service_1.PrismaService,
        pv_compliance_service_1.PvComplianceService])
], PvChantierController);
