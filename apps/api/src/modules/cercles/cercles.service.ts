import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";

/**
 * CerclesService — Sprint C1 (CRUD + RBAC)
 * Spec : CERCLES-prompt-claude-code.md §2.2
 */

export type CreateCercleInput = {
  name: string;
  description?: string;
  visibility?: "PUBLIC" | "MEMBERS_ONLY" | "PRIVATE";
  region?: string;
  themes?: string[];
  firmId?: string;
};

export type UpdateCercleInput = {
  name?: string;
  description?: string;
  visibility?: "PUBLIC" | "MEMBERS_ONLY" | "PRIVATE";
  region?: string;
  themes?: string[];
};

@Injectable()
export class CerclesService {
  constructor(private readonly prisma: PrismaService) {}

  private async makeSlug(name: string): Promise<string> {
    const base = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "cercle";
    let slug = base;
    let i = 2;
    while (await this.prisma.cercle.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }

  async create(ownerId: string, input: CreateCercleInput) {
    if (!input.name?.trim()) throw new BadRequestException("Nom requis");
    const slug = await this.makeSlug(input.name);
    // Récupère le firmId du owner si non fourni
    let firmId = input.firmId;
    if (!firmId) {
      const owner = await this.prisma.user.findUnique({ where: { id: ownerId }, select: { firmId: true } });
      firmId = owner?.firmId ?? undefined;
    }
    return this.prisma.cercle.create({
      data: {
        slug,
        name: input.name.trim(),
        description: input.description ?? null,
        visibility: input.visibility ?? "MEMBERS_ONLY",
        region: input.region ?? null,
        themes: input.themes ?? [],
        ownerId,
        firmId: firmId ?? null,
        // Owner est ajouté comme membre OWNER + modérateur
        members: { create: { userId: ownerId, role: "OWNER", status: "ACTIVE" } },
        moderators: { create: { userId: ownerId } },
      },
    });
  }

  async list(userId: string, opts: { page?: number; pageSize?: number } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));
    const where = {
      deletedAt: null,
      OR: [
        { visibility: "PUBLIC" as const },
        { visibility: "MEMBERS_ONLY" as const },
        { members: { some: { userId, status: "ACTIVE" as const } } },
      ],
    };
    const [data, total] = await Promise.all([
      this.prisma.cercle.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { members: true, posts: true, rooms: true } },
          members: { where: { userId }, select: { role: true, status: true } },
        },
      }),
      this.prisma.cercle.count({ where }),
    ]);
    return { data, meta: { page, pageSize, total } };
  }

  async getBySlug(slug: string, userId: string) {
    const cercle = await this.prisma.cercle.findFirst({
      where: { slug, deletedAt: null },
      include: {
        owner: { select: { id: true, email: true, username: true } },
        _count: { select: { members: true, posts: true, rooms: true } },
        members: { where: { userId }, select: { role: true, status: true } },
      },
    });
    if (!cercle) throw new NotFoundException("Cercle introuvable");
    if (cercle.visibility === "PRIVATE") {
      const isMember = cercle.members.length > 0 && cercle.members[0].status === "ACTIVE";
      if (!isMember) throw new NotFoundException("Cercle introuvable");
    }
    return cercle;
  }

  async update(cercleId: string, userId: string, input: UpdateCercleInput) {
    await this.assertModerator(cercleId, userId);
    const data: any = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.description !== undefined) data.description = input.description;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    if (input.region !== undefined) data.region = input.region;
    if (input.themes !== undefined) data.themes = input.themes;
    return this.prisma.cercle.update({ where: { id: cercleId }, data });
  }

  async softDelete(cercleId: string, userId: string) {
    await this.assertOwner(cercleId, userId);
    return this.prisma.cercle.update({ where: { id: cercleId }, data: { deletedAt: new Date() } });
  }

  // ── Helpers RBAC ───────────────────────────────────────────────

  async isMember(cercleId: string, userId: string): Promise<boolean> {
    const m = await this.prisma.cercleMembership.findUnique({
      where: { cercleId_userId: { cercleId, userId } },
      select: { status: true },
    });
    return m?.status === "ACTIVE";
  }

  async assertMember(cercleId: string, userId: string) {
    if (!(await this.isMember(cercleId, userId))) throw new ForbiddenException("Membre requis");
  }

  async isModerator(cercleId: string, userId: string): Promise<boolean> {
    const cercle = await this.prisma.cercle.findUniqueOrThrow({ where: { id: cercleId }, select: { ownerId: true } });
    if (cercle.ownerId === userId) return true;
    const mod = await this.prisma.cercleModerator.findUnique({
      where: { cercleId_userId: { cercleId, userId } },
    });
    return !!mod;
  }

  async assertModerator(cercleId: string, userId: string) {
    if (!(await this.isModerator(cercleId, userId))) throw new ForbiddenException("Modérateur requis");
  }

  async assertOwner(cercleId: string, userId: string) {
    const cercle = await this.prisma.cercle.findUniqueOrThrow({ where: { id: cercleId }, select: { ownerId: true } });
    if (cercle.ownerId !== userId) throw new ForbiddenException("Owner requis");
  }
}
