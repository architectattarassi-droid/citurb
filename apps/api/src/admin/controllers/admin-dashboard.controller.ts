import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { SuperAdminGuard } from "../guards/super-admin.guard";
import { AdminAuditService } from "../services/admin-audit.service";

/**
 * AdminDashboardController — Sprint H6.
 *
 * KPIs globaux : users, cercles, dossiers, paiements, incidents, audit log.
 */

@Tome("tome9")
@Controller("admin/dashboard")
@UseGuards(SuperAdminGuard)
export class AdminDashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get("kpi")
  async kpi() {
    const since24h = new Date(Date.now() - 24 * 3600_000);
    const since7d = new Date(Date.now() - 7 * 24 * 3600_000);

    const [
      usersTotal, usersActive, usersLast24h,
      cerclesTotal, cerclesActive,
      postsTotal, postsLast24h,
      messagesTotal, messagesLast24h,
      dossiersTotal, dossiersActive,
      paymentsTotal,
      incidentsTotal, incidentsCritical24h,
      adminAuditLast7d,
      adminAlertsUnread,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.cercle.count(),
      this.prisma.cercle.count({ where: { deletedAt: null } }),
      this.prisma.cerclePost.count(),
      this.prisma.cerclePost.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.cercleMessage.count(),
      this.prisma.cercleMessage.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.dossier.count().catch(() => 0),
      this.prisma.dossier.count({ where: { } }).catch(() => 0),
      this.prisma.payment.count().catch(() => 0),
      this.prisma.incident.count().catch(() => 0),
      this.prisma.incident.count({ where: { createdAt: { gte: since24h }, severity: "CRITICAL" } }).catch(() => 0),
      this.prisma.adminAuditLog.count({ where: { createdAt: { gte: since7d } } }),
      this.prisma.adminAlert.count({ where: { readAt: null } }),
    ]);

    return {
      users: { total: usersTotal, active: usersActive, last24h: usersLast24h },
      cercles: { total: cerclesTotal, active: cerclesActive },
      posts: { total: postsTotal, last24h: postsLast24h },
      messages: { total: messagesTotal, last24h: messagesLast24h },
      dossiers: { total: dossiersTotal, active: dossiersActive },
      payments: { total: paymentsTotal },
      incidents: { total: incidentsTotal, critical24h: incidentsCritical24h },
      adminAuditLast7d,
      adminAlertsUnread,
    };
  }

  @Get("audit")
  async auditLog(@Query("limit") limit?: string, @Query("category") category?: string, @Query("severity") severity?: string) {
    return { ok: true, data: await this.audit.listRecent(limit ? Number(limit) : 100, { category, severity }) };
  }

  @Get("audit/verify")
  async verifyAudit() {
    return { ok: true, data: await this.audit.verifyChain(1000) };
  }

  @Get("alerts")
  async alerts(@Query("unreadOnly") unreadOnly?: string) {
    return {
      ok: true,
      data: await this.prisma.adminAlert.findMany({
        where: unreadOnly === "true" ? { readAt: null } : undefined,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    };
  }

  @Get("sessions")
  async sessions() {
    return {
      ok: true,
      data: await this.prisma.adminSession.findMany({
        where: { revokedAt: null, jwtExpiresAt: { gt: new Date() } },
        orderBy: { fullyAuthAt: "desc" },
        take: 50,
        include: { adminUser: { select: { id: true, email: true, displayName: true, role: true } } },
      }),
    };
  }
}
