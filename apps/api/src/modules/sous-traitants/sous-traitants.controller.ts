import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard, Tome } from "../../tomes/tome-at";
import { SousTraitantsService } from "./sous-traitants.service";
import { LOTS_TPHI } from "./types";

/**
 * Sous-Traitants — Controller (Tome 3 / P3).
 *
 * Mount: `/api/sous-traitants`
 *
 * Auth: JWT (Cercles user). Le contrôle fin (chef chantier / sous-traitant)
 * est délégué au service via le userId du token.
 */
@Tome("tome3")
@Controller("api/sous-traitants")
@UseGuards(JwtAuthGuard)
export class SousTraitantsController {
  constructor(private readonly svc: SousTraitantsService) {}

  /** GET /api/sous-traitants/catalog/lots — référentiel TPHI 1-25. */
  @Get("catalog/lots")
  catalogLots() {
    return { ok: true, count: LOTS_TPHI.length, lots: LOTS_TPHI };
  }

  /** GET /api/sous-traitants/dossier/:dossierId — sous-traitants assignés. */
  @Get("dossier/:dossierId")
  async list(@Param("dossierId") dossierId: string) {
    const items = await this.svc.listByDossier(dossierId);
    return { ok: true, count: items.length, items };
  }

  /** POST /api/sous-traitants/dossier/:dossierId/assign — assigne sous-traitant à un lot. */
  @Post("dossier/:dossierId/assign")
  async assign(
    @Param("dossierId") dossierId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const a = await this.svc.assign(dossierId, body, req.user?.userId);
    return { ok: true, assignment: a };
  }

  /** GET /api/sous-traitants/:assignmentId — détail. */
  @Get(":assignmentId")
  async getOne(@Param("assignmentId") assignmentId: string) {
    const { assignment } = await this.svc.getOne(assignmentId);
    return { ok: true, assignment };
  }

  /** POST /api/sous-traitants/:assignmentId/contrat — génère contrat loi 32-99. */
  @Post(":assignmentId/contrat")
  async genContrat(@Param("assignmentId") id: string, @Req() req: any) {
    const out = await this.svc.generateContrat(id, req.user?.userId);
    return { ok: true, assignment: out.assignment, html: out.html };
  }

  /** POST /api/sous-traitants/:assignmentId/contrat/sign — signature électronique. */
  @Post(":assignmentId/contrat/sign")
  async signContrat(
    @Param("assignmentId") id: string,
    @Body() body: { dataUrl: string },
    @Req() req: any,
  ) {
    const a = await this.svc.signContrat(id, body?.dataUrl, req.user?.userId);
    return { ok: true, assignment: a };
  }

  /** POST /api/sous-traitants/:assignmentId/situation — déclare situation travaux. */
  @Post(":assignmentId/situation")
  async declareSituation(
    @Param("assignmentId") id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const s = await this.svc.declareSituation(id, body, req.user?.userId);
    return { ok: true, situation: s };
  }

  /** POST /api/sous-traitants/:assignmentId/situation/:sitId/valider — chef chantier valide + trigger paiement. */
  @Post(":assignmentId/situation/:sitId/valider")
  async validateSituation(
    @Param("assignmentId") id: string,
    @Param("sitId") sitId: string,
    @Req() req: any,
  ) {
    const out = await this.svc.validateSituation(id, sitId, req.user?.userId);
    return { ok: true, assignment: out.assignment, situation: out.situation };
  }

  /** POST /api/sous-traitants/:assignmentId/situation/:sitId/rejeter — rejet motivé. */
  @Post(":assignmentId/situation/:sitId/rejeter")
  async rejectSituation(
    @Param("assignmentId") id: string,
    @Param("sitId") sitId: string,
    @Body() body: { motif: string },
    @Req() req: any,
  ) {
    const a = await this.svc.rejectSituation(id, sitId, body?.motif ?? "", req.user?.userId);
    return { ok: true, assignment: a };
  }

  /** POST /api/sous-traitants/:assignmentId/evaluation — notation post-mission. */
  @Post(":assignmentId/evaluation")
  async evaluate(
    @Param("assignmentId") id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const a = await this.svc.evaluate(id, body, req.user?.userId);
    return { ok: true, assignment: a };
  }

  /** GET /api/sous-traitants/:assignmentId/historique — timeline complète. */
  @Get(":assignmentId/historique")
  async historique(@Param("assignmentId") id: string) {
    const out = await this.svc.historique(id);
    return { ok: true, assignment: out.assignment, timeline: out.timeline };
  }

  /** GET /api/sous-traitants/dossier/:dossierId/audit-loi-32-99 — audit conformité. */
  @Get("dossier/:dossierId/audit-loi-32-99")
  async audit(@Param("dossierId") dossierId: string) {
    const result = await this.svc.auditLoi32_99(dossierId);
    return { ok: true, audit: result };
  }
}
