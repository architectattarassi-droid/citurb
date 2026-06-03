import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { PvChantierService } from "../../tome-2/pv-chantier/pv-chantier.service";
import { PvComplianceService } from "../../tome-2/pv-chantier/pv-compliance.service";
import { cascadeReplan, computeCpm } from "./project-calendar.cpm";
import {
  ARCHI_PHASES,
  BE_LOTS,
  PV_CADENCE_MILESTONES,
  TOPO_TASKS,
} from "./prestations-referential";
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
 * UnifiedTimelineEvent — flux fusionné consommé par l'UI calendrier.
 *
 * Trois sources possibles :
 *  - TASK    : tâche ProjectCalendar (planning Gantt/CPM)
 *  - PV_PAST : PV chantier déjà déclaré (DRAFT / SIGNED_PARTIEL / FINAL)
 *  - PV_DUE  : prochaine échéance PV calculée par PvComplianceService
 *              (cadence T2-R-PV-CADENCE-001 : 1 PV / 15 jours)
 */
export type UnifiedTimelineEvent = {
  id: string;
  source: "TASK" | "PV_PAST" | "PV_DUE";
  dossierId: string;
  title: string;
  dateAt: string;        // ISO date (YYYY-MM-DD ou ISO complet)
  endAt?: string | null; // pour les tâches avec une durée
  status: string;
  phase?: string | null;
  isMilestone?: boolean;
  isCritical?: boolean;
  severity?: "INFO" | "WARNING" | "BLOCKED" | null; // pour PV_DUE
  payload?: Record<string, unknown>;
};

