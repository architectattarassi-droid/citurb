import { Controller, Get, Header, Param, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { Tome } from "../../tome-at";
import { JwtAuthGuard } from "../../tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../../tome-5/auth/roles.guard";
import { Roles } from "../../tome-5/auth/roles.decorator";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { P2ContractService, AdminContractParams, DossierContractData } from "./contract.service";

/**
 * Génération du contrat type unifié d'Architecte (HTML imprimable).
 *
 * Endpoint admin protégé. Le navigateur ouvre l'HTML, l'admin clique "Imprimer / Sauvegarder en PDF"
 * pour produire un PDF natif, sans dépendance serveur lourde (puppeteer/headless chrome).
 */
@Tome("tome2")
@Controller("p2")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contract: P2ContractService,
  ) {}

  @Get("dossiers/:id/contrat")
  @Roles("ADMIN", "OWNER", "OPS")
  @Header("Content-Type", "text/html; charset=utf-8")
  async generate(
    @Param("id") id: string,
    @Query() q: Record<string, string>,
    @Res() res: Response,
  ) {
    const dossier = await this.prisma.dossier.findUniqueOrThrow({
      where: { id },
      select: {
        id: true, title: true, commune: true, createdAt: true,
        clientNom: true, clientEmail: true, clientTel: true,
        raisonSociale: true,
        payload: true,
      },
    });

    const payload: any = dossier.payload && typeof dossier.payload === "object" ? dossier.payload : {};
    const data: DossierContractData = {
      id: dossier.id,
      clientNom: dossier.clientNom ?? undefined,
      clientEmail: dossier.clientEmail ?? undefined,
      clientTel: dossier.clientTel ?? undefined,
      raisonSociale: dossier.raisonSociale,
      title: dossier.title ?? undefined,
      commune: dossier.commune ?? undefined,
      createdAt: dossier.createdAt,
      // Champs MO additionnels stockés dans payload (saisis par admin via Backoffice)
      clientCIN: payload.clientCIN,
      representant: payload.representant,
      rc: payload.rc,
      ice: payload.ice,
      cnss: payload.cnss,
      titreFoncierNum: payload.titreFoncierNum,
      surfaceTerrainM2: typeof payload.surfaceTerrainM2 === "number" ? payload.surfaceTerrainM2 : undefined,
      surfacePlancherM2: typeof payload.surfacePlancher === "number" ? payload.surfacePlancher : undefined,
      natureProjet: payload.natureProjet,
      brief: payload.brief,
    };

    const admin: AdminContractParams = {
      contratNumero: q.contratNumero,
      croaName: q.croaName,
      archNom: q.archNom,
      archCIN: q.archCIN,
      archDomicile: q.archDomicile,
      archAutorisation: q.archAutorisation,
      archAutorisationAnnee: q.archAutorisationAnnee,
      archICE: q.archICE,
      archRC: q.archRC,
      archCNSS: q.archCNSS,
      archTel: q.archTel,
      archEmail: q.archEmail,
      delaiEtudesJours: q.delaiEtudesJours ? Number(q.delaiEtudesJours) : undefined,
      delaiTravauxMois: q.delaiTravauxMois ? Number(q.delaiTravauxMois) : undefined,
      penaliteMOPourcentJour: q.penaliteMOPourcentJour ? Number(q.penaliteMOPourcentJour) : undefined,
      penaliteMOEPourcentJour: q.penaliteMOEPourcentJour ? Number(q.penaliteMOEPourcentJour) : undefined,
    };

    const html = this.contract.renderContractHtml(data, admin);
    res.send(html);
  }
}
