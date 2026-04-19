import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../tomes/tome-at/kernel/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

export const PHASES_ETUDES = [
  'PHASE_01_ESQUISSE',
  'PHASE_02_APS',
  'PHASE_03_APD',
  'PHASE_04_MANDAT_BET',
  'PHASE_05_AUTORISATION',
  'PHASE_06_DOSSIER_EXECUTION',
  'PHASE_07_DCE',
  'PHASE_08_MANDATS',
  'PHASE_09_OUVERTURE_CHANTIER',
] as const;

export const PHASES_ABOUTISSEMENT = [
  'PHASE_RECEPTION_PROVISOIRE',
  'PHASE_RECEPTION_DEFINITIVE',
  'PHASE_PERMIS_HABITER',
] as const;

const ALL_PHASES_ORDERED = [...PHASES_ETUDES, ...PHASES_ABOUTISSEMENT];

@Injectable()
export class PhaseEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  canAdvance(fromPhase: string, toPhase: string): boolean {
    const fi = ALL_PHASES_ORDERED.indexOf(fromPhase as any);
    const ti = ALL_PHASES_ORDERED.indexOf(toPhase as any);
    return fi !== -1 && ti !== -1 && ti === fi + 1;
  }

  getNextPhase(phase: string): string | null {
    const idx = ALL_PHASES_ORDERED.indexOf(phase as any);
    if (idx === -1 || idx === ALL_PHASES_ORDERED.length - 1) return null;
    return ALL_PHASES_ORDERED[idx + 1];
  }

  async getPhaseRecord(dossierId: string, phase: string) {
    return this.prisma.dossierPhaseRecord.findFirst({
      where: { dossierId, phase },
    });
  }

  async advancePhase(
    dossierId: string,
    fromPhase: string,
    toPhase: string,
    acteurId: string,
    note?: string,
  ) {
    if (!this.canAdvance(fromPhase, toPhase)) {
      throw new BadRequestException(`Transition invalide : ${fromPhase} → ${toPhase}`);
    }

    const now = new Date();

    await this.prisma.dossierPhaseRecord.updateMany({
      where: { dossierId, phase: fromPhase },
      data: { statut: 'COMPLETE', dateFin: now },
    });

    const record = await this.prisma.dossierPhaseRecord.upsert({
      where: { dossierId_phase: { dossierId, phase: toPhase } },
      update: { statut: 'EN_COURS', dateDebut: now, note: note ?? null },
      create: { dossierId, phase: toPhase, statut: 'EN_COURS', dateDebut: now, note: note ?? null },
    });

    await this.prisma.dossier.update({
      where: { id: dossierId },
      data: { phase: toPhase },
    });

    return record;
  }

  async getPhaseStatus(dossierId: string) {
    const records = await this.prisma.dossierPhaseRecord.findMany({
      where: { dossierId },
      orderBy: { createdAt: 'asc' },
    });

    const completed = records.filter(r => r.statut === 'COMPLETE').map(r => r.phase);
    const current = records.find(r => r.statut === 'EN_COURS')?.phase ?? null;
    const pending = ALL_PHASES_ORDERED.filter(p => !completed.includes(p) && p !== current);

    return { current, completed, pending, records };
  }

  // STUB Sprint 3 — ne pas implémenter maintenant
  async generateChantierPhases(nbNiveaux: number, nbSousSols: number): Promise<string[]> {
    // Sprint 3 : génère phases GO dynamiques
    // PHASE_10_FONDATIONS + SS phases + RDC + R+n + FIN_GO
    return ['PHASE_GO_FONDATIONS', 'PHASE_GO_PLANCHER', 'PHASE_GO_FIN'];
  }
}
