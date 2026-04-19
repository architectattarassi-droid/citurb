import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../tomes/tome-at';

@Injectable()
export class FirmService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    slug: string;
    name: string;
    ownerEmail: string;
    ownerPhone?: string;
    planType?: string;
  }) {
    return this.prisma.firm.create({ data });
  }

  async findBySlug(slug: string) {
    return this.prisma.firm.findUnique({ where: { slug } });
  }

  async findAll() {
    return this.prisma.firm.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async update(id: string, data: Partial<{
    name: string;
    ownerEmail: string;
    ownerPhone: string;
    logoUrl: string;
    planType: string;
    active: boolean;
  }>) {
    return this.prisma.firm.update({ where: { id }, data });
  }

  async assignUserToFirm(userId: string, firmId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { firmId },
      select: { id: true, email: true, firmId: true },
    });
  }

  async listFirmUsers(firmId: string) {
    return this.prisma.user.findMany({
      where: { firmId },
      select: { id: true, email: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listFirmDossiers(firmId: string) {
    return this.prisma.dossier.findMany({
      where: { firmId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async seedDefault() {
    const existing = await this.prisma.firm.findUnique({ where: { slug: 'citurbarea' } });
    if (existing) return existing;
    return this.prisma.firm.create({
      data: {
        slug: 'citurbarea',
        name: 'CITURBAREA',
        ownerEmail: 'citurbarea@gmail.com',
        ownerPhone: '+212700127892',
        planType: 'ENTERPRISE',
      },
    });
  }
}
