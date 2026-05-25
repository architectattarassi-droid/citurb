import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { cascadeReplan, computeCpm } from "./project-calendar.cpm";
import type {
  CpmResult,
  CreateTaskDto,
  GanttBar,
  GanttPayload,
  PatchTaskDto,
  ProjectCalendarState,
  ProjectPhase,
  ProjectTask,
} from "./project-calendar.types";

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
@Injectable()
export class ProjectCalendarService {
  private readonly logger = new Logger(ProjectCalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────
  // Lectures
  // ─────────────────────────────────────────────────────────────────────

  async getState(dossierId: string): Promise<ProjectCalendarState> {
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { payload: true },
    });
    if (!dossier) throw new NotFoundException("Dossier inconnu");
    const payload: any = dossier.payload && typeof dossier.payload === "object" ? dossier.payload : {};
    const cal = payload.projectCalendar ?? {};
    return {
      tasks: Array.isArray(cal.tasks) ? cal.tasks : [],
      projectStart: cal.projectStart ?? null,
      lastCpm: cal.lastCpm,
      lastCpmAt: cal.lastCpmAt,
    };
  }

  async listTasks(dossierId: string): Promise<ProjectTask[]> {
    return (await this.getState(dossierId)).tasks;
  }

  async getCriticalPath(dossierId: string): Promise<CpmResult> {
    const { tasks } = await this.getState(dossierId);
    return computeCpm(tasks);
  }

  async getGantt(dossierId: string): Promise<GanttPayload> {
    const state = await this.getState(dossierId);
    return this.buildGantt(state);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────

  async createTask(dossierId: string, dto: CreateTaskDto): Promise<ProjectTask> {
    if (!dto.titre || !dto.phase || dto.durationDays == null) {
      throw new BadRequestException("titre, phase, durationDays requis");
    }
    const state = await this.getState(dossierId);

    const task: ProjectTask = {
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

  async patchTask(dossierId: string, taskId: string, patch: PatchTaskDto): Promise<ProjectTask> {
    const state = await this.getState(dossierId);
    const idx = state.tasks.findIndex((t) => t.id === taskId);
    if (idx < 0) throw new NotFoundException("Tâche inconnue");
    const cur = state.tasks[idx];

    // Refuse les références circulaires de prédécesseurs.
    const newPreds = patch.predecessors
      ? patch.predecessors.filter((p) => p !== taskId && state.tasks.some((t) => t.id === p))
      : cur.predecessors;

    const next: ProjectTask = {
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

  async deleteTask(dossierId: string, taskId: string): Promise<{ ok: true; deletedId: string }> {
    const state = await this.getState(dossierId);
    const tasks = state.tasks
      .filter((t) => t.id !== taskId)
      .map((t) =>
        t.predecessors.includes(taskId)
          ? { ...t, predecessors: t.predecessors.filter((p) => p !== taskId), updatedAt: new Date().toISOString() }
          : t,
      );
    await this.persist(dossierId, { ...state, tasks });
    return { ok: true, deletedId: taskId };
  }

  async replanCascade(
    dossierId: string,
    fromTaskId: string,
    deltaDays: number,
  ): Promise<{ ok: true; impacted: string[] }> {
    const state = await this.getState(dossierId);
    const tasks = state.tasks.map((t) => ({ ...t }));
    const impacted = cascadeReplan(tasks, fromTaskId, deltaDays);
    await this.persist(dossierId, { ...state, tasks });
    return { ok: true, impacted };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Initialisation depuis template
  // ─────────────────────────────────────────────────────────────────────

  async initFromTemplate(
    dossierId: string,
    porte: "P2" | "P3" | "P4" | "P5",
    options: { resetExisting?: boolean; projectStart?: string } = {},
  ): Promise<{ ok: true; createdCount: number; tasks: ProjectTask[] }> {
    const state = await this.getState(dossierId);
    if (state.tasks.length > 0 && !options.resetExisting) {
      throw new BadRequestException("Planning déjà initialisé (passer resetExisting=true)");
    }
    const template = this.loadTemplate();
    const def = (template as any)[porte];
    if (!def || !Array.isArray(def.phases)) {
      throw new BadRequestException(`Template introuvable pour ${porte}`);
    }

    const tasks: ProjectTask[] = [];
    let phaseIdx = 0;
    let lastTaskIdPerPhase: Record<string, string | null> = {};
    let lastPhaseLastTaskId: string | null = null;

    for (const ph of def.phases) {
      phaseIdx += 1;
      const phaseHeaderId = this.genId();
      const phaseHeader: ProjectTask = {
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

      let prevTaskId: string | null = null;
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

    const next: ProjectCalendarState = {
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

  private async persist(dossierId: string, state: ProjectCalendarState): Promise<void> {
    const cpm = computeCpm(state.tasks);
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
    if (!dossier) throw new NotFoundException("Dossier inconnu");
    const payload: any = dossier.payload && typeof dossier.payload === "object" ? dossier.payload : {};
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

  private buildGantt(state: ProjectCalendarState): GanttPayload {
    if (state.tasks.length === 0) {
      return { projectStart: null, projectEnd: null, projectDuration: 0, bars: [], phases: [] };
    }
    const cpm = state.lastCpm ?? computeCpm(state.tasks);
    const bars: GanttBar[] = state.tasks.map((t) => {
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
    let projectEnd: string | null = null;
    if (projectStart) {
      const t0 = new Date(projectStart + "T00:00:00.000Z").getTime();
      projectEnd = new Date(t0 + projectDuration * 86_400_000).toISOString().slice(0, 10);
    }
    const phaseMap = new Map<ProjectPhase, { startDay: number; endDay: number; count: number }>();
    for (const b of bars) {
      const prev = phaseMap.get(b.phase);
      if (!prev) {
        phaseMap.set(b.phase, { startDay: b.startDay, endDay: b.endDay, count: 1 });
      } else {
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

  private nextNumero(tasks: ProjectTask[], parentId: string | null): string {
    if (!parentId) {
      const tops = tasks.filter((t) => !t.parentId).length;
      return `${tops + 1}`;
    }
    const parent = tasks.find((t) => t.id === parentId);
    if (!parent) return `${tasks.length + 1}`;
    const siblings = tasks.filter((t) => t.parentId === parentId).length;
    return `${parent.numero}.${siblings + 1}`;
  }

  private genId(): string {
    // ID court-stable, suffisant pour MVP (UUID v4 simplifié).
    return (
      "tk_" +
      Math.random().toString(36).slice(2, 10) +
      Date.now().toString(36).slice(-4)
    );
  }

  private templateCache: any = null;
  private loadTemplate(): any {
    if (this.templateCache) return this.templateCache;
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
      } catch {
        // ignore
      }
    }
    this.logger.warn("phases-standard.json introuvable — template vide");
    this.templateCache = {};
    return this.templateCache;
  }
}
