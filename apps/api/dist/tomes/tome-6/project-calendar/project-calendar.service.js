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
var ProjectCalendarService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectCalendarService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const project_calendar_cpm_1 = require("./project-calendar.cpm");
/**
 * ProjectCalendarService — gestion des tâches projet par dossier.
 *
 * Storage MVP : `Dossier.payload.projectCalendar` (Prisma main schema).
 * Cf. INTEGRATION.md pour la migration vers un modèle Prisma dédié.
 *
 * Toutes les mutations recalculent automatiquement le CPM et tagguent
 * `isCritical` sur chaque tâche, plus mémorisent `lastCpm` pour les
 * lectures rapides.
 */
let ProjectCalendarService = ProjectCalendarService_1 = class ProjectCalendarService {
    prisma;
    logger = new common_1.Logger(ProjectCalendarService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    // ─────────────────────────────────────────────────────────────────────
    // Lectures
    // ─────────────────────────────────────────────────────────────────────
    async getState(dossierId) {
        const dossier = await this.prisma.dossier.findUnique({
            where: { id: dossierId },
            select: { payload: true },
        });
        if (!dossier)
            throw new common_1.NotFoundException("Dossier inconnu");
        const payload = dossier.payload && typeof dossier.payload === "object" ? dossier.payload : {};
        const cal = payload.projectCalendar ?? {};
        return {
            tasks: Array.isArray(cal.tasks) ? cal.tasks : [],
            projectStart: cal.projectStart ?? null,
            lastCpm: cal.lastCpm,
            lastCpmAt: cal.lastCpmAt,
        };
    }
    async listTasks(dossierId) {
        return (await this.getState(dossierId)).tasks;
    }
    async getCriticalPath(dossierId) {
        const { tasks } = await this.getState(dossierId);
        return (0, project_calendar_cpm_1.computeCpm)(tasks);
    }
    async getGantt(dossierId) {
        const state = await this.getState(dossierId);
        return this.buildGantt(state);
    }
    // ─────────────────────────────────────────────────────────────────────
    // Mutations
    // ─────────────────────────────────────────────────────────────────────
    async createTask(dossierId, dto) {
        if (!dto.titre || !dto.phase || dto.durationDays == null) {
            throw new common_1.BadRequestException("titre, phase, durationDays requis");
        }
        const state = await this.getState(dossierId);
        const task = {
            id: this.genId(),
            dossierId,
            parentId: dto.parentId ?? null,
            numero: this.nextNumero(state.tasks, dto.parentId ?? null),
            titre: dto.titre.trim(),
            description: dto.description ?? null,
            phase: dto.phase,
            startAt: dto.startAt ?? null,
            endAt: null,
            durationDays: Math.max(0, Math.round(dto.durationDays)),
            progressPct: 0,
            isMilestone: !!dto.isMilestone,
            isCritical: false,
            predecessors: (dto.predecessors ?? []).filter((p) => state.tasks.some((t) => t.id === p)),
            resourceUserIds: dto.resourceUserIds ?? [],
            resourceSupplierIds: dto.resourceSupplierIds ?? [],
            status: dto.status ?? "PENDING",
            blockers: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const tasks = [...state.tasks, task];
        await this.persist(dossierId, { ...state, tasks });
        return task;
    }
    async patchTask(dossierId, taskId, patch) {
        const state = await this.getState(dossierId);
        const idx = state.tasks.findIndex((t) => t.id === taskId);
        if (idx < 0)
            throw new common_1.NotFoundException("Tâche inconnue");
        const cur = state.tasks[idx];
        // Refuse les références circulaires de prédécesseurs.
        const newPreds = patch.predecessors
            ? patch.predecessors.filter((p) => p !== taskId && state.tasks.some((t) => t.id === p))
            : cur.predecessors;
        const next = {
            ...cur,
            titre: patch.titre?.trim() ?? cur.titre,
            description: patch.description ?? cur.description,
            phase: patch.phase ?? cur.phase,
            durationDays: patch.durationDays != null ? Math.max(0, Math.round(patch.durationDays)) : cur.durationDays,
            startAt: patch.startAt !== undefined ? patch.startAt : cur.startAt,
            endAt: patch.endAt !== undefined ? patch.endAt : cur.endAt,
            progressPct: patch.progressPct != null ? Math.max(0, Math.min(100, patch.progressPct)) : cur.progressPct,
            isMilestone: patch.isMilestone != null ? !!patch.isMilestone : cur.isMilestone,
            predecessors: newPreds,
            resourceUserIds: patch.resourceUserIds ?? cur.resourceUserIds,
            resourceSupplierIds: patch.resourceSupplierIds ?? cur.resourceSupplierIds,
            status: patch.status ?? cur.status,
            blockers: patch.blockers ?? cur.blockers,
            parentId: patch.parentId !== undefined ? patch.parentId : cur.parentId,
            updatedAt: new Date().toISOString(),
        };
        const tasks = [...state.tasks];
        tasks[idx] = next;
        await this.persist(dossierId, { ...state, tasks });
        return next;
    }
    async deleteTask(dossierId, taskId) {
        const state = await this.getState(dossierId);
        const tasks = state.tasks
            .filter((t) => t.id !== taskId)
            .map((t) => t.predecessors.includes(taskId)
            ? { ...t, predecessors: t.predecessors.filter((p) => p !== taskId), updatedAt: new Date().toISOString() }
            : t);
        await this.persist(dossierId, { ...state, tasks });
        return { ok: true, deletedId: taskId };
    }
    async replanCascade(dossierId, fromTaskId, deltaDays) {
        const state = await this.getState(dossierId);
        const tasks = state.tasks.map((t) => ({ ...t }));
        const impacted = (0, project_calendar_cpm_1.cascadeReplan)(tasks, fromTaskId, deltaDays);
        await this.persist(dossierId, { ...state, tasks });
        return { ok: true, impacted };
    }
    // ─────────────────────────────────────────────────────────────────────
    // Initialisation depuis template
    // ─────────────────────────────────────────────────────────────────────
    async initFromTemplate(dossierId, porte, options = {}) {
        const state = await this.getState(dossierId);
        if (state.tasks.length > 0 && !options.resetExisting) {
            throw new common_1.BadRequestException("Planning déjà initialisé (passer resetExisting=true)");
        }
        const template = this.loadTemplate();
        const def = template[porte];
        if (!def || !Array.isArray(def.phases)) {
            throw new common_1.BadRequestException(`Template introuvable pour ${porte}`);
        }
        const tasks = [];
        let phaseIdx = 0;
        let lastTaskIdPerPhase = {};
        let lastPhaseLastTaskId = null;
        for (const ph of def.phases) {
            phaseIdx += 1;
            const phaseHeaderId = this.genId();
            const phaseHeader = {
                id: phaseHeaderId,
                dossierId,
                parentId: null,
                numero: `${phaseIdx}`,
                titre: ph.label,
                description: `Phase ${ph.phase}`,
                phase: ph.phase,
                durationDays: 0,
                startAt: null,
                endAt: null,
                progressPct: 0,
                isMilestone: true,
                isCritical: false,
                predecessors: lastPhaseLastTaskId ? [lastPhaseLastTaskId] : [],
                resourceUserIds: [],
                resourceSupplierIds: [],
                status: "PENDING",
                blockers: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            tasks.push(phaseHeader);
            let prevTaskId = null;
            let i = 0;
            for (const t of ph.tasks) {
                i += 1;
                const id = this.genId();
                tasks.push({
                    id,
                    dossierId,
                    parentId: phaseHeaderId,
                    numero: `${phaseIdx}.${i}`,
                    titre: t.titre,
                    description: t.description ?? null,
                    phase: ph.phase,
                    durationDays: Math.max(0, Math.round(t.durationDays ?? 1)),
                    startAt: null,
                    endAt: null,
                    progressPct: 0,
                    isMilestone: !!t.isMilestone,
                    isCritical: false,
                    predecessors: prevTaskId ? [prevTaskId] : lastPhaseLastTaskId ? [lastPhaseLastTaskId] : [],
                    resourceUserIds: [],
                    resourceSupplierIds: [],
                    status: "PENDING",
                    blockers: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
                prevTaskId = id;
            }
            lastTaskIdPerPhase[ph.phase] = prevTaskId;
            lastPhaseLastTaskId = prevTaskId ?? phaseHeaderId;
        }
        const next = {
            ...state,
            tasks,
            projectStart: options.projectStart ?? state.projectStart ?? new Date().toISOString().slice(0, 10),
        };
        await this.persist(dossierId, next);
        return { ok: true, createdCount: tasks.length, tasks };
    }
    // ─────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────
    async persist(dossierId, state) {
        const cpm = (0, project_calendar_cpm_1.computeCpm)(state.tasks);
        const criticalSet = new Set(Object.keys(cpm.schedule).filter((k) => cpm.schedule[k].isCritical));
        // Réinjecte isCritical + dates dérivées (startAt/endAt absolus si projectStart connu).
        const projectStart = state.projectStart ?? new Date().toISOString().slice(0, 10);
        const t0 = new Date(projectStart + "T00:00:00.000Z").getTime();
        const dayMs = 86_400_000;
        const tasks = state.tasks.map((t) => {
            const sched = cpm.schedule[t.id];
            const startDay = sched?.earliestStart ?? 0;
            const endDay = sched?.earliestFinish ?? startDay + (t.durationDays || 0);
            return {
                ...t,
                isCritical: criticalSet.has(t.id),
                startAt: t.startAt ?? new Date(t0 + startDay * dayMs).toISOString().slice(0, 10),
                endAt: t.endAt ?? new Date(t0 + endDay * dayMs).toISOString().slice(0, 10),
            };
        });
        const dossier = await this.prisma.dossier.findUnique({
            where: { id: dossierId },
            select: { payload: true },
        });
        if (!dossier)
            throw new common_1.NotFoundException("Dossier inconnu");
        const payload = dossier.payload && typeof dossier.payload === "object" ? dossier.payload : {};
        payload.projectCalendar = {
            tasks,
            projectStart,
            lastCpm: cpm,
            lastCpmAt: new Date().toISOString(),
        };
        await this.prisma.dossier.update({
            where: { id: dossierId },
            data: { payload },
        });
    }
    buildGantt(state) {
        if (state.tasks.length === 0) {
            return { projectStart: null, projectEnd: null, projectDuration: 0, bars: [], phases: [] };
        }
        const cpm = state.lastCpm ?? (0, project_calendar_cpm_1.computeCpm)(state.tasks);
        const bars = state.tasks.map((t) => {
            const s = cpm.schedule[t.id];
            const startDay = s?.earliestStart ?? 0;
            const endDay = s?.earliestFinish ?? startDay + (t.durationDays || 0);
            return {
                taskId: t.id,
                numero: t.numero,
                titre: t.titre,
                phase: t.phase,
                startDay,
                endDay,
                durationDays: t.durationDays,
                progressPct: t.progressPct,
                isCritical: s?.isCritical ?? false,
                isMilestone: t.isMilestone,
                status: t.status,
                predecessors: t.predecessors,
            };
        });
        const projectStart = state.projectStart ?? null;
        const projectDuration = cpm.projectDuration;
        let projectEnd = null;
        if (projectStart) {
            const t0 = new Date(projectStart + "T00:00:00.000Z").getTime();
            projectEnd = new Date(t0 + projectDuration * 86_400_000).toISOString().slice(0, 10);
        }
        const phaseMap = new Map();
        for (const b of bars) {
            const prev = phaseMap.get(b.phase);
            if (!prev) {
                phaseMap.set(b.phase, { startDay: b.startDay, endDay: b.endDay, count: 1 });
            }
            else {
                prev.startDay = Math.min(prev.startDay, b.startDay);
                prev.endDay = Math.max(prev.endDay, b.endDay);
                prev.count += 1;
            }
        }
        const phases = Array.from(phaseMap.entries())
            .map(([phase, v]) => ({ phase, ...v }))
            .sort((a, b) => a.startDay - b.startDay);
        return { projectStart, projectEnd, projectDuration, bars, phases };
    }
    nextNumero(tasks, parentId) {
        if (!parentId) {
            const tops = tasks.filter((t) => !t.parentId).length;
            return `${tops + 1}`;
        }
        const parent = tasks.find((t) => t.id === parentId);
        if (!parent)
            return `${tasks.length + 1}`;
        const siblings = tasks.filter((t) => t.parentId === parentId).length;
        return `${parent.numero}.${siblings + 1}`;
    }
    genId() {
        // ID court-stable, suffisant pour MVP (UUID v4 simplifié).
        return ("tk_" +
            Math.random().toString(36).slice(2, 10) +
            Date.now().toString(36).slice(-4));
    }
    templateCache = null;
    loadTemplate() {
        if (this.templateCache)
            return this.templateCache;
        // Résout le template depuis `apps/api/data/project-templates/phases-standard.json`.
        const candidates = [
            path.resolve(__dirname, "../../../../data/project-templates/phases-standard.json"),
            path.resolve(process.cwd(), "apps/api/data/project-templates/phases-standard.json"),
            path.resolve(process.cwd(), "data/project-templates/phases-standard.json"),
        ];
        for (const p of candidates) {
            try {
                if (fs.existsSync(p)) {
                    this.templateCache = JSON.parse(fs.readFileSync(p, "utf8"));
                    return this.templateCache;
                }
            }
            catch {
                // ignore
            }
        }
        this.logger.warn("phases-standard.json introuvable — template vide");
        this.templateCache = {};
        return this.templateCache;
    }
};
exports.ProjectCalendarService = ProjectCalendarService;
exports.ProjectCalendarService = ProjectCalendarService = ProjectCalendarService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProjectCalendarService);
