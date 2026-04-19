import { Controller, Get, Post, Body, UseGuards, Req, Param, UseInterceptors, UploadedFile, Query, ForbiddenException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard, Tome } from "../../tome-at";
import { CapsGuard } from "../../tome-at";
import { RequireCaps } from "../../tome-at";
import { DossierService } from "./dossier.service";
import { ReminderService } from "./reminder.service";
import { AreaService } from "./area/area.service";
import { PhaseEngineService } from "../../../modules/phase-engine/phase-engine.service";
import { MessagerieService } from "../../../modules/messagerie/messagerie.service";

/**
 * P2 v1 — Dossier (persisted)
 * Contracts stable; fields will be hardened in later iterations.
 */
@UseGuards(JwtAuthGuard, CapsGuard)
@Tome('tome2')
@Controller("p2")
export class P2Controller {
  constructor(
    private readonly dossiers: DossierService,
    private readonly areas: AreaService,
    private readonly reminderService: ReminderService,
    private readonly phaseEngine: PhaseEngineService,
    private readonly messagerie: MessagerieService,
  ) {}

  @RequireCaps("dossier:read")
  @Get("status")
  status() {
    return { ok: true, door: "p2", version: "v1" };
  }

  @RequireCaps("dossier:read")
  @Get("dossier")
  async list(@Req() req: any) {
    return { ok: true, items: await this.dossiers.list(req.user.userId) };
  }

  // ops/all MUST be declared before dossier/:id to avoid NestJS route shadowing
  @RequireCaps("dossier:read")
  @Get("dossier/ops/all")
  async findAllForOps(@Req() req: any, @Query('firmId') firmId?: string) {
    if (!["OWNER", "ADMIN", "OPS"].includes(req.user?.role)) {
      throw new ForbiddenException("Accès réservé aux rôles OPS/ADMIN/OWNER");
    }
    const resolvedFirmId = (req as any).firmId || firmId || undefined;
    return this.dossiers.findAllForOps(resolvedFirmId);
  }

  @RequireCaps("dossier:read")
  @Get("dossier/:id")
  async get(@Req() req: any, @Param("id") id: string) {
    return { ok: true, dossier: await this.dossiers.get(req.user.userId, id) };
  }

  @RequireCaps("dossier:create")
  @Post("dossier/create")
  async createDossier(@Req() req: any, @Body() body: any) {
    const dossier = await this.dossiers.create(req.user.userId, body);
    return { ok: true, dossier };
  }

  @RequireCaps("dossier:submit")
  @Post("dossier/submit")
  async submitDossier(@Req() req: any, @Body() body: any) {
    const dossierId = body?.dossierId;
    const dossier = await this.dossiers.submit(req.user.userId, String(dossierId || ""));
    // MIN1: ensure we have a fresh ESTIMATED snapshot after submit
    // (append-only; idempotent via inputsHash)
    try {
      await this.areas.estimate(req.user, dossier.id);
    } catch {
      // do not block submission if estimation fails in V1
    }
    return { ok: true, dossier };
  }

  @RequireCaps("dossier:create")
  @Post("dossier/:id/promote")
  async promote(@Req() req: any, @Param("id") id: string) {
    return this.dossiers.promote(id, req.user.userId);
  }

  @RequireCaps("dossier:create")
  @Post("dossier/:id/disclaimer")
  async acceptDisclaimer(@Req() req: any, @Param("id") id: string) {
    return this.dossiers.acceptDisclaimer(id, req.user.userId, req.user.role);
  }

