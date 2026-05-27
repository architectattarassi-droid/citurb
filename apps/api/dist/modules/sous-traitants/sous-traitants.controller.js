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
exports.SousTraitantsController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const sous_traitants_service_1 = require("./sous-traitants.service");
const types_1 = require("./types");
/**
 * Sous-Traitants — Controller (Tome 3 / P3).
 *
 * Mount: `/api/sous-traitants`
 *
 * Auth: JWT (Cercles user). Le contrôle fin (chef chantier / sous-traitant)
 * est délégué au service via le userId du token.
 */
let SousTraitantsController = class SousTraitantsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    /** GET /api/sous-traitants/catalog/lots — référentiel TPHI 1-25. */
    catalogLots() {
        return { ok: true, count: types_1.LOTS_TPHI.length, lots: types_1.LOTS_TPHI };
    }
    /** GET /api/sous-traitants/dossier/:dossierId — sous-traitants assignés. */
    async list(dossierId) {
        const items = await this.svc.listByDossier(dossierId);
        return { ok: true, count: items.length, items };
    }
    /** POST /api/sous-traitants/dossier/:dossierId/assign — assigne sous-traitant à un lot. */
    async assign(dossierId, body, req) {
        const a = await this.svc.assign(dossierId, body, req.user?.userId);
        return { ok: true, assignment: a };
    }
    /** GET /api/sous-traitants/:assignmentId — détail. */
    async getOne(assignmentId) {
        const { assignment } = await this.svc.getOne(assignmentId);
        return { ok: true, assignment };
    }
    /** POST /api/sous-traitants/:assignmentId/contrat — génère contrat loi 32-99. */
    async genContrat(id, req) {
        const out = await this.svc.generateContrat(id, req.user?.userId);
        return { ok: true, assignment: out.assignment, html: out.html };
    }
    /** POST /api/sous-traitants/:assignmentId/contrat/sign — signature électronique. */
    async signContrat(id, body, req) {
        const a = await this.svc.signContrat(id, body?.dataUrl, req.user?.userId);
        return { ok: true, assignment: a };
    }
    /** POST /api/sous-traitants/:assignmentId/situation — déclare situation travaux. */
    async declareSituation(id, body, req) {
        const s = await this.svc.declareSituation(id, body, req.user?.userId);
        return { ok: true, situation: s };
    }
    /** POST /api/sous-traitants/:assignmentId/situation/:sitId/valider — chef chantier valide + trigger paiement. */
    async validateSituation(id, sitId, req) {
        const out = await this.svc.validateSituation(id, sitId, req.user?.userId);
        return { ok: true, assignment: out.assignment, situation: out.situation };
    }
    /** POST /api/sous-traitants/:assignmentId/situation/:sitId/rejeter — rejet motivé. */
    async rejectSituation(id, sitId, body, req) {
        const a = await this.svc.rejectSituation(id, sitId, body?.motif ?? "", req.user?.userId);
        return { ok: true, assignment: a };
    }
    /** POST /api/sous-traitants/:assignmentId/evaluation — notation post-mission. */
    async evaluate(id, body, req) {
        const a = await this.svc.evaluate(id, body, req.user?.userId);
        return { ok: true, assignment: a };
    }
    /** GET /api/sous-traitants/:assignmentId/historique — timeline complète. */
    async historique(id) {
        const out = await this.svc.historique(id);
        return { ok: true, assignment: out.assignment, timeline: out.timeline };
    }
    /** GET /api/sous-traitants/dossier/:dossierId/audit-loi-32-99 — audit conformité. */
    async audit(dossierId) {
        const result = await this.svc.auditLoi32_99(dossierId);
        return { ok: true, audit: result };
    }
};
exports.SousTraitantsController = SousTraitantsController;
__decorate([
    (0, common_1.Get)("catalog/lots"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SousTraitantsController.prototype, "catalogLots", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SousTraitantsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/assign"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SousTraitantsController.prototype, "assign", null);
__decorate([
    (0, common_1.Get)(":assignmentId"),
    __param(0, (0, common_1.Param)("assignmentId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SousTraitantsController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(":assignmentId/contrat"),
    __param(0, (0, common_1.Param)("assignmentId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SousTraitantsController.prototype, "genContrat", null);
__decorate([
    (0, common_1.Post)(":assignmentId/contrat/sign"),
    __param(0, (0, common_1.Param)("assignmentId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SousTraitantsController.prototype, "signContrat", null);
__decorate([
    (0, common_1.Post)(":assignmentId/situation"),
    __param(0, (0, common_1.Param)("assignmentId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SousTraitantsController.prototype, "declareSituation", null);
__decorate([
    (0, common_1.Post)(":assignmentId/situation/:sitId/valider"),
    __param(0, (0, common_1.Param)("assignmentId")),
    __param(1, (0, common_1.Param)("sitId")),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SousTraitantsController.prototype, "validateSituation", null);
__decorate([
    (0, common_1.Post)(":assignmentId/situation/:sitId/rejeter"),
    __param(0, (0, common_1.Param)("assignmentId")),
    __param(1, (0, common_1.Param)("sitId")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], SousTraitantsController.prototype, "rejectSituation", null);
__decorate([
    (0, common_1.Post)(":assignmentId/evaluation"),
    __param(0, (0, common_1.Param)("assignmentId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SousTraitantsController.prototype, "evaluate", null);
__decorate([
    (0, common_1.Get)(":assignmentId/historique"),
    __param(0, (0, common_1.Param)("assignmentId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SousTraitantsController.prototype, "historique", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId/audit-loi-32-99"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SousTraitantsController.prototype, "audit", null);
exports.SousTraitantsController = SousTraitantsController = __decorate([
    (0, tome_at_1.Tome)("tome3"),
    (0, common_1.Controller)("api/sous-traitants"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __metadata("design:paramtypes", [sous_traitants_service_1.SousTraitantsService])
], SousTraitantsController);
