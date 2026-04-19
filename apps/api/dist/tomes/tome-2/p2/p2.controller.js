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
exports.P2Controller = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const tome_at_1 = require("../../tome-at");
const tome_at_2 = require("../../tome-at");
const tome_at_3 = require("../../tome-at");
const dossier_service_1 = require("./dossier.service");
const reminder_service_1 = require("./reminder.service");
const area_service_1 = require("./area/area.service");
const phase_engine_service_1 = require("../../../modules/phase-engine/phase-engine.service");
const messagerie_service_1 = require("../../../modules/messagerie/messagerie.service");
/**
 * P2 v1 — Dossier (persisted)
 * Contracts stable; fields will be hardened in later iterations.
 */
let P2Controller = class P2Controller {
    dossiers;
    areas;
    reminderService;
    phaseEngine;
    messagerie;
    constructor(dossiers, areas, reminderService, phaseEngine, messagerie) {
        this.dossiers = dossiers;
        this.areas = areas;
        this.reminderService = reminderService;
        this.phaseEngine = phaseEngine;
        this.messagerie = messagerie;
    }
    status() {
        return { ok: true, door: "p2", version: "v1" };
    }
    async list(req) {
        return { ok: true, items: await this.dossiers.list(req.user.userId) };
    }
    // ops/all MUST be declared before dossier/:id to avoid NestJS route shadowing
    async findAllForOps(req, firmId) {
        if (!["OWNER", "ADMIN", "OPS"].includes(req.user?.role)) {
            throw new common_1.ForbiddenException("Accès réservé aux rôles OPS/ADMIN/OWNER");
        }
        const resolvedFirmId = req.firmId || firmId || undefined;
        return this.dossiers.findAllForOps(resolvedFirmId);
    }
    async get(req, id) {
        return { ok: true, dossier: await this.dossiers.get(req.user.userId, id) };
    }
    async createDossier(req, body) {
        const dossier = await this.dossiers.create(req.user.userId, body);
        return { ok: true, dossier };
    }
    async submitDossier(req, body) {
        const dossierId = body?.dossierId;
        const dossier = await this.dossiers.submit(req.user.userId, String(dossierId || ""));
        // MIN1: ensure we have a fresh ESTIMATED snapshot after submit
        // (append-only; idempotent via inputsHash)
        try {
            await this.areas.estimate(req.user, dossier.id);
        }
        catch {
            // do not block submission if estimation fails in V1
        }
        return { ok: true, dossier };
    }
    async promote(req, id) {
        return this.dossiers.promote(id, req.user.userId);
    }
    async acceptDisclaimer(req, id) {
        return this.dossiers.acceptDisclaimer(id, req.user.userId, req.user.role);
    }
    async uploadDocument(req, id, docType, file) {
        if (!file)
            throw new Error("Fichier manquant");
        return this.dossiers.uploadDocument(id, req.user.userId, docType || "autre", file);
    }
    async listDocuments(id) {
        return this.dossiers.listDocuments(id);
    }
    async triggerReminders(req) {
        if (!['OWNER', 'ADMIN'].includes(req.user?.role)) {
            throw new common_1.ForbiddenException('Accès refusé');
        }
        return this.reminderService.triggerNow();
    }
    // Sprint S11 — Paiements (confirm/reject déclarés avant dossier/:id pour éviter conflit routing)
    async confirmPayment(req, paymentId) {
        if (!['OWNER', 'OPS', 'ADMIN'].includes(req.user?.role)) {
            throw new common_1.ForbiddenException('Accès refusé');
        }
        return this.dossiers.confirmPayment(paymentId, req.user.userId);
    }
    async rejectPayment(req, paymentId, body) {
        if (!['OWNER', 'OPS', 'ADMIN'].includes(req.user?.role)) {
            throw new common_1.ForbiddenException('Accès refusé');
        }
        return this.dossiers.rejectPayment(paymentId, req.user.userId, body?.notes);
    }
    async createPayment(id, body) {
        return this.dossiers.createPayment(id, body);
    }
    async listPayments(id) {
        return this.dossiers.listPayments(id);
    }
    // S14 — Jalons
    async initMilestones(projectId, req) {
        return this.dossiers.initProjectMilestones(projectId, req.user.userId);
    }
    async listMilestones(projectId) {
        return this.dossiers.listMilestones(projectId);
    }
    async advanceMilestone(projectId, phase, req) {
        if (!['OWNER', 'ADMIN', 'OPS'].includes(req.user?.role)) {
            throw new common_1.ForbiddenException('Accès refusé');
        }
        return this.dossiers.advanceMilestone(projectId, phase, req.user.userId);
    }
    async advancePhase(id, body, req) {
        return this.dossiers.advanceDossierPhase(id, body.toPhase, req.user.userId, body.note);
    }
    async getPhaseStatus(id) {
        return this.phaseEngine.getPhaseStatus(id);
    }
    async sendMessage(id, body, req) {
        return this.messagerie.sendMessage({ dossierId: id, ...body, expediteurId: req.user.userId, expediteurRole: req.user.role });
    }
    async getMessages(id, canal) {
        return this.messagerie.getMessages(id, canal);
    }
    async getForOps(id) {
        return this.dossiers.getForOps(id);
    }
    async getPhaseDetail(id, phase) {
        return this.dossiers.getPhaseDetail(id, phase);
    }
    async sendPhaseMessage(id, phase, body, req) {
        return this.messagerie.sendMessage({ dossierId: id, canal: body.canal ?? 'CLIENT_OPS', contenu: body.contenu, expediteurId: req.user.userId, expediteurRole: req.user.role, phaseRef: phase });
    }
    async phaseAction(id, phase, body, req) {
        return this.dossiers.handlePhaseAction(id, phase, body.action, req.user.userId, body.note);
    }
};
exports.P2Controller = P2Controller;
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:read"),
    (0, common_1.Get)("status"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], P2Controller.prototype, "status", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:read"),
    (0, common_1.Get)("dossier"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "list", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:read"),
    (0, common_1.Get)("dossier/ops/all"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('firmId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "findAllForOps", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:read"),
    (0, common_1.Get)("dossier/:id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "get", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:create"),
    (0, common_1.Post)("dossier/create"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "createDossier", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:submit"),
    (0, common_1.Post)("dossier/submit"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "submitDossier", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:create"),
    (0, common_1.Post)("dossier/:id/promote"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "promote", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:create"),
    (0, common_1.Post)("dossier/:id/disclaimer"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "acceptDisclaimer", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:create"),
    (0, common_1.Post)("dossier/:id/documents"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file", {
        dest: "./uploads/dossiers",
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Query)("docType")),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "uploadDocument", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:read"),
    (0, common_1.Get)("dossier/:id/documents"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "listDocuments", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Post)("admin/reminders/trigger"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "triggerReminders", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Post)("payment/:paymentId/confirm"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("paymentId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "confirmPayment", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Post)("payment/:paymentId/reject"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("paymentId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "rejectPayment", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:create"),
    (0, common_1.Post)("dossier/:id/payments"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "createPayment", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:read"),
    (0, common_1.Get)("dossier/:id/payments"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "listPayments", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Post)("project/:projectId/milestones/init"),
    __param(0, (0, common_1.Param)("projectId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "initMilestones", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Get)("project/:projectId/milestones"),
    __param(0, (0, common_1.Param)("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "listMilestones", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Post)("project/:projectId/milestones/:phase/advance"),
    __param(0, (0, common_1.Param)("projectId")),
    __param(1, (0, common_1.Param)("phase")),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "advanceMilestone", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Post)("dossier/:id/phase/advance"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "advancePhase", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Get)("dossier/:id/phase/status"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "getPhaseStatus", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Post)("dossier/:id/messages"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "sendMessage", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Get)("dossier/:id/messages"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)("canal")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "getMessages", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Get)("dossier/ops/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "getForOps", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Get)("dossier/:id/phase/:phase/detail"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("phase")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "getPhaseDetail", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Post)("dossier/:id/phase/:phase/message"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("phase")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "sendPhaseMessage", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Post)("dossier/:id/phase/:phase/action"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("phase")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], P2Controller.prototype, "phaseAction", null);
exports.P2Controller = P2Controller = __decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard, tome_at_2.CapsGuard),
    (0, tome_at_1.Tome)('tome2'),
    (0, common_1.Controller)("p2"),
    __metadata("design:paramtypes", [dossier_service_1.DossierService,
        area_service_1.AreaService,
        reminder_service_1.ReminderService,
        phase_engine_service_1.PhaseEngineService,
        messagerie_service_1.MessagerieService])
], P2Controller);
