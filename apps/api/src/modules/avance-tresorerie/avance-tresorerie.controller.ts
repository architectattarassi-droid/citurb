import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { AvanceTresorerieService } from "./avance-tresorerie.service";

/**
 * AvanceTresorerieController — avance de trésorerie chef de chantier (Tome 3).
 */
@Tome("tome3")
@Controller("api/avance-tresorerie")
export class AvanceTresorerieController {
  constructor(private readonly svc: AvanceTresorerieService) {}

  private uid(req: any): string {
    return req?.user?.id || req?.user?.sub || req?.user?.userId;
  }

  @Get("eligibility")
  @UseGuards(JwtAuthGuard)
  async eligibility(@Req() req: any) {
    const rep = await this.svc.computeReputation(this.uid(req));
    return { ok: true, ...rep };
  }

  @Post("demande")
  @UseGuards(JwtAuthGuard)
  async demande(@Body() body: {
    dossierId: string; situationId: string; montantSituationMad: number;
    montantDemandeMad: number; delaiPaiementClientJours: number;
  }, @Req() req: any) {
    const avance = await this.svc.demander({ ...body, userId: this.uid(req) });
    return { ok: true, avance };
  }

  @Get("dossier/:dossierId")
  @UseGuards(JwtAuthGuard)
  async list(@Param("dossierId") dossierId: string) {
    const avances = await this.svc.listForDossier(dossierId);
    return { ok: true, avances };
  }

  @Post(":dossierId/:avanceId/accepter")
  @UseGuards(JwtAuthGuard)
  async accepter(@Param("dossierId") d: string, @Param("avanceId") a: string) {
    return { ok: true, avance: await this.svc.accepter(d, a) };
  }

  @Post(":dossierId/:avanceId/disburser")
  @UseGuards(JwtAuthGuard)
  async disburser(@Param("dossierId") d: string, @Param("avanceId") a: string) {
    return { ok: true, avance: await this.svc.disburser(d, a) };
  }
}
