import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { CerclesService } from "./cercles.service";

/**
 * MembershipsService — Sprint C1 (memberships flow)
 *
 * - join PUBLIC          → ACTIVE direct
 * - join MEMBERS_ONLY    → PENDING_REQUEST
 * - join PRIVATE         → forbidden (invitation requise)
 * - invite               → PENDING_INVITE
 * - accept invitation    → ACTIVE
 * - leave                → LEFT
 * - ban                  → BANNED
 */
@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cercles: CerclesService,
  ) {}

  async join(cercleId: string, userId: string) {
    const cercle = await this.prisma.cercle.findUniqueOrThrow({ where: { id: cercleId }, select: { visibility: true } });
    if (cercle.visibility === "PRIVATE") throw new BadRequestException("Cercle privé : invitation requise");
    const status = cercle.visibility === "PUBLIC" ? "ACTIVE" : "PENDING_REQUEST";
    return this.prisma.cercleMembership.upsert({
      where: { cercleId_userId: { cercleId, userId } },
      update: { status },
      create: { cercleId, userId, status, role: "MEMBER" },
    });
  }

  async leave(cercleId: string, userId: string) {
    const m = await this.prisma.cercleMembership.findUnique({ where: { cercleId_userId: { cercleId, userId } } });
    if (!m) throw new NotFoundException("Pas membre");
    return this.prisma.cercleMembership.update({
      where: { cercleId_userId: { cercleId, userId } },
      data: { status: "LEFT", leftAt: new Date() },
    });
  }

  async invite(cercleId: string, inviterId: string, userId: string, role: "MEMBER" | "CONTRIBUTOR" | "MODERATOR" = "MEMBER") {
    await this.cercles.assertModerator(cercleId, inviterId);
    return this.prisma.cercleMembership.upsert({
      where: { cercleId_userId: { cercleId, userId } },
      update: { status: "PENDING_INVITE", role },
      create: { cercleId, userId, status: "PENDING_INVITE", role },
    });
  }

  async acceptInvitation(cercleId: string, userId: string) {
    const m = await this.prisma.cercleMembership.findUnique({ where: { cercleId_userId: { cercleId, userId } } });
    if (!m || m.status !== "PENDING_INVITE") throw new BadRequestException("Aucune invitation à accepter");
    return this.prisma.cercleMembership.update({
      where: { cercleId_userId: { cercleId, userId } },
      data: { status: "ACTIVE", joinedAt: new Date() },
    });
  }

  async approveRequest(cercleId: string, approverId: string, userId: string) {
    await this.cercles.assertModerator(cercleId, approverId);
    return this.prisma.cercleMembership.update({
      where: { cercleId_userId: { cercleId, userId } },
      data: { status: "ACTIVE", joinedAt: new Date() },
    });
  }

  async listMembers(cercleId: string, viewerId: string) {
    // Cercles PUBLIC + MEMBERS_ONLY : tous les users connectés peuvent voir la liste
    // Cercles PRIVATE : seulement les membres ACTIVE peuvent voir
    const cercle = await this.prisma.cercle.findUniqueOrThrow({
      where: { id: cercleId },
      select: { visibility: true },
    });
    if (cercle.visibility === "PRIVATE") {
      await this.cercles.assertMember(cercleId, viewerId);
    }
    return this.prisma.cercleMembership.findMany({
      where: { cercleId, status: "ACTIVE" },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      include: {
        user: {
          select: {
            id: true, email: true, username: true,
            proProfile: { select: { displayName: true, title: true, avatarUrl: true, metier: true, villePrincipale: true } },
          },
        },
      },
    });
  }

  async promote(cercleId: string, ownerId: string, userId: string) {
    await this.cercles.assertOwner(cercleId, ownerId);
    await this.prisma.cercleModerator.upsert({
      where: { cercleId_userId: { cercleId, userId } },
      update: {},
      create: { cercleId, userId },
    });
    return this.prisma.cercleMembership.update({
      where: { cercleId_userId: { cercleId, userId } },
      data: { role: "MODERATOR" },
    });
  }

  async ban(cercleId: string, moderatorId: string, userId: string) {
    await this.cercles.assertModerator(cercleId, moderatorId);
    return this.prisma.cercleMembership.update({
      where: { cercleId_userId: { cercleId, userId } },
      data: { status: "BANNED", leftAt: new Date() },
    });
  }
}
