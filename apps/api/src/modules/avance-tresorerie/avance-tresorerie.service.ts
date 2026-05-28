import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../kernel/prisma/prisma.service";
import { ProbativeLogService } from "../kernel/services/probative-log.service";

/**
 * AvanceTresorerieService — avance de trésorerie sur situation de travaux.
 *
 * Persona Brahim : "Phase fondation finie, promoteur paie à 60j. Vendredi je
 * dois payer mes ouvriers. Avancez-moi 70% sur ma réputation."
 *
 * Scoring réputation basé sur l'historique CITURBAREA (pas de banque).
 * Frais 0.5%/mois. Statut PENDING_OPS_REVIEW → ACCEPTED → DISBURSED → REPAID.
 */
@Injectable()
export class AvanceTresorerieService {
  private readonly logger = new Logger(AvanceTresorerieService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly probative: ProbativeLogService,
  ) {}

  /** Calcule le score de réputation d'un user (0-100). */
  async computeReputation(userId: string): Promise<{ score: number; breakdown: Record<string, number>; eligible: boolean; plafondPct: number }> {
    const breakdown: Record<string, number> = {};
    let score = 0;

    const dossiers = await this.prisma.dossier.findMany({ where: { ownerId: userId } as any, take: 100 }).catch(() => []);
    const livresCount = (dossiers as any[]).filter((d) => ["DELIVERED", "RECEPTION", "COMPLETED"].includes(d.status)).length;
    if (livresCount > 5) { score += 20; breakdown.chantiersLivres = 20; }
    else if (livresCount > 0) { score += 10; breakdown.chantiersLivres = 10; }

    // 0 incident grave 12 mois
    const incidentsGraves = (dossiers as any[]).reduce((acc, d) => {
      const inc = ((d.payload as any)?.incidents || []).filter((i: any) => i.severite === "CRITIQUE" || i.severite === "GRAVE");
      return acc + inc.length;
    }, 0);
    if (incidentsGraves === 0) { score += 15; breakdown.zeroIncidentGrave = 15; }

    // paiements clients à temps (proxy : dossiers avec packValidation ACTIVATED)
    const paid = (dossiers as any[]).filter((d) => (d.payload as any)?.packValidation?.status === "ACTIVATED").length;
    const ratioPaid = dossiers.length > 0 ? paid / dossiers.length : 0;
    if (ratioPaid > 0.8) { score += 15; breakdown.paiementsATemps = 15; }
    else if (ratioPaid > 0.5) { score += 8; breakdown.paiementsATemps = 8; }

    // ancienneté (proxy : nombre total dossiers)
    if (dossiers.length >= 10) { score += 10; breakdown.anciennete = 10; }

    const eligible = score >= 40;
    const plafondPct = eligible ? Math.min(70, Math.round(score * 0.7)) : 0;
    return { score, breakdown, eligible, plafondPct };
  }

  /** Demande une avance sur une situation validée. */
  async demander(input: { dossierId: string; userId: string; situationId: string; montantSituationMad: number; montantDemandeMad: number; delaiPaiementClientJours: number }) {
    const rep = await this.computeReputation(input.userId);
    if (!rep.eligible) throw new Error(`Non éligible (score réputation ${rep.score}/100, seuil 40)`);

    const plafond = Math.round(input.montantSituationMad * (rep.plafondPct / 100));
    if (input.montantDemandeMad > plafond) {
      throw new Error(`Montant demandé ${input.montantDemandeMad} > plafond ${plafond} MAD (${rep.plafondPct}% de la situation)`);
    }

    const moisEstimes = Math.max(1, Math.ceil(input.delaiPaiementClientJours / 30));
    const fraisPct = 0.5 * moisEstimes;
    const frais = Math.round(input.montantDemandeMad * (fraisPct / 100));

    const { dossier, payload } = await this.read(input.dossierId);
    const avances = payload.avancesTresorerie || [];
    const avance = {
      id: randomUUID(),
      dossierId: input.dossierId,
      userId: input.userId,
      situationId: input.situationId,
      montantSituationMad: input.montantSituationMad,
      montantDemandeMad: input.montantDemandeMad,
      plafondMad: plafond,
      reputationScore: rep.score,
      moisEstimes,
      fraisPct,
      fraisMad: frais,
      montantNetMad: input.montantDemandeMad - frais,
      delaiPaiementClientJours: input.delaiPaiementClientJours,
      status: "PENDING_OPS_REVIEW",
      createdAt: new Date().toISOString(),
    };
    avances.push(avance);
    payload.avancesTresorerie = avances;
    await this.prisma.dossier.update({ where: { id: input.dossierId }, data: { payload } });
    return avance;
  }

  async accepter(dossierId: string, avanceId: string) {
    return this.transition(dossierId, avanceId, "ACCEPTED", "AVANCE_ACCEPTED");
  }
  async disburser(dossierId: string, avanceId: string) {
    return this.transition(dossierId, avanceId, "DISBURSED", "AVANCE_DISBURSED");
  }
  async rembourser(dossierId: string, avanceId: string) {
    return this.transition(dossierId, avanceId, "REPAID", "AVANCE_REPAID");
  }

  private async transition(dossierId: string, avanceId: string, status: string, kind: string) {
    const { payload } = await this.read(dossierId);
    const avances = payload.avancesTresorerie || [];
    const a = avances.find((x: any) => x.id === avanceId);
    if (!a) throw new Error("Avance introuvable");
    a.status = status;
    a[`${status.toLowerCase()}At`] = new Date().toISOString();
    payload.avancesTresorerie = avances;
    await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload } });
    await this.probative.append({
      kind, rule_id: "T3-R-AVANCE-001", projectId: dossierId, actorId: a.userId,
      metadata: { avanceId, status, montant: a.montantNetMad },
    }).catch((e: any) => this.logger.warn(`ProbativeLog avance: ${e?.message}`));
    return a;
  }

  async listForDossier(dossierId: string) {
    const { payload } = await this.read(dossierId);
    return payload.avancesTresorerie || [];
  }

  private async read(dossierId: string) {
    const dossier = await this.prisma.dossier.findUnique({ where: { id: dossierId } });
    if (!dossier) throw new Error(`Dossier introuvable: ${dossierId}`);
    return { dossier, payload: (dossier.payload as any) || {} };
  }
}
