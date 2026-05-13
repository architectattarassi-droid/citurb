import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { AssociationsService } from "./associations.service";

/**
 * AssociationsController — Sprint I
 *
 * Endpoints d'adhésion aux Cercles ASSOCIATION (SNASP, ANJAUM, ordres pro).
 *  - GET    /api/cercles/:slug/form-schema           (public — schéma formulaire)
 *  - POST   /api/cercles/:cercleId/apply             (auth — soumettre dossier)
 *  - GET    /api/cercles/:cercleId/my-application    (auth — état de ma demande)
 *  - GET    /api/cercles/:cercleId/applications      (modo — liste dossiers)
 *  - GET    /api/cercles/applications/:appId         (modo ou candidat — détail)
 *  - POST   /api/cercles/applications/:appId/approve (modo — valide)
 *  - POST   /api/cercles/applications/:appId/reject  (modo — refuse)
 *  - POST   /api/cercles/:cercleId/cotisation/:userId/mark-paid (modo — cotisation)
 */
@Tome("tome8")
@Controller("api/cercles")
export class AssociationsController {
  constructor(private readonly assoc: AssociationsService) {}

  private uid(req: any): string {
    return req?.user?.userId || req?.user?.sub;
  }

  // ── Public ──

  @Get(":slug/form-schema")
  async formSchema(@Param("slug") slug: string) {
    return { ok: true, data: await this.assoc.getFormSchema(slug) };
  }

  // ── Candidat ──

  @Post(":cercleId/apply")
  @UseGuards(JwtAuthGuard)
  async apply(
    @Req() req: any,
    @Param("cercleId") cercleId: string,
    @Body() body: { formData: Record<string, unknown>; memberType?: string },
  ) {
    return {
      ok: true,
      data: await this.assoc.submitApplication(cercleId, this.uid(req), body.formData, body.memberType),
    };
  }

  @Get(":cercleId/my-application")
  @UseGuards(JwtAuthGuard)
  async myApp(@Req() req: any, @Param("cercleId") cercleId: string) {
    return { ok: true, data: await this.assoc.getMyApplication(cercleId, this.uid(req)) };
  }

  @Get("applications/:appId")
  @UseGuards(JwtAuthGuard)
  async detail(@Req() req: any, @Param("appId") appId: string) {
    return { ok: true, data: await this.assoc.getApplicationDetail(appId, this.uid(req)) };
  }

  // ── Modo ──

  @Get(":cercleId/applications")
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: any, @Param("cercleId") cercleId: string, @Query("status") status?: string) {
    return {
      ok: true,
      data: await this.assoc.listApplications(cercleId, this.uid(req), status),
    };
  }

  @Post("applications/:appId/approve")
  @UseGuards(JwtAuthGuard)
  async approve(
    @Req() req: any,
    @Param("appId") appId: string,
    @Body() body: { memberType?: string; reviewNote?: string },
  ) {
    return { ok: true, data: await this.assoc.approveApplication(appId, this.uid(req), body) };
  }

  @Post("applications/:appId/reject")
  @UseGuards(JwtAuthGuard)
  async reject(
    @Req() req: any,
    @Param("appId") appId: string,
    @Body() body: { reason: string },
  ) {
    return { ok: true, data: await this.assoc.rejectApplication(appId, this.uid(req), body.reason) };
  }

  @Post(":cercleId/cotisation/:userId/mark-paid")
  @UseGuards(JwtAuthGuard)
  async markPaid(
    @Req() req: any,
    @Param("cercleId") cercleId: string,
    @Param("userId") userId: string,
    @Body() body: { expireAt: string },
  ) {
    return {
      ok: true,
      data: await this.assoc.markCotisationPaid(cercleId, userId, this.uid(req), new Date(body.expireAt)),
    };
  }
}
