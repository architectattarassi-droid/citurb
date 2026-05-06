import { Controller, Get, Header, Param, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { Tome } from "../tome-at";
import { JwtAuthGuard } from "../tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../tome-5/auth/roles.guard";
import { Roles } from "../tome-5/auth/roles.decorator";
import { PrismaService } from "../tome-at/kernel/prisma/prisma.service";
import { UniversalContractService, UniversalAdminParams } from "./universal-contract.service";

/**
 * Endpoint admin pour générer le contrat HTML de N'IMPORTE QUEL dossier
 * (P3/P4/P5/P6 — pour P2 utiliser /p2/dossiers/:id/contrat existant).
 *
 *  GET /api/cc/contract/:dossierId  → HTML imprimable
 *
 * Variables admin via query string (contratNumero, archNom, archICE,
 * archRC, archDomicile, archTel, archEmail, delaiJours, penaliteRetardPourcent).
 */
@Tome("tome1")
@Controller("api/cc/contract")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UniversalContractController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contract: UniversalContractService,
  ) {}

  @Get(":dossierId")
  @Roles("ADMIN", "OWNER", "OPS")
  @Header("Content-Type", "text/html; charset=utf-8")
  async generate(
    @Param("dossierId") id: string,
    @Query() q: Record<string, string>,
    @Res() res: Response,
  ) {
    const dossier = await this.prisma.dossier.findUniqueOrThrow({
      where: { id },
      select: {
        id: true, porteType: true, title: true, commune: true, createdAt: true,
        clientNom: true, clientEmail: true, clientTel: true, raisonSociale: true,
        payload: true,
      },
    });
    const payload: any = dossier.payload && typeof dossier.payload === "object" ? dossier.payload : {};
    const admin: UniversalAdminParams = {
      contratNumero: q.contratNumero,
      archNom: q.archNom,
      archICE: q.archICE,
      archRC: q.archRC,
      archDomicile: q.archDomicile,
      archTel: q.archTel,
      archEmail: q.archEmail,
      delaiJours: q.delaiJours ? Number(q.delaiJours) : undefined,
      penaliteRetardPourcent: q.penaliteRetardPourcent ? Number(q.penaliteRetardPourcent) : undefined,
    };

    const html = this.contract.renderHtml({
      id: dossier.id,
      porteType: dossier.porteType ?? "",
      title: dossier.title ?? undefined,
      commune: dossier.commune ?? undefined,
      clientNom: dossier.clientNom ?? undefined,
      clientCIN: payload.clientCIN,
      clientEmail: dossier.clientEmail ?? undefined,
      clientTel: dossier.clientTel ?? undefined,
      raisonSociale: dossier.raisonSociale,
      representant: payload.representant,
      rc: payload.rc,
      ice: payload.ice,
      cnss: payload.cnss,
      brief: payload.brief,
      createdAt: dossier.createdAt,
    }, admin);

    res.send(html);
  }
}
