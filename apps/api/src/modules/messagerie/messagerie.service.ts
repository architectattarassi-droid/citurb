import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../tomes/tome-at/kernel/prisma/prisma.service';

export type MessageCanal = 'CLIENT_OPS' | 'OPS_PRESTATAIRE' | 'TRIPARTITE' | 'BROADCAST';

@Injectable()
export class MessagerieService {
  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(data: {
    dossierId: string;
    canal: string;
    expediteurId: string;
    expediteurRole: string;
    contenu: string;
    phaseRef?: string;
  }) {
    return this.prisma.dossierMessage.create({
      data: {
        dossierId: data.dossierId,
        canal: data.canal,
        expediteurId: data.expediteurId,
        expediteurRole: data.expediteurRole,
        contenu: data.contenu,
        phaseRef: data.phaseRef ?? null,
      },
    });
  }

  async getMessages(dossierId: string, canal?: string) {
    return this.prisma.dossierMessage.findMany({
      where: { dossierId, ...(canal ? { canal } : {}) },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markAsRead(messageId: string) {
    await this.prisma.dossierMessage.update({
      where: { id: messageId },
      data: { luAt: new Date() },
    });
  }
}
