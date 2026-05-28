import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { MandatairesRegistryService, Profession } from "./mandataires-registry.service";

/**
 * MandatairesRegistryController — annuaire mandataires agréés (Tome 2).
 * Recherche publique ; missions JWT-gated.
 */
@Tome("tome2")
@Controller("api/mandataires")
export class MandatairesRegistryController {
  constructor(private readonly svc: MandatairesRegistryService) {}

  private uid(req: any): string { return req?.user?.id || req?.user?.sub || req?.user?.userId; }

  @Get("search")
  search(
    @Query("ville") ville?: string,
    @Query("specialite") specialite?: string,
    @Query("minNote") minNote?: string,
    @Query("maxTarif") maxTarif?: string,
    @Query("profession") profession?: Profession,
  ) {
    const results = this.svc.search({
      ville, specialite, profession,
      minNote: minNote ? +minNote : undefined,
      maxTarif: maxTarif ? +maxTarif : undefined,
    });
    return { ok: true, count: results.length, results };
  }

  @Get(":slug")
  getProfile(@Param("slug") slug: string) {
    const m = this.svc.getBySlug(slug);
    if (!m) return { ok: false, error: "Mandataire introuvable" };
    return { ok: true, mandataire: m };
  }

  @Post(":id/mission-request")
  @UseGuards(JwtAuthGuard)
  async requestMission(
    @Param("id") id: string,
    @Body() body: { dossierId: string; missionType: string; description: string; honorairesProposeMad: number; deadline?: string },
    @Req() req: any,
  ) {
    const mission = await this.svc.requestMission({ ...body, mandataireId: id, clientUserId: this.uid(req) });
    return { ok: true, mission };
  }

  @Post("missions/:dossierId/:missionId/accept")
  @UseGuards(JwtAuthGuard)
  async accept(@Param("dossierId") d: string, @Param("missionId") m: string) {
    return { ok: true, mission: await this.svc.transitionMission(d, m, "ACCEPTED") };
  }

  @Post("missions/:dossierId/:missionId/livrer")
  @UseGuards(JwtAuthGuard)
  async livrer(@Param("dossierId") d: string, @Param("missionId") m: string, @Body() body: { livrablesDocIds?: string[] }) {
    return { ok: true, mission: await this.svc.transitionMission(d, m, "DELIVERED", { livrablesDocIds: body.livrablesDocIds || [] }) };
  }

  @Post("missions/:dossierId/:missionId/valider")
  @UseGuards(JwtAuthGuard)
  async valider(@Param("dossierId") d: string, @Param("missionId") m: string) {
    return { ok: true, mission: await this.svc.transitionMission(d, m, "VALIDATED") };
  }

  @Get("missions/dossier/:dossierId")
  @UseGuards(JwtAuthGuard)
  async listMissions(@Param("dossierId") dossierId: string) {
    return { ok: true, missions: await this.svc.listMissions(dossierId) };
  }
}