  @RequireCaps("dossier:create")
  @Post("dossier/:id/documents")
  @UseInterceptors(FileInterceptor("file", {
    dest: "./uploads/dossiers",
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadDocument(
    @Req() req: any,
    @Param("id") id: string,
    @Query("docType") docType: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new Error("Fichier manquant");
    return this.dossiers.uploadDocument(id, req.user.userId, docType || "autre", file);
  }

  @RequireCaps("dossier:read")
  @Get("dossier/:id/documents")
  async listDocuments(@Param("id") id: string) {
    return this.dossiers.listDocuments(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("admin/reminders/trigger")
  async triggerReminders(@Req() req: any) {
    if (!['OWNER', 'ADMIN'].includes(req.user?.role)) {
      throw new ForbiddenException('Accès refusé');
    }
    return this.reminderService.triggerNow();
  }

  // Sprint S11 — Paiements (confirm/reject déclarés avant dossier/:id pour éviter conflit routing)
  @UseGuards(JwtAuthGuard)
  @Post("payment/:paymentId/confirm")
  async confirmPayment(@Req() req: any, @Param("paymentId") paymentId: string) {
    if (!['OWNER', 'OPS', 'ADMIN'].includes(req.user?.role)) {
      throw new ForbiddenException('Accès refusé');
    }
    return this.dossiers.confirmPayment(paymentId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("payment/:paymentId/reject")
  async rejectPayment(
    @Req() req: any,
    @Param("paymentId") paymentId: string,
    @Body() body: { notes?: string },
  ) {
    if (!['OWNER', 'OPS', 'ADMIN'].includes(req.user?.role)) {
      throw new ForbiddenException('Accès refusé');
    }
    return this.dossiers.rejectPayment(paymentId, req.user.userId, body?.notes);
  }

  @RequireCaps("dossier:create")
  @Post("dossier/:id/payments")
  async createPayment(
    @Param("id") id: string,
    @Body() body: { mode: string; amount: number; ref?: string; currency?: string; notes?: string },
  ) {
    return this.dossiers.createPayment(id, body);
  }

  @RequireCaps("dossier:read")
  @Get("dossier/:id/payments")
  async listPayments(@Param("id") id: string) {
    return this.dossiers.listPayments(id);
  }

  // S14 — Jalons
  @UseGuards(JwtAuthGuard)
  @Post("project/:projectId/milestones/init")
  async initMilestones(@Param("projectId") projectId: string, @Req() req: any) {
    return this.dossiers.initProjectMilestones(projectId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("project/:projectId/milestones")
  async listMilestones(@Param("projectId") projectId: string) {
    return this.dossiers.listMilestones(projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("project/:projectId/milestones/:phase/advance")
  async advanceMilestone(
    @Param("projectId") projectId: string,
    @Param("phase") phase: string,
    @Req() req: any,
  ) {
    if (!['OWNER', 'ADMIN', 'OPS'].includes(req.user?.role)) {
      throw new ForbiddenException('Accès refusé');
    }
    return this.dossiers.advanceMilestone(projectId, phase, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("dossier/:id/phase/advance")
  async advancePhase(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.dossiers.advanceDossierPhase(id, body.toPhase, req.user.userId, body.note);
  }

  @UseGuards(JwtAuthGuard)
  @Get("dossier/:id/phase/status")
  async getPhaseStatus(@Param("id") id: string) {
    return this.phaseEngine.getPhaseStatus(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("dossier/:id/messages")
  async sendMessage(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.messagerie.sendMessage({ dossierId: id, ...body, expediteurId: req.user.userId, expediteurRole: req.user.role });
  }

  @UseGuards(JwtAuthGuard)
  @Get("dossier/:id/messages")
  async getMessages(@Param("id") id: string, @Query("canal") canal?: string) {
    return this.messagerie.getMessages(id, canal);
  }

  @UseGuards(JwtAuthGuard)
  @Get("dossier/ops/:id")
  async getForOps(@Param("id") id: string) {
    return this.dossiers.getForOps(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get("dossier/:id/phase/:phase/detail")
  async getPhaseDetail(@Param("id") id: string, @Param("phase") phase: string) {
    return this.dossiers.getPhaseDetail(id, phase);
  }

  @UseGuards(JwtAuthGuard)
  @Post("dossier/:id/phase/:phase/message")
  async sendPhaseMessage(@Param("id") id: string, @Param("phase") phase: string, @Body() body: any, @Req() req: any) {
    return this.messagerie.sendMessage({ dossierId: id, canal: body.canal ?? 'CLIENT_OPS', contenu: body.contenu, expediteurId: req.user.userId, expediteurRole: req.user.role, phaseRef: phase });
  }

  @UseGuards(JwtAuthGuard)
  @Post("dossier/:id/phase/:phase/action")
  async phaseAction(@Param("id") id: string, @Param("phase") phase: string, @Body() body: any, @Req() req: any) {
    return this.dossiers.handlePhaseAction(id, phase, body.action, req.user.userId, body.note);
  }
}
