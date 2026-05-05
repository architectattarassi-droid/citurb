import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Tome } from "./../tome-at";
import { JwtAuthGuard } from "../tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../tome-5/auth/roles.guard";
import { Roles } from "../tome-5/auth/roles.decorator";
import { PrismaService } from "../tome-at/kernel/prisma/prisma.service";
import { AntiDesintService } from "./anti-desint.service";

/**
 * Endpoints admin pour anti-désintermédiation:
 *  POST /api/cc/anti-desint/scan         → scan ad-hoc (depuis date donnée ou X jours)
 *  GET  /api/cc/anti-desint/dossier/:id  → liste flags d'un dossier
 *  GET  /api/cc/anti-desint/dossiers     → tous les dossiers ayant ≥1 flag (recap)
 */
@Tome("tome2")
@Controller("api/cc/anti-desint")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AntiDesintController {
  constructor(
    private readonly svc: AntiDesintService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("scan")
  @Roles("ADMIN", "OWNER")
  async scan(@Body() body: { since?: string; days?: number }) {
    const days = body.days ?? 1;
    const sinceDate = body.since ? new Date(body.since) : new Date(Date.now() - days * 24 * 3600 * 1000);
    const stats = await this.svc.scanSince(sinceDate);
    return { ok: true, stats };
  }

  @Get("dossier/:id")
  @Roles("ADMIN", "OWNER", "OPS")
  async dossier(@Param("id") id: string) {
    const d = await this.prisma.dossier.findUnique({
      where: { id },
      select: { id: true, title: true, clientNom: true, payload: true },
    });
    if (!d) return { ok: false, error: "dossier not found" };
    const flags = ((d.payload as any)?.antiDesintFlags) || [];
    return { ok: true, dossierId: d.id, title: d.title, clientNom: d.clientNom, flagsCount: flags.length, flags };
  }

  @Get("dossiers")
  @Roles("ADMIN", "OWNER", "OPS")
  async dossiers(@Query("take") take?: string) {
    const t = Math.min(Number(take ?? 50), 200);
    const items = await this.prisma.dossier.findMany({
      orderBy: { updatedAt: "desc" },
      take: t * 5, // sur-fetch puis filtrer côté code
      select: {
        id: true, title: true, commune: true,
        clientNom: true, raisonSociale: true,
        porteType: true, payload: true, updatedAt: true,
      },
    });
    const filtered = items
      .map(d => {
        const flags = ((d.payload as any)?.antiDesintFlags) || [];
        return {
          dossier: { id: d.id, title: d.title, clientNom: d.clientNom, raisonSociale: d.raisonSociale, porteType: d.porteType, commune: d.commune, updatedAt: d.updatedAt },
          flagsCount: flags.length,
          recentFlags: flags.slice(-5),
        };
      })
      .filter(x => x.flagsCount > 0)
      .slice(0, t);
    return { ok: true, items: filtered };
  }
}
