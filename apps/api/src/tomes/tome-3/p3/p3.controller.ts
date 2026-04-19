import { Controller, Get, Post, Body, Param, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard, Tome } from "../../tome-at";
import { CapsGuard } from "../../tome-at";
import { RequireCaps } from "../../tome-at";
import { DossierStateMachineService } from "../state-machine.service";
import { DossierService } from "../../tome-2/p2/dossier.service";
import type { ActorType } from "@prisma/client";

/** Maps JWT role → ActorType for state machine enforcement. */
function roleToActorType(role: string | undefined): ActorType {
  if (role === "ADMIN") return "ADMIN";
  if (role === "OPS" || role === "OWNER") return "OPS";
  if (role === "OPERATOR") return "OPERATOR";
  return "CLIENT";
}

/**
 * P3 v2 — State machine endpoints
 * - Dossier status transitions (DRAFT → SUBMITTED → IN_REVIEW → APPROVED / NEEDS_CHANGES / REJECTED)
 * - Project state transitions (E0 → … → E12, EC_GEL)
 * - Freeze / Unfreeze
 */
@UseGuards(JwtAuthGuard, CapsGuard)
@Tome('tome3')
@Controller("p3")
export class P3Controller {
  constructor(
    private readonly sm: DossierStateMachineService,
    private readonly dossierService: DossierService,
  ) {}

  @RequireCaps("commission:predict")
  @Get("status")
  status() {
    return { ok: true, door: "p3", version: "v2" };
  }

  // ── Dossier transitions ────────────────────────────────────────────────────

  @RequireCaps("dossier:submit")
  @Post("dossier/:id/transition")
  async transitionDossier(
    @Req() req: any,
    @Param("id") dossierId: string,
    @Body() body: { toStatus: string; note?: string },
  ) {
    const actor = { id: req.user.userId, type: roleToActorType(req.user.role) };
    const dossier = await this.sm.transitionDossier(
      dossierId,
      body.toStatus as any,
      req.user.userId,
      actor,
      req.user.role,
      body.note,
    );
    // Auto-promote : si APPROVED et pas encore promu → crée le Project (non-bloquant)
    if (body.toStatus === 'APPROVED' && !(dossier as any).projectId) {
      this.dossierService.promote(dossierId, (dossier as any).ownerId).catch(() => {});
    }
    return { ok: true, dossier };
  }

  // ── Project transitions ────────────────────────────────────────────────────

  @RequireCaps("commission:predict")
  @Post("project/:id/transition")
  async transitionProject(
    @Req() req: any,
    @Param("id") projectId: string,
    @Body() body: { toState: string; action: string },
  ) {
    const actor = { id: req.user.userId, type: roleToActorType(req.user.role) };
    const project = await this.sm.transitionProject(
      projectId,
      body.toState,
      body.action,
      actor,
    );
    return { ok: true, project };
  }

  @RequireCaps("commission:predict")
  @Post("project/:id/freeze")
  async freeze(
    @Req() req: any,
    @Param("id") projectId: string,
    @Body() body: { reason: string; origin: string },
  ) {
    const actor = { id: req.user.userId, type: roleToActorType(req.user.role) };
    const project = await this.sm.freezeProject(projectId, body.reason, body.origin, actor);
    return { ok: true, project };
  }

  @RequireCaps("commission:predict")
  @Post("project/:id/unfreeze")
  async unfreeze(
    @Req() req: any,
    @Param("id") projectId: string,
    @Body() body: { restoreToState: string },
  ) {
    const actor = { id: req.user.userId, type: roleToActorType(req.user.role) };
    const project = await this.sm.unfreezeProject(projectId, body.restoreToState, actor);
    return { ok: true, project };
  }

  @RequireCaps("commission:predict")
  @Get("project/:id/history")
  async history(@Param("id") projectId: string) {
    const history = await this.sm.getProjectHistory(projectId);
    return { ok: true, history };
  }

  // ── Legacy stub ────────────────────────────────────────────────────────────

  @RequireCaps("commission:predict")
  @Post("commission/predict")
  predict(@Body() body: any) {
    return { ok: true, action: "predict", body, note: "stub v1" };
  }
}
