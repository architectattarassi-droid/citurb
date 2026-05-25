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
exports.ProjectCalendarController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const project_calendar_service_1 = require("./project-calendar.service");
/**
 * ProjectCalendarController — endpoints REST pour le calendrier projet.
 *
 * Routes (prefix /api/project-calendar/:dossierId) :
 *   GET    /tasks                              → liste tâches
 *   POST   /tasks                              → créer tâche
 *   POST   /init-from-template?porte=P2        → seed depuis template
 *   PATCH  /tasks/:id                          → update + recalc CPM
 *   DELETE /tasks/:id                          → supprime + recalc
 *   GET    /critical-path                      → CPM
 *   GET    /gantt                              → payload Gantt
 *   POST   /replan-cascade?fromTaskId&deltaDays→ propagation retard
 *
 * IMPORTANT : ce préfixe `/api/project-calendar` doit être ajouté à la
 * MutationGate allow-list (cf. INTEGRATION.md).
 */
let ProjectCalendarController = class ProjectCalendarController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async listTasks(dossierId) {
        const tasks = await this.svc.listTasks(dossierId);
        return { ok: true, tasks };
    }
    async createTask(dossierId, body) {
        const task = await this.svc.createTask(dossierId, body);
        return { ok: true, task };
    }
    async initFromTemplate(dossierId, porte, body = {}) {
        return this.svc.initFromTemplate(dossierId, porte, body);
    }
    async patchTask(dossierId, id, body) {
        const task = await this.svc.patchTask(dossierId, id, body);
        return { ok: true, task };
    }
    async deleteTask(dossierId, id) {
        return this.svc.deleteTask(dossierId, id);
    }
    async criticalPath(dossierId) {
        const cpm = await this.svc.getCriticalPath(dossierId);
        return { ok: true, ...cpm };
    }
    async gantt(dossierId) {
        const payload = await this.svc.getGantt(dossierId);
        return { ok: true, ...payload };
    }
    async replanCascade(dossierId, fromTaskId, deltaDays) {
        const d = parseInt(deltaDays, 10);
        return this.svc.replanCascade(dossierId, fromTaskId, isNaN(d) ? 0 : d);
    }
};
exports.ProjectCalendarController = ProjectCalendarController;
__decorate([
    (0, common_1.Get)("tasks"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProjectCalendarController.prototype, "listTasks", null);
__decorate([
    (0, common_1.Post)("tasks"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectCalendarController.prototype, "createTask", null);
__decorate([
    (0, common_1.Post)("init-from-template"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Query)("porte")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectCalendarController.prototype, "initFromTemplate", null);
__decorate([
    (0, common_1.Patch)("tasks/:id"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectCalendarController.prototype, "patchTask", null);
__decorate([
    (0, common_1.Delete)("tasks/:id"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProjectCalendarController.prototype, "deleteTask", null);
__decorate([
    (0, common_1.Get)("critical-path"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProjectCalendarController.prototype, "criticalPath", null);
__decorate([
    (0, common_1.Get)("gantt"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProjectCalendarController.prototype, "gantt", null);
__decorate([
    (0, common_1.Post)("replan-cascade"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Query)("fromTaskId")),
    __param(2, (0, common_1.Query)("deltaDays")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ProjectCalendarController.prototype, "replanCascade", null);
exports.ProjectCalendarController = ProjectCalendarController = __decorate([
    (0, tome_at_1.Tome)("tome6"),
    (0, common_1.Controller)("api/project-calendar/:dossierId"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __metadata("design:paramtypes", [project_calendar_service_1.ProjectCalendarService])
], ProjectCalendarController);
