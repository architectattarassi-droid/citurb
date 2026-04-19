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
exports.P3Controller = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const tome_at_2 = require("../../tome-at");
const tome_at_3 = require("../../tome-at");
const state_machine_service_1 = require("../state-machine.service");
const dossier_service_1 = require("../../tome-2/p2/dossier.service");
/** Maps JWT role → ActorType for state machine enforcement. */
function roleToActorType(role) {
    if (role === "ADMIN")
        return "ADMIN";
    if (role === "OPS" || role === "OWNER")
        return "OPS";
    if (role === "OPERATOR")
        return "OPERATOR";
    return "CLIENT";
}
/**
 * P3 v2 — State machine endpoints
 * - Dossier status transitions (DRAFT → SUBMITTED → IN_REVIEW → APPROVED / NEEDS_CHANGES / REJECTED)
 * - Project state transitions (E0 → … → E12, EC_GEL)
 * - Freeze / Unfreeze
 */
let P3Controller = class P3Controller {
    sm;
    dossierService;
    constructor(sm, dossierService) {
        this.sm = sm;
        this.dossierService = dossierService;
    }
    status() {
        return { ok: true, door: "p3", version: "v2" };
    }
    // ── Dossier transitions ────────────────────────────────────────────────────
    async transitionDossier(req, dossierId, body) {
        const actor = { id: req.user.userId, type: roleToActorType(req.user.role) };
        const dossier = await this.sm.transitionDossier(dossierId, body.toStatus, req.user.userId, actor, req.user.role, body.note);
        // Auto-promote : si APPROVED et pas encore promu → crée le Project (non-bloquant)
        if (body.toStatus === 'APPROVED' && !dossier.projectId) {
            this.dossierService.promote(dossierId, dossier.ownerId).catch(() => { });
        }
        return { ok: true, dossier };
    }
    // ── Project transitions ────────────────────────────────────────────────────
    async transitionProject(req, projectId, body) {
        const actor = { id: req.user.userId, type: roleToActorType(req.user.role) };
        const project = await this.sm.transitionProject(projectId, body.toState, body.action, actor);
        return { ok: true, project };
    }
    async freeze(req, projectId, body) {
        const actor = { id: req.user.userId, type: roleToActorType(req.user.role) };
        const project = await this.sm.freezeProject(projectId, body.reason, body.origin, actor);
        return { ok: true, project };
    }
    async unfreeze(req, projectId, body) {
        const actor = { id: req.user.userId, type: roleToActorType(req.user.role) };
        const project = await this.sm.unfreezeProject(projectId, body.restoreToState, actor);
        return { ok: true, project };
    }
    async history(projectId) {
        const history = await this.sm.getProjectHistory(projectId);
        return { ok: true, history };
    }
    // ── Legacy stub ────────────────────────────────────────────────────────────
    predict(body) {
        return { ok: true, action: "predict", body, note: "stub v1" };
    }
};
exports.P3Controller = P3Controller;
__decorate([
    (0, tome_at_3.RequireCaps)("commission:predict"),
    (0, common_1.Get)("status"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], P3Controller.prototype, "status", null);
__decorate([
    (0, tome_at_3.RequireCaps)("dossier:submit"),
    (0, common_1.Post)("dossier/:id/transition"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], P3Controller.prototype, "transitionDossier", null);
__decorate([
    (0, tome_at_3.RequireCaps)("commission:predict"),
    (0, common_1.Post)("project/:id/transition"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], P3Controller.prototype, "transitionProject", null);
__decorate([
    (0, tome_at_3.RequireCaps)("commission:predict"),
    (0, common_1.Post)("project/:id/freeze"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], P3Controller.prototype, "freeze", null);
__decorate([
    (0, tome_at_3.RequireCaps)("commission:predict"),
    (0, common_1.Post)("project/:id/unfreeze"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], P3Controller.prototype, "unfreeze", null);
__decorate([
    (0, tome_at_3.RequireCaps)("commission:predict"),
    (0, common_1.Get)("project/:id/history"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], P3Controller.prototype, "history", null);
__decorate([
    (0, tome_at_3.RequireCaps)("commission:predict"),
    (0, common_1.Post)("commission/predict"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], P3Controller.prototype, "predict", null);
exports.P3Controller = P3Controller = __decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard, tome_at_2.CapsGuard),
    (0, tome_at_1.Tome)('tome3'),
    (0, common_1.Controller)("p3"),
    __metadata("design:paramtypes", [state_machine_service_1.DossierStateMachineService,
        dossier_service_1.DossierService])
], P3Controller);
