import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards, ForbiddenException, BadRequestException } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { SuperAdminGuard, RequireAdminRole } from "../guards/super-admin.guard";
import { AdminAuditService } from "../services/admin-audit.service";
import { AdminNotifyService } from "../services/admin-notify.service";

/**
 * AdminActionsController — Sprint H7.
 *
 * Actions de contrôle de la plateforme :
 *  - Kill switch user / cercle / post / message
 *  - Impersonate user (génère JWT user avec audit log)
 *  - Override statut dossier
 *  - Export RGPD (zip JSON de toutes les données d'un user)
 *  - Lecture seule globale (mode urgence)
 *
 * Permissions par rôle :
 *  - SUPER_ADMIN : tout
 *  - ADMIN_SUPPORT : kill switch user/cercle/post/message + impersonate (avec log)
 *  - ADMIN_AUDIT : export RGPD + lecture seule
 *  - ADMIN_READ_ONLY : aucune action ici
 */

@Tome("tome9")
@Controller("admin")
@UseGuards(SuperAdminGuard)
export class AdminActionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AdminAuditService,
    private readonly notify: AdminNotifyService,
  ) {}

  private auditCtx(req: any) {
    return {
      adminUserId: req.admin.id,
      ipAddress: req.admin.ipAddress,
      userAgent: req.headers["user-agent"],
      deviceFingerprint: req.admin.deviceFingerprint,
      sessionId: req.admin.sessionId,
    };
  }

  // ── Users : liste + kill switch ─────────────────────────────────

  @Get("users")
  async listUsers(@Query("q") q?: string, @Query("limit") limit?: string) {
    const where = q ? {
      OR: [
        { email: { contains: q, mode: "insensitive" as const } },
        { username: { contains: q, mode: "insensitive" as const } },
      ],
    } : {};
    return {
      ok: true,
      data: await this.prisma.user.findMany({
        where,
        select: {
          id: true, email: true, username: true, role: true, plan: true, isActive: true,
          createdAt: true, emailVerifiedAt: true, phoneVerifiedAt: true,
          _count: { select: { ownedDossiers: true, cerclesOwned: true, cerclePosts: true, cercleMessages: true } },
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(500, limit ? Number(limit) : 50),
      }),
    };
  }

  @Post("users/:userId/suspend")
  @RequireAdminRole("SUPER_ADMIN", "ADMIN_SUPPORT")
  async suspendUser(@Req() req: any, @Param("userId") userId: string, @Body() body: { reason: string }) {
    if (!body.reason?.trim()) throw new BadRequestException("Motif requis");
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    await this.audit.record({
      ...this.auditCtx(req),
      action: "USER_SUSPEND", category: "USER", severity: "CRITICAL",
      targetType: "User", targetId: userId,
      payload: { reason: body.reason, email: user.email },
    });
    await this.notify.alert({
      adminUserId: req.admin.id,
      severity: "WARN", category: "KILL_SWITCH",
      title: `Utilisateur suspendu : ${user.email}`,
      message: `Suspendu par ${req.admin.email}. Motif : ${body.reason}`,
      emailTo: req.admin.email,
    });
    return { ok: true, data: { id: user.id, isActive: false } };
  }

  @Post("users/:userId/unsuspend")
  @RequireAdminRole("SUPER_ADMIN", "ADMIN_SUPPORT")
  async unsuspendUser(@Req() req: any, @Param("userId") userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
    await this.audit.record({
      ...this.auditCtx(req),
      action: "USER_UNSUSPEND", category: "USER", severity: "WARN",
      targetType: "User", targetId: userId,
      payload: { email: user.email },
    });
    return { ok: true };
  }

  // ── Cercles : kill switch ──────────────────────────────────────

  @Post("cercles/:cercleId/suspend")
  @RequireAdminRole("SUPER_ADMIN", "ADMIN_SUPPORT")
  async suspendCercle(@Req() req: any, @Param("cercleId") cercleId: string, @Body() body: { reason: string }) {
    const cercle = await this.prisma.cercle.update({
      where: { id: cercleId },
      data: { deletedAt: new Date() },
    });
    await this.audit.record({
      ...this.auditCtx(req),
      action: "CERCLE_SUSPEND", category: "CERCLE", severity: "CRITICAL",
      targetType: "Cercle", targetId: cercleId,
      payload: { reason: body.reason || null, slug: cercle.slug },
    });
    return { ok: true };
  }

  @Post("cercles/:cercleId/unsuspend")
  @RequireAdminRole("SUPER_ADMIN")
  async unsuspendCercle(@Req() req: any, @Param("cercleId") cercleId: string) {
    await this.prisma.cercle.update({ where: { id: cercleId }, data: { deletedAt: null } });
    await this.audit.record({
      ...this.auditCtx(req),
      action: "CERCLE_UNSUSPEND", category: "CERCLE", severity: "WARN",
      targetType: "Cercle", targetId: cercleId,
    });
    return { ok: true };
  }

  // ── Posts / Messages : delete ──────────────────────────────────

  @Delete("cercles/posts/:postId")
  @RequireAdminRole("SUPER_ADMIN", "ADMIN_SUPPORT")
  async deletePost(@Req() req: any, @Param("postId") postId: string, @Body() body: { reason?: string }) {
    await this.prisma.cerclePost.update({ where: { id: postId }, data: { deletedAt: new Date() } });
    await this.audit.record({
      ...this.auditCtx(req),
      action: "POST_DELETE_ADMIN", category: "CERCLE", severity: "WARN",
      targetType: "CerclePost", targetId: postId,
      payload: { reason: body.reason || null },
    });
    return { ok: true };
  }

  @Delete("cercles/messages/:messageId")
  @RequireAdminRole("SUPER_ADMIN", "ADMIN_SUPPORT")
  async deleteMessage(@Req() req: any, @Param("messageId") messageId: string, @Body() body: { reason?: string }) {
    await this.prisma.cercleMessage.update({ where: { id: messageId }, data: { deletedAt: new Date(), body: "" } });
    await this.audit.record({
      ...this.auditCtx(req),
      action: "MESSAGE_DELETE_ADMIN", category: "CERCLE", severity: "WARN",
      targetType: "CercleMessage", targetId: messageId,
      payload: { reason: body.reason || null },
    });
    return { ok: true };
  }

  // ── Impersonate user ──────────────────────────────────────────

  @Post("impersonate/:userId")
  @RequireAdminRole("SUPER_ADMIN", "ADMIN_SUPPORT")
  async impersonate(@Req() req: any, @Param("userId") userId: string, @Body() body: { reason: string }) {
    if (!body.reason?.trim()) throw new BadRequestException("Motif requis (audit)");
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const impersonationToken = await this.jwt.signAsync({
      sub: user.id, email: user.email, role: user.role,
      impersonatedBy: req.admin.id,
      impersonationAuditId: null, // sera rempli par audit
    }, {
      audience: "citurbarea-user",
      expiresIn: "30m", // session courte pour impersonation
    });

    const auditEntry = await this.audit.record({
      ...this.auditCtx(req),
      action: "IMPERSONATE_START", category: "USER", severity: "CRITICAL",
      targetType: "User", targetId: userId,
      payload: { reason: body.reason, userEmail: user.email, durationMin: 30 },
    });

    return {
      ok: true,
      data: {
        access_token: impersonationToken,
        impersonatedUser: { id: user.id, email: user.email, role: user.role },
        auditId: auditEntry.id,
        expiresInMin: 30,
      },
    };
  }

  // ── Export RGPD ───────────────────────────────────────────────

  @Get("export-rgpd/:userId")
  @RequireAdminRole("SUPER_ADMIN", "ADMIN_AUDIT")
  async exportRgpd(@Req() req: any, @Param("userId") userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const [
      profile, dossiers, cercleMemberships, posts, messages, payments, connections,
    ] = await Promise.all([
      this.prisma.proProfile.findUnique({ where: { userId } }),
      this.prisma.dossier.findMany({ where: { ownerId: userId } }).catch(() => []),
      this.prisma.cercleMembership.findMany({ where: { userId }, include: { cercle: { select: { id: true, slug: true, name: true } } } }),
      this.prisma.cerclePost.findMany({ where: { authorId: userId } }),
      this.prisma.cercleMessage.findMany({ where: { authorId: userId } }),
      this.prisma.payment.findMany({ where: { } }).catch(() => []),
      this.prisma.connection.findMany({ where: { OR: [{ fromUserId: userId }, { toUserId: userId }] } }).catch(() => []),
    ]);

    await this.audit.record({
      ...this.auditCtx(req),
      action: "EXPORT_RGPD", category: "EXPORT", severity: "CRITICAL",
      targetType: "User", targetId: userId,
      payload: { email: user.email, dossiers: dossiers.length, posts: posts.length, messages: messages.length },
    });
    await this.notify.alert({
      adminUserId: req.admin.id,
      severity: "CRITICAL", category: "EXPORT_RGPD",
      title: `Export RGPD utilisateur ${user.email}`,
      message: `${req.admin.email} a exporté toutes les données de ${user.email}. Audit ID dans les logs.`,
      emailTo: req.admin.email,
    });

    return {
      ok: true,
      data: {
        exportedAt: new Date().toISOString(),
        exportedBy: req.admin.email,
        user: {
          id: user.id, email: user.email, username: user.username, role: user.role,
          plan: user.plan, isActive: user.isActive,
          createdAt: user.createdAt, emailVerifiedAt: user.emailVerifiedAt,
        },
        profile,
        dossiers,
        cercleMemberships,
        posts: posts.map(p => ({ id: p.id, body: p.body, title: p.title, createdAt: p.createdAt })),
        messages: messages.map(m => ({ id: m.id, body: m.body, createdAt: m.createdAt })),
        payments,
        connections,
      },
    };
  }

  // ── Sub-admins (création limitée au SUPER_ADMIN) ──────────────

  @Get("admins")
  @RequireAdminRole("SUPER_ADMIN", "ADMIN_AUDIT")
  async listAdmins() {
    return {
      ok: true,
      data: await this.prisma.adminUser.findMany({
        select: {
          id: true, email: true, displayName: true, role: true, phoneE164: true,
          isActive: true, suspendedAt: true, lastLoginAt: true, lastLoginIp: true,
          loginCount: true, createdAt: true,
          _count: { select: { sessions: true, credentials: true, allowedIps: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    };
  }

  @Post("admins")
  @RequireAdminRole("SUPER_ADMIN")
  async createSubAdmin(@Req() req: any, @Body() body: {
    email: string; displayName: string; phoneE164: string;
    role: "ADMIN_SUPPORT" | "ADMIN_AUDIT" | "ADMIN_READ_ONLY";
    initialPassword: string;
  }) {
    if (body.role === ("SUPER_ADMIN" as any)) {
      throw new ForbiddenException("Création d'autres SUPER_ADMIN interdite");
    }
    if (!body.email || !body.initialPassword || !body.role || !body.displayName) {
      throw new BadRequestException("Champs manquants");
    }
    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash(body.initialPassword, 14);
    const created = await this.prisma.adminUser.create({
      data: {
        email: body.email.trim().toLowerCase(),
        passwordHash,
        role: body.role as any,
        displayName: body.displayName,
        phoneE164: body.phoneE164,
        createdById: req.admin.id,
        isActive: true,
      },
    });
    await this.audit.record({
      ...this.auditCtx(req),
      action: "SUB_ADMIN_CREATED", category: "ADMIN", severity: "CRITICAL",
      targetType: "AdminUser", targetId: created.id,
      payload: { email: created.email, role: created.role },
    });
    return { ok: true, data: { id: created.id, email: created.email, role: created.role } };
  }

  @Post("admins/:adminId/suspend")
  @RequireAdminRole("SUPER_ADMIN")
  async suspendAdmin(@Req() req: any, @Param("adminId") adminId: string, @Body() body: { reason: string }) {
    if (adminId === req.admin.id) throw new ForbiddenException("Tu ne peux pas te suspendre toi-même");
    const target = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    if (target.role === "SUPER_ADMIN") throw new ForbiddenException("Le SUPER_ADMIN ne peut pas être suspendu");
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { isActive: false, suspendedAt: new Date(), suspendedReason: body.reason },
    });
    await this.audit.record({
      ...this.auditCtx(req),
      action: "SUB_ADMIN_SUSPEND", category: "ADMIN", severity: "CRITICAL",
      targetType: "AdminUser", targetId: adminId,
      payload: { reason: body.reason, email: target.email },
    });
    return { ok: true };
  }

  // ── IPs allowlist ─────────────────────────────────────────────

  @Get("my-ips")
  async myIps(@Req() req: any) {
    return {
      ok: true,
      data: await this.prisma.adminAllowedIp.findMany({
        where: { adminUserId: req.admin.id, revokedAt: null },
        orderBy: { addedAt: "desc" },
      }),
    };
  }

  @Post("my-ips")
  async addMyIp(@Req() req: any, @Body() body: { cidr: string; label: string }) {
    if (!body.cidr || !body.label) throw new BadRequestException("CIDR + label requis");
    const created = await this.prisma.adminAllowedIp.create({
      data: { adminUserId: req.admin.id, cidr: body.cidr, label: body.label },
    });
    await this.audit.record({
      ...this.auditCtx(req),
      action: "IP_ALLOWLIST_ADD", category: "ADMIN", severity: "WARN",
      payload: { cidr: body.cidr, label: body.label },
    });
    return { ok: true, data: created };
  }

  @Delete("my-ips/:id")
  async revokeIp(@Req() req: any, @Param("id") id: string) {
    await this.prisma.adminAllowedIp.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      ...this.auditCtx(req),
      action: "IP_ALLOWLIST_REVOKE", category: "ADMIN", severity: "WARN",
      payload: { ipId: id },
    });
    return { ok: true };
  }
}
