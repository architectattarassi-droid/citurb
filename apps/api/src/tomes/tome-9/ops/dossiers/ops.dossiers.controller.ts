import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PrismaDossiersService } from "../../../tome-at/kernel/prisma-dossiers/prisma-dossiers.service";
import { JwtAuthGuard } from "../../../tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../../../tome-5/auth/roles.guard";
import { Roles } from "../../../tome-5/auth/roles.decorator";

@Controller("ops/dossiers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("OWNER", "ADMIN")
export class OpsDossiersController {
  constructor(private dossiers: PrismaDossiersService) {}

  @Get()
  async list(
    @Query("projectType") projectType?: string,
    @Query("regionCode") regionCode?: string,
    @Query("provinceCode") provinceCode?: string,
    @Query("communeCode") communeCode?: string,
    @Query("lotissementRef") lotissementRef?: string,
    @Query("maitreOuvrageName") maitreOuvrageName?: string,
    @Query("packCode") packCode?: string,
    @Query("stepCode") stepCode?: string,
    @Query("status") status?: string,
    @Query("q") q?: string,
    @Query("take") take?: string,
    @Query("skip") skip?: string,
  ) {
    const where: any = {};
    if (projectType) where.projectType = projectType;
    if (regionCode) where.regionCode = regionCode;
    if (provinceCode) where.provinceCode = provinceCode;
    if (communeCode) where.communeCode = communeCode;
    if (lotissementRef) where.lotissementRef = lotissementRef;
    if (maitreOuvrageName) where.maitreOuvrageName = { contains: maitreOuvrageName, mode: "insensitive" };
    if (packCode) where.packCode = packCode;
    if (stepCode) where.stepCode = stepCode;
    if (status) where.status = status;

    if (q) {
      where.OR = [
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
        { maitreOuvrageName: { contains: q, mode: "insensitive" } },
        { lotissementRef: { contains: q, mode: "insensitive" } },
      ];
    }

    const takeN = Math.min(Math.max(parseInt(take || "50", 10), 1), 200);
    const skipN = Math.max(parseInt(skip || "0", 10), 0);

    const [items, total] = await Promise.all([
      this.dossiers.dossier.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: takeN,
        skip: skipN,
      }),
      this.dossiers.dossier.count({ where }),
    ]);

    return { total, take: takeN, skip: skipN, items };
  }
}
