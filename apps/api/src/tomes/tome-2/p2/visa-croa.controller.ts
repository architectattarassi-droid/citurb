import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { Tome } from "../../tome-at";
import { JwtAuthGuard } from "../../tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../../tome-5/auth/roles.guard";
import { Roles } from "../../tome-5/auth/roles.decorator";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";

/**
 * Visa CROA workflow (Chap V Règlement Intérieur CNOA 2024)
 *
 * Le CROA territorialement compétent vise le contrat avant dépôt du dossier
 * d'autorisation de construire. Délai max 15 jours calendaires.
 *
 * État stocké dans Dossier.payload.visaCroa (no schema migration).
 */

export type VisaCroaStatus =
  | "NON_DEMANDE"
  | "DEMANDE_ENVOYEE"
  | "EN_COURS"
  | "OBTENU"
  | "REFUSE"
  | "EXPIRE";

export type VisaCroaState = {
  status: VisaCroaStatus;
  croaName?: string;
  numero?: string;
  dateDemande?: string;
  dateLimite?: string; // dateDemande + 15 jours calendaires
  dateObtention?: string;
  dateRefus?: string;
  motifRefus?: string;
  scanUrl?: string;
  history: { ts: string; author: string; status: VisaCroaStatus; note?: string }[];
};

const FIFTEEN_DAYS_MS = 15 * 24 * 3600 * 1000;

@Tome("tome2")
@Controller("p2")
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisaCroaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("dossiers/:id/visa-croa")
  @Roles("ADMIN", "OWNER", "OPS", "CLIENT")
  async get(@Param("id") id: string) {
    const dossier = await this.prisma.dossier.findUniqueOrThrow({
      where: { id },
      select: { id: true, payload: true },
    });
    const payload: any = dossier.payload && typeof dossier.payload === "object" ? dossier.payload : {};
    const state: VisaCroaState = payload.visaCroa ?? { status: "NON_DEMANDE", history: [] };
    const daysRemaining = state.dateLimite ? Math.ceil((new Date(state.dateLimite).getTime() - Date.now()) / (24 * 3600 * 1000)) : null;
    return { ok: true, visaCroa: state, daysRemaining };
  }

  @Patch("dossiers/:id/visa-croa")
  @Roles("ADMIN", "OWNER", "OPS")
  async update(
    @Param("id") id: string,
    @Body() body: {
      status?: VisaCroaStatus;
      croaName?: string;
      numero?: string;
      dateDemande?: string;
      dateObtention?: string;
      dateRefus?: string;
      motifRefus?: string;
      scanUrl?: string;
      note?: string;
    },
  ) {
    const dossier = await this.prisma.dossier.findUniqueOrThrow({
      where: { id },
      select: { payload: true },
    });
    const payload: any = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
    const prev: VisaCroaState = payload.visaCroa ?? { status: "NON_DEMANDE", history: [] };
    const next: VisaCroaState = { ...prev };

    if (body.croaName !== undefined) next.croaName = body.croaName;
    if (body.numero !== undefined) next.numero = body.numero;
    if (body.scanUrl !== undefined) next.scanUrl = body.scanUrl;

    if (body.status && body.status !== prev.status) {
      next.status = body.status;
      const now = new Date().toISOString();

      if (body.status === "DEMANDE_ENVOYEE" || body.status === "EN_COURS") {
        const start = body.dateDemande || prev.dateDemande || now;
        next.dateDemande = start;
        next.dateLimite = new Date(new Date(start).getTime() + FIFTEEN_DAYS_MS).toISOString();
      }
      if (body.status === "OBTENU") {
        next.dateObtention = body.dateObtention || now;
      }
      if (body.status === "REFUSE") {
        next.dateRefus = body.dateRefus || now;
        next.motifRefus = body.motifRefus;
      }

      next.history = [...(prev.history || []), { ts: now, author: "admin", status: body.status, note: body.note }];
    } else if (body.note) {
      next.history = [...(prev.history || []), { ts: new Date().toISOString(), author: "admin", status: prev.status, note: body.note }];
    }

    payload.visaCroa = next;
    const updated = await this.prisma.dossier.update({
      where: { id },
      data: { payload },
      select: { id: true, payload: true },
    });

    const finalState = (updated.payload as any).visaCroa as VisaCroaState;
    const daysRemaining = finalState.dateLimite ? Math.ceil((new Date(finalState.dateLimite).getTime() - Date.now()) / (24 * 3600 * 1000)) : null;
    return { ok: true, visaCroa: finalState, daysRemaining };
  }
}
