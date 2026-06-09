import {
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  NotFoundException,
  Param,
  Req,
  UnprocessableEntityException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard, Tome } from "../../tomes/tome-at";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { PhaseEngineService } from "./phase-engine.service";

/**
 * PhaseEngineController — endpoint snapshot v7 (lecture seule).
 *
 * Route :
 *   GET /api/dossier/:dossierId/phases  (JWT, lecture seule)
 *
 * Doctrine :
 *  - Lecture seule → pas de MutationGate ; pas dans l'allow-list mutations.
 *  - L'utilisateur doit être propriétaire OU rôle ADMIN/OPS/OWNER/SUPER_ADMIN.
 *  - Calculé à la volée à partir du catalogue v7 + DossierPhaseRecord. Aucun write.
 *  - Indépendant du flag USE_V7_PHASES (v7 par nature, pas de fallback legacy
 *    sur le format de réponse).
 *
 * Métadonnée Tome 0 (gouvernance données / lecture transverse, comme
 * dossier-overview).
 */
@Tome("tome0")
@Controller("api/dossier/:dossierId")
@UseGuards(JwtAuthGuard)
export class PhaseEngineController {
  constructor(
    private readonly engine: PhaseEngineService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("phases")
  async phases(@Param("dossierId") dossierId: string, @Req() req: any) {
    // ── Autorisation : owner OU admin/ops/owner/super_admin
    const userId: string = req.user?.userId ?? req.user?.id ?? "";
    const role: string = req.user?.role ?? "CLIENT";
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "OWNER", "OPS"].includes(role);

    const dossierOwn = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { ownerId: true },
    });
    if (!dossierOwn) throw new NotFoundException(`Dossier ${dossierId} introuvable`);
    if (!isAdmin && dossierOwn.ownerId !== userId) {
      throw new ForbiddenException("Accès refusé sur ce dossier");
    }

    try {
      return await this.engine.getDossierPhasesSnapshot(dossierId);
    } catch (e: any) {
      // Service utilise des erreurs custom avec err.status (404/422/4xx) pour
      // ne pas dépendre de Nest dans la couche service. On les retraduit ici.
      if (e instanceof HttpException) throw e;
      if (e?.status === 404) throw new NotFoundException(e.message);
      if (e?.status === 422) {
        throw new UnprocessableEntityException({
          message: e.message,
          errors: e.details?.errors ?? [],
        });
      }
      throw e;
    }
  }
}
