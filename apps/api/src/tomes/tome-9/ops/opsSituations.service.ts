import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";

@Injectable()
export class OpsSituationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByProject(projectId: string) {
    return this.prisma.workSituation.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(projectId: string, amountDeclared: number) {
    const amt = Number(amountDeclared);
    if (!Number.isFinite(amt) || amt <= 0) throw new Error("Montant invalide.");
    return this.prisma.workSituation.create({
      data: {
        projectId,
        amountDeclared: amt,
        platformFee5: 0,
        amountNet: 0,
        status: "SUBMITTED",
      } as any,
    });
  }

  async setValidation(id: string, patch: Partial<{ architectOk: boolean; betOk: boolean; controlOk: boolean; topoOk: boolean }>) {
    return this.prisma.workSituation.update({
      where: { id },
      data: {
        ...patch,
      },
    });
  }

  async pay(id: string) {
    const s = await this.prisma.workSituation.findUnique({ where: { id }, include: { project: true } });
    if (!s) throw new Error("Situation introuvable.");
    if (!s.project.modActivated) throw new Error("MOD non activée sur ce projet.");
    const allOk = s.architectOk && s.betOk && s.controlOk && s.topoOk;
    if (!allOk) throw new Error("Validations incomplètes.");

    const fee = s.amountDeclared * 0.05;
    const net = s.amountDeclared - fee;
    return this.prisma.workSituation.update({
      where: { id },
      data: {
        platformFee5: fee,
        amountNet: net,
        status: "PAID",
      } as any,
    });
  }
}
