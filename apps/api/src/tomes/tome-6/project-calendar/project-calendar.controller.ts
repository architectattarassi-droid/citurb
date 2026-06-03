import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard, Tome } from "../../tome-at";
import { ProjectCalendarService } from "./project-calendar.service";
import type { CreateTaskDto, PatchTaskDto } from "./project-calendar.types";

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
@Tome("tome6")
@Controller("api/project-calendar/:dossierId")
@UseGuards(JwtAuthGuard)
export class ProjectCalendarController {
  constructor(private readonly svc: ProjectCalendarService) {}

  @Get("tasks")
  async listTasks(@Param("dossierId") dossierId: string) {
    const tasks = await this.svc.listTasks(dossierId);
    return { ok: true, tasks };
  }

  /**
   * GET /api/project-calendar/:dossierId/unified-timeline
   *
   * Retourne le flux fusionné consommable par l'UI calendrier :
   *   - tasks ProjectCalendar (avec startAt/endAt résolus par le CPM)
   *   - PV chantier déjà déclarés (source PV_PAST)
   *   - prochaine échéance PV cadence 15j (source PV_DUE, si chantier actif)
   *
   * Réponse : `{ ok, dossierId, generatedAt, counts, events: [...] }`.
   * Événements triés chronologiquement (ascendant).
   */
  @Get("unified-timeline")
  async unifiedTimeline(@Param("dossierId") dossierId: string) {
    const timeline = await this.svc.getUnifiedTimeline(dossierId);
    return { ok: true, ...timeline };
  }

  @Post("tasks")
  async createTask(@Param("dossierId") dossierId: string, @Body() body: CreateTaskDto) {
    const task = await this.svc.createTask(dossierId, body);
    return { ok: true, task };
  }

  @Post("init-from-template")
  async initFromTemplate(
    @Param("dossierId") dossierId: string,
    @Query("porte") porte: "P2" | "P3" | "P4" | "P5",
    @Body() body: { resetExisting?: boolean; projectStart?: string } = {},
  ) {
    return this.svc.initFromTemplate(dossierId, porte, body);
  }

  /**
   * Seed le calendar à partir du référentiel `prestations-referential.ts`
   * (mirror de `apps/web/src/data/prestations.ts`) :
   *   - 7 phases architecte FS
   *   - 3 tâches topo (bornage T0 / axes / métré post-travaux)
   *   - 3 lots BE (béton armé sur APD, fluides + élec sur DCE)
   *   - 9 jalons PV cadence chantier (phase EXEC, isMilestone=true)
   */
  @Post("init-from-prestations")
  async initFromPrestations(
    @Param("dossierId") dossierId: string,
    @Body() body: { resetExisting?: boolean; projectStart?: string; pvCadenceDays?: number } = {},
  ) {
    return this.svc.initFromPrestations(dossierId, body);
  }

  @Patch("tasks/:id")
  async patchTask(
    @Param("dossierId") dossierId: string,
    @Param("id") id: string,
    @Body() body: PatchTaskDto,
  ) {
    const task = await this.svc.patchTask(dossierId, id, body);
    return { ok: true, task };
  }

  @Delete("tasks/:id")
  async deleteTask(@Param("dossierId") dossierId: string, @Param("id") id: string) {
    return this.svc.deleteTask(dossierId, id);
  }

  @Get("critical-path")
  async criticalPath(@Param("dossierId") dossierId: string) {
    const cpm = await this.svc.getCriticalPath(dossierId);
    return { ok: true, ...cpm };
  }

  @Get("gantt")
  async gantt(@Param("dossierId") dossierId: string) {
    const payload = await this.svc.getGantt(dossierId);
    return { ok: true, ...payload };
  }

  @Post("replan-cascade")
  async replanCascade(
    @Param("dossierId") dossierId: string,
    @Query("fromTaskId") fromTaskId: string,
    @Query("deltaDays") deltaDays: string,
  ) {
    const d = parseInt(deltaDays, 10);
    return this.svc.replanCascade(dossierId, fromTaskId, isNaN(d) ? 0 : d);
  }
}
