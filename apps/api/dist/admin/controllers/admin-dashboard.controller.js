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
exports.AdminDashboardController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const super_admin_guard_1 = require("../guards/super-admin.guard");
const admin_audit_service_1 = require("../services/admin-audit.service");
/**
 * AdminDashboardController — Sprint H6.
 *
 * KPIs globaux : users, cercles, dossiers, paiements, incidents, audit log.
 */
let AdminDashboardController = class AdminDashboardController {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async kpi() {
        const since24h = new Date(Date.now() - 24 * 3600_000);
        const since7d = new Date(Date.now() - 7 * 24 * 3600_000);
        const [usersTotal, usersActive, usersLast24h, cerclesTotal, cerclesActive, postsTotal, postsLast24h, messagesTotal, messagesLast24h, dossiersTotal, dossiersActive, paymentsTotal, incidentsTotal, incidentsCritical24h, adminAuditLast7d, adminAlertsUnread,] = await Promise.all([
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
            this.prisma.dossier.count({ where: {} }).catch(() => 0),
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
    async auditLog(limit, category, severity) {
        return { ok: true, data: await this.audit.listRecent(limit ? Number(limit) : 100, { category, severity }) };
    }
    async verifyAudit() {
        return { ok: true, data: await this.audit.verifyChain(1000) };
    }
    async alerts(unreadOnly) {
        return {
            ok: true,
            data: await this.prisma.adminAlert.findMany({
                where: unreadOnly === "true" ? { readAt: null } : undefined,
                orderBy: { createdAt: "desc" },
                take: 100,
            }),
        };
    }
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
};
exports.AdminDashboardController = AdminDashboardController;
__decorate([
    (0, common_1.Get)("kpi"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "kpi", null);
__decorate([
    (0, common_1.Get)("audit"),
    __param(0, (0, common_1.Query)("limit")),
    __param(1, (0, common_1.Query)("category")),
    __param(2, (0, common_1.Query)("severity")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "auditLog", null);
__decorate([
    (0, common_1.Get)("audit/verify"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "verifyAudit", null);
__decorate([
    (0, common_1.Get)("alerts"),
    __param(0, (0, common_1.Query)("unreadOnly")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "alerts", null);
__decorate([
    (0, common_1.Get)("sessions"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "sessions", null);
exports.AdminDashboardController = AdminDashboardController = __decorate([
    (0, tome_at_1.Tome)("tome9"),
    (0, common_1.Controller)("admin/dashboard"),
    (0, common_1.UseGuards)(super_admin_guard_1.SuperAdminGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        admin_audit_service_1.AdminAuditService])
], AdminDashboardController);
