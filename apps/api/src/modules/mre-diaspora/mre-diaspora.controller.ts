import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { MreDiasporaService } from "./mre-diaspora.service";
import type { MissionType, MreCountry } from "./mre-diaspora.types";

/**
 * MreDiasporaController — parcours MRE (Pivot Visa du foncier).
 * Tome 2 (portes). Toutes les mutations sont JWT-gated.
 */
@Tome("tome2")
@Controller("api/mre-diaspora")
export class MreDiasporaController {
  constructor(private readonly svc: MreDiasporaService) {}

  private uid(req: any): string {
    return req?.user?.id || req?.user?.sub || req?.user?.userId;
  }

  @Post("profile/upgrade")
  @UseGuards(JwtAuthGuard)
  async upgradeProfile(@Body() body: {
    countryResidence: MreCountry; city?: string; passportMaNumber?: string;
    consulateAttestationDocId?: string; cinMaNumber?: string; preferredLang?: "fr" | "ar" | "en";
  }, @Req() req: any) {
    const profile = await this.svc.upgradeProfile(this.uid(req), body);
    return { ok: true, profile };
  }

  @Get("dashboard")
  @UseGuards(JwtAuthGuard)
  async dashboard(@Req() req: any) {
    const dashboard = await this.svc.getDashboard(this.uid(req));
    return { ok: true, dashboard };
  }

  @Post("procuration")
  @UseGuards(JwtAuthGuard)
  async createProcuration(@Body() body: {
    dossierId: string; mandataireId: string; mandataireNom?: string;
    missionType: MissionType; scopes: string[]; dureeJours: number;
  }, @Req() req: any) {
    const proc = await this.svc.createProcuration({ ...body, mreUserId: this.uid(req) });
    return { ok: true, procuration: proc };
  }

  @Post("procuration/:dossierId/:procId/sign")
  @UseGuards(JwtAuthGuard)
  async signProcuration(
    @Param("dossierId") dossierId: string,
    @Param("procId") procId: string,
    @Body() body: { signatureDataUrl: string; country: MreCountry },
  ) {
    const proc = await this.svc.signProcuration(dossierId, procId, body.signatureDataUrl, body.country);
    return { ok: true, procuration: proc };
  }

  @Post("procuration/:dossierId/:procId/apostille")
  @UseGuards(JwtAuthGuard)
  async apostille(@Param("dossierId") dossierId: string, @Param("procId") procId: string) {
    const proc = await this.svc.requestApostille(dossierId, procId);
    return { ok: true, procuration: proc };
  }

  @Get("escrow/:dossierId")
  @UseGuards(JwtAuthGuard)
  async getEscrow(@Param("dossierId") dossierId: string) {
    const escrow = await this.svc.getEscrow(dossierId);
    return { ok: true, escrow };
  }

  @Post("escrow/:dossierId/init")
  @UseGuards(JwtAuthGuard)
  async initEscrow(
    @Param("dossierId") dossierId: string,
    @Body() body: { milestones: { label: string; amountMad: number; conditionDescription: string }[] },
    @Req() req: any,
  ) {
    const escrow = await this.svc.initEscrow(dossierId, this.uid(req), body.milestones);
    return { ok: true, escrow };
  }

  @Post("escrow/:dossierId/release/:milestoneId")
  @UseGuards(JwtAuthGuard)
  async releaseMilestone(
    @Param("dossierId") dossierId: string,
    @Param("milestoneId") milestoneId: string,
    @Body() body: { preuveDocIds?: string[] },
  ) {
    const escrow = await this.svc.releaseMilestone(dossierId, milestoneId, body.preuveDocIds || []);
    return { ok: true, escrow };
  }
}
