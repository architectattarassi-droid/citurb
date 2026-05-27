import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard, Tome } from "../../tomes/tome-at";
import { DossierOverviewService } from "./dossier-overview.service";
import type { DossierOverview } from "./types";

/**
 * DossierOverviewController — endpoint "Mon Parcours".
 *
 * Route :
 *   GET /api/dossier-overview/:dossierId  (JWT, lecture seule)
 *
 * Doctrine :
 *  - Lecture seule → pas de MutationGate.
 *  - L'utilisateur doit être propriétaire OU rôle ADMIN/OPS/OWNER/SUPER_ADMIN.
 *  - L'agrégat est calculé à la volée ; il n'y a pas de side-effect.
 *
 * Métadonnée Tome 0 (gouvernance données / lecture transverse).
 */
@Tome("tome0")
@Controller("api/dossier-overview/:dossierId")
@UseGuards(JwtAuthGuard)
export class DossierOverviewController {
  constructor(private readonly svc: DossierOverviewService) {}

  @Get()
  async overview(
    @Param("dossierId") dossierId: string,
    @Req() req: any,
  ): Promise<{ ok: true; overview: DossierOverview }> {
    const userId: string = req.user?.userId ?? req.user?.id ?? "";
    const role: string = req.user?.role ?? "CLIENT";
    const overview = await this.svc.getOverview(dossierId, userId, role);
    return { ok: true, overview };
  }
}