export type UnifiedTimelineResponse = {
  dossierId: string;
  generatedAt: string;
  counts: { tasks: number; pvPast: number; pvDue: number; total: number };
  events: UnifiedTimelineEvent[];
};

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly pvChantier: PvChantierService,
    private readonly pvCompliance: PvComplianceService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────
  // Timeline unifiée — fusion tasks ProjectCalendar + PV chantier + cadence
  // ─────────────────────────────────────────────────────────────────────

  /**
   * getUnifiedTimeline — agrège les sources de calendrier pour un dossier.
   *
   *   1. Tasks ProjectCalendar (existant : phases, jalons, lots BE, topo…)
   *   2. PV chantier passés (déclarés) — finalisés et brouillons
   *   3. Prochaine échéance PV (cadence 15j calculée par PvComplianceService) —
   *      ajoutée uniquement si le dossier a un chantier actif et un PV est
   *      attendu (statut WARNING ou BLOCKED, ou chantier sans aucun PV
   *      finalisé encore).
   *
   * Les événements sont triés chronologiquement (ascendant). Le payload
   * source est conservé sous `payload` pour drill-down UI.
   */
  async getUnifiedTimeline(dossierId: string): Promise<UnifiedTimelineResponse> {
    const events: UnifiedTimelineEvent[] = [];

    // ── 1) Tasks ProjectCalendar ────────────────────────────────────
    const state = await this.getState(dossierId);
    for (const t of state.tasks) {
      const start = t.startAt ?? null;
      if (!start) continue; // une tâche sans date ne va pas dans la timeline
      events.push({
        id: `task:${t.id}`,
        source: "TASK",
        dossierId,
        title: t.numero ? `${t.numero} ${t.titre}` : t.titre,
        dateAt: start,
        endAt: t.endAt ?? null,
        status: t.status,
        phase: t.phase,
        isMilestone: t.isMilestone,
        isCritical: t.isCritical,
        severity: null,
        payload: {
          taskId: t.id,
          parentId: t.parentId,
          durationDays: t.durationDays,
          progressPct: t.progressPct,
          predecessors: t.predecessors,
          resourceUserIds: t.resourceUserIds,
          resourceSupplierIds: t.resourceSupplierIds,
          blockers: t.blockers,
        },
      });
    }
    const taskCount = events.length;

    // ── 2) PV chantier passés (déclarés) ────────────────────────────
    let pvPastCount = 0;
    try {
      const pvList = await this.pvChantier.list(dossierId);
      for (const pv of pvList) {
        const dateAt = pv.date || pv.finalizedAt || pv.createdAt;
        if (!dateAt) continue;
        events.push({
          id: `pv:${pv.id}`,
          source: "PV_PAST",
          dossierId,
          title: `PV ${pv.numero} — ${pv.typeVisite}`,
          dateAt,
          endAt: null,
          status: pv.status,
          phase: "EXEC",
          isMilestone: true,
          isCritical: false,
          severity: pv.severiteMax === "BLOQUANT" ? "BLOCKED"
            : pv.severiteMax === "RESERVE" ? "WARNING"
            : pv.severiteMax === "AVIS" ? "WARNING"
            : "INFO",
          payload: {
            pvId: pv.id,
            numero: pv.numero,
            typeVisite: pv.typeVisite,
            observationsCount: pv.observationsCount,
            severiteMax: pv.severiteMax,
            finalizedAt: pv.finalizedAt,
          },
        });
        pvPastCount += 1;
      }
    } catch (e: any) {
      this.logger.warn(`[unified-timeline] PV list failed for ${dossierId}: ${e?.message}`);
    }

    // ── 3) Prochaine échéance PV (cadence 15j) ──────────────────────
    let pvDueCount = 0;
    try {
      const compliance = await this.pvCompliance.getStatus(dossierId);
      if (compliance.active && compliance.nextPvDueDate) {
        const severity =
          compliance.status === "BLOCKED" ? "BLOCKED"
          : compliance.status === "WARNING" ? "WARNING"
          : "INFO";
        const title =
          compliance.status === "BLOCKED"
            ? `PV en retard (chantier bloqué — ${compliance.daysSinceLastPv}j sans PV)`
            : compliance.status === "WARNING"
            ? `PV attendu sous ${Math.max(0, compliance.daysUntilDue)}j`
            : "Prochain PV de cadence";
        events.push({
          id: `pv-due:${dossierId}`,
          source: "PV_DUE",
          dossierId,
          title,
          dateAt: compliance.nextPvDueDate,
          endAt: null,
          status: compliance.status,
          phase: "EXEC",
          isMilestone: true,
          isCritical: compliance.status !== "OK",
          severity,
          payload: {
            intervalDays: compliance.intervalDays,
            lastPvDate: compliance.lastPvDate,
            lastPvId: compliance.lastPvId,
            daysSinceLastPv: compliance.daysSinceLastPv,
            daysUntilDue: compliance.daysUntilDue,
            blocked: compliance.blocked,
            blockedSince: compliance.blockedSince,
          },
        });
        pvDueCount = 1;
      }
    } catch (e: any) {
      this.logger.warn(`[unified-timeline] compliance failed for ${dossierId}: ${e?.message}`);
    }

    events.sort((a, b) => (a.dateAt || "").localeCompare(b.dateAt || ""));

    return {
      dossierId,
      generatedAt: new Date().toISOString(),
      counts: {
        tasks: taskCount,
        pvPast: pvPastCount,
        pvDue: pvDueCount,
        total: events.length,
      },
      events,
    };
  }

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
  // Initialisation depuis le référentiel prestations (front mirror)
  // ─────────────────────────────────────────────────────────────────────

  /**
   * initFromPrestations — seed un planning complet depuis le référentiel
   * `prestations-referential.ts` (miroir serveur de `apps/web/src/data/prestations.ts`).
   *
   * Structure générée :
   *   - 7 phases architecte en cascade (FS strict)
   *   - 3 tâches topographe (bornage en T0, axes avant fondations, métré post-chantier)
   *   - 3 lots BE en parallèle (lot_1 sur APD, lot_2 + lot_3 sur DCE)
   *   - 9 jalons PV cadence pendant le suivi chantier (phase EXEC), répartis
   *     régulièrement (cadence par défaut ~20j entre milestones)
   *
   * Toutes les tâches sont ensuite ordonnancées par le CPM standard
   * (cf. persist()).
   */
  async initFromPrestations(
    dossierId: string,
    options: {
      resetExisting?: boolean;
      projectStart?: string;
      /** Cadence en jours entre 2 jalons PV (défaut 20). */
      pvCadenceDays?: number;
    } = {},
  ): Promise<{ ok: true; createdCount: number; tasks: ProjectTask[] }> {
    const state = await this.getState(dossierId);
    if (state.tasks.length > 0 && !options.resetExisting) {
      throw new BadRequestException("Planning déjà initialisé (passer resetExisting=true)");
    }

    const tasks: ProjectTask[] = [];
    const now = () => new Date().toISOString();

    // ── 1) Phases architecte — en cascade FS ──────────────────────────
    const archiIds: Record<string, string> = {};
    let prevArchiId: string | null = null;
    let topIdx = 0;
    for (const ph of ARCHI_PHASES) {
      topIdx += 1;
      const id = this.genId();
      archiIds[ph.id] = id;
      tasks.push({
        id,
        dossierId,
        parentId: null,
        numero: `${topIdx}`,
        titre: ph.titre,
        description: ph.description ?? null,
        phase: ph.phase,
        durationDays: ph.durationDays,
        startAt: null,
        endAt: null,
        progressPct: 0,
        isMilestone: !!ph.isMilestone,
        isCritical: false,
        predecessors: prevArchiId ? [prevArchiId] : [],
        resourceUserIds: [],
        resourceSupplierIds: [],
        status: "PENDING",
        blockers: [],
        createdAt: now(),
        updatedAt: now(),
      });
      prevArchiId = id;
    }

    // ── 2) Topographe ────────────────────────────────────────────────
    // task_1 (bornage)         : aucun prédécesseur → T0, en parallèle de l'esquisse
    // task_2 (axes implant.)   : après phase 6 (CPS), avant phase 7 (chantier)
    // task_3 (métré post)      : après phase 7 (chantier)
    const topoIds: Record<string, string> = {};
    const topoMap: Array<{ ref: typeof TOPO_TASKS[number]; preds: string[]; numero: string }> = [
      { ref: TOPO_TASKS[0], preds: [], numero: `${++topIdx}` },
      { ref: TOPO_TASKS[1], preds: archiIds["archi.phase_6"] ? [archiIds["archi.phase_6"]] : [], numero: `${++topIdx}` },
      { ref: TOPO_TASKS[2], preds: archiIds["archi.phase_7"] ? [archiIds["archi.phase_7"]] : [], numero: `${++topIdx}` },
    ];
    for (const { ref, preds, numero } of topoMap) {
      const id = this.genId();
      topoIds[ref.id] = id;
      tasks.push({
        id,
        dossierId,
        parentId: null,
        numero,
        titre: ref.titre,
        description: ref.description ?? null,
        phase: ref.phase,
        durationDays: ref.durationDays,
        startAt: null,
        endAt: null,
        progressPct: 0,
        isMilestone: !!ref.isMilestone,
        isCritical: false,
        predecessors: preds,
        resourceUserIds: [],
        resourceSupplierIds: [],
        status: "PENDING",
        blockers: [],
        createdAt: now(),
        updatedAt: now(),
      });
    }

    // ── 3) BE — en parallèle APD (lot_1) et DCE (lot_2 + lot_3) ─────
    const beIds: Record<string, string> = {};
    const beMap: Array<{ ref: typeof BE_LOTS[number]; preds: string[]; numero: string }> = [
      { ref: BE_LOTS[0], preds: archiIds["archi.phase_3"] ? [archiIds["archi.phase_3"]] : [], numero: `${++topIdx}` },
      { ref: BE_LOTS[1], preds: archiIds["archi.phase_5"] ? [archiIds["archi.phase_5"]] : [], numero: `${++topIdx}` },
      { ref: BE_LOTS[2], preds: archiIds["archi.phase_5"] ? [archiIds["archi.phase_5"]] : [], numero: `${++topIdx}` },
    ];
    for (const { ref, preds, numero } of beMap) {
      const id = this.genId();
      beIds[ref.id] = id;
      tasks.push({
        id,
        dossierId,
        parentId: null,
        numero,
        titre: ref.titre,
        description: ref.description ?? null,
        phase: ref.phase,
        durationDays: ref.durationDays,
        startAt: null,
        endAt: null,
        progressPct: 0,
        isMilestone: !!ref.isMilestone,
        isCritical: false,
        predecessors: preds,
        resourceUserIds: [],
        resourceSupplierIds: [],
        status: "PENDING",
        blockers: [],
        createdAt: now(),
        updatedAt: now(),
      });
    }

    // ── 4) PV cadence — 9 jalons EXEC en parent du suivi chantier ───
    // On rattache chaque PV à la phase 7 (chantier) comme parent + 1er PV
    // suit la phase 7, les suivants chainent FS entre eux (séquence régulière).
    const chantierId = archiIds["archi.phase_7"] ?? null;
    let prevPvId: string | null = null;
    let pvIdx = 0;
    for (const pv of PV_CADENCE_MILESTONES) {
      pvIdx += 1;
      const id = this.genId();
      const preds = prevPvId ? [prevPvId] : chantierId ? [chantierId] : [];
      tasks.push({
        id,
        dossierId,
        parentId: chantierId,
        numero: chantierId ? `7.${pvIdx}` : `${++topIdx}`,
        titre: pv.titre,
        description: pv.description ?? null,
        phase: pv.phase,
        durationDays: pv.durationDays,
        startAt: null,
        endAt: null,
        progressPct: 0,
        isMilestone: true,
        isCritical: false,
        predecessors: preds,
        resourceUserIds: [],
        resourceSupplierIds: [],
        status: "PENDING",
        blockers: [{ type: "PV_CADENCE_SLOT", since: now(), payload: { pvId: pv.id, slotIndex: pvIdx } }],
        createdAt: now(),
        updatedAt: now(),
      });
      prevPvId = id;
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
