"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminActionsController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const super_admin_guard_1 = require("../guards/super-admin.guard");
const admin_audit_service_1 = require("../services/admin-audit.service");
const admin_notify_service_1 = require("../services/admin-notify.service");
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
let AdminActionsController = class AdminActionsController {
    prisma;
    jwt;
    audit;
    notify;
    constructor(prisma, jwt, audit, notify) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.audit = audit;
        this.notify = notify;
    }
    auditCtx(req) {
        return {
            adminUserId: req.admin.id,
            ipAddress: req.admin.ipAddress,
            userAgent: req.headers["user-agent"],
            deviceFingerprint: req.admin.deviceFingerprint,
            sessionId: req.admin.sessionId,
        };
    }
    // ── Users : liste + kill switch ─────────────────────────────────
    async listUsers(q, limit) {
        const where = q ? {
            OR: [
                { email: { contains: q, mode: "insensitive" } },
                { username: { contains: q, mode: "insensitive" } },
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
    async suspendUser(req, userId, body) {
        if (!body.reason?.trim())
            throw new common_1.BadRequestException("Motif requis");
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
    async unsuspendUser(req, userId) {
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
    async suspendCercle(req, cercleId, body) {
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
    async unsuspendCercle(req, cercleId) {
        await this.prisma.cercle.update({ where: { id: cercleId }, data: { deletedAt: null } });
        await this.audit.record({
            ...this.auditCtx(req),
            action: "CERCLE_UNSUSPEND", category: "CERCLE", severity: "WARN",
            targetType: "Cercle", targetId: cercleId,
        });
        return { ok: true };
    }
    // ── Posts / Messages : delete ──────────────────────────────────
    async deletePost(req, postId, body) {
        await this.prisma.cerclePost.update({ where: { id: postId }, data: { deletedAt: new Date() } });
        await this.audit.record({
            ...this.auditCtx(req),
            action: "POST_DELETE_ADMIN", category: "CERCLE", severity: "WARN",
            targetType: "CerclePost", targetId: postId,
            payload: { reason: body.reason || null },
        });
        return { ok: true };
    }
    async deleteMessage(req, messageId, body) {
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
    async impersonate(req, userId, body) {
        if (!body.reason?.trim())
            throw new common_1.BadRequestException("Motif requis (audit)");
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
    async exportRgpd(req, userId) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const [profile, dossiers, cercleMemberships, posts, messages, payments, connections,] = await Promise.all([
            this.prisma.proProfile.findUnique({ where: { userId } }),
            this.prisma.dossier.findMany({ where: { ownerId: userId } }).catch(() => []),
            this.prisma.cercleMembership.findMany({ where: { userId }, include: { cercle: { select: { id: true, slug: true, name: true } } } }),
            this.prisma.cerclePost.findMany({ where: { authorId: userId } }),
            this.prisma.cercleMessage.findMany({ where: { authorId: userId } }),
            this.prisma.payment.findMany({ where: {} }).catch(() => []),
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
    async createSubAdmin(req, body) {
        if (body.role === "SUPER_ADMIN") {
            throw new common_1.ForbiddenException("Création d'autres SUPER_ADMIN interdite");
        }
        if (!body.email || !body.initialPassword || !body.role || !body.displayName) {
            throw new common_1.BadRequestException("Champs manquants");
        }
        const bcrypt = require("bcryptjs");
        const passwordHash = await bcrypt.hash(body.initialPassword, 14);
        const created = await this.prisma.adminUser.create({
            data: {
                email: body.email.trim().toLowerCase(),
                passwordHash,
                role: body.role,
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
    async suspendAdmin(req, adminId, body) {
        if (adminId === req.admin.id)
            throw new common_1.ForbiddenException("Tu ne peux pas te suspendre toi-même");
        const target = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: adminId } });
        if (target.role === "SUPER_ADMIN")
            throw new common_1.ForbiddenException("Le SUPER_ADMIN ne peut pas être suspendu");
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
    async myIps(req) {
        return {
            ok: true,
            data: await this.prisma.adminAllowedIp.findMany({
                where: { adminUserId: req.admin.id, revokedAt: null },
                orderBy: { addedAt: "desc" },
            }),
        };
    }
    async addMyIp(req, body) {
        if (!body.cidr || !body.label)
            throw new common_1.BadRequestException("CIDR + label requis");
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
    async revokeIp(req, id) {
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
};
exports.AdminActionsController = AdminActionsController;
__decorate([
    (0, common_1.Get)("users"),
    __param(0, (0, common_1.Query)("q")),
    __param(1, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminActionsController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Post)("users/:userId/suspend"),
    (0, super_admin_guard_1.RequireAdminRole)("SUPER_ADMIN", "ADMIN_SUPPORT"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("userId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminActionsController.prototype, "suspendUser", null);
__decorate([
    (0, common_1.Post)("users/:userId/unsuspend"),
    (0, super_admin_guard_1.RequireAdminRole)("SUPER_ADMIN", "ADMIN_SUPPORT"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminActionsController.prototype, "unsuspendUser", null);
__decorate([
    (0, common_1.Post)("cercles/:cercleId/suspend"),
    (0, super_admin_guard_1.RequireAdminRole)("SUPER_ADMIN", "ADMIN_SUPPORT"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminActionsController.prototype, "suspendCercle", null);
__decorate([
    (0, common_1.Post)("cercles/:cercleId/unsuspend"),
    (0, super_admin_guard_1.RequireAdminRole)("SUPER_ADMIN"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminActionsController.prototype, "unsuspendCercle", null);
__decorate([
    (0, common_1.Delete)("cercles/posts/:postId"),
    (0, super_admin_guard_1.RequireAdminRole)("SUPER_ADMIN", "ADMIN_SUPPORT"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("postId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminActionsController.prototype, "deletePost", null);
__decorate([
    (0, common_1.Delete)("cercles/messages/:messageId"),
    (0, super_admin_guard_1.RequireAdminRole)("SUPER_ADMIN", "ADMIN_SUPPORT"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("messageId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminActionsController.prototype, "deleteMessage", null);
__decorate([
    (0, common_1.Post)("impersonate/:userId"),
    (0, super_admin_guard_1.RequireAdminRole)("SUPER_ADMIN", "ADMIN_SUPPORT"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("userId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminActionsController.prototype, "impersonate", null);
__decorate([
    (0, common_1.Get)("export-rgpd/:userId"),
    (0, super_admin_guard_1.RequireAdminRole)("SUPER_ADMIN", "ADMIN_AUDIT"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminActionsController.prototype, "exportRgpd", null);
__decorate([
    (0, common_1.Get)("admins"),
    (0, super_admin_guard_1.RequireAdminRole)("SUPER_ADMIN", "ADMIN_AUDIT"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminActionsController.prototype, "listAdmins", null);
__decorate([
    (0, common_1.Post)("admins"),
    (0, super_admin_guard_1.RequireAdminRole)("SUPER_ADMIN"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminActionsController.prototype, "createSubAdmin", null);
__decorate([
    (0, common_1.Post)("admins/:adminId/suspend"),
    (0, super_admin_guard_1.RequireAdminRole)("SUPER_ADMIN"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("adminId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminActionsController.prototype, "suspendAdmin", null);
__decorate([
    (0, common_1.Get)("my-ips"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminActionsController.prototype, "myIps", null);
__decorate([
    (0, common_1.Post)("my-ips"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminActionsController.prototype, "addMyIp", null);
__decorate([
    (0, common_1.Delete)("my-ips/:id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminActionsController.prototype, "revokeIp", null);
exports.AdminActionsController = AdminActionsController = __decorate([
    (0, tome_at_1.Tome)("tome9"),
    (0, common_1.Controller)("admin"),
    (0, common_1.UseGuards)(super_admin_guard_1.SuperAdminGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        admin_audit_service_1.AdminAuditService,
        admin_notify_service_1.AdminNotifyService])
], AdminActionsController);
