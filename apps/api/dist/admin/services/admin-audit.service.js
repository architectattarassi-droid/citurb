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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const device_fingerprint_1 = require("../utils/device-fingerprint");
let AdminAuditService = class AdminAuditService {
    prisma;
    log = new common_1.Logger("AdminAuditService");
    constructor(prisma) {
        this.prisma = prisma;
    }
    async record(input) {
        // Récupère le dernier hash pour chaîner
        const last = await this.prisma.adminAuditLog.findFirst({
            orderBy: { createdAt: "desc" },
            select: { hash: true },
        });
        const prevHash = last?.hash ?? null;
        const payload = {
            action: input.action,
            category: input.category,
            severity: input.severity ?? "INFO",
            targetType: input.targetType ?? null,
            targetId: input.targetId ?? null,
            adminUserId: input.adminUserId ?? null,
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
            deviceFingerprint: input.deviceFingerprint ?? null,
            sessionId: input.sessionId ?? null,
            payload: input.payload ?? {},
            ts: new Date().toISOString(),
        };
        const hash = (0, device_fingerprint_1.hashAuditPayload)(prevHash, payload);
        const entry = await this.prisma.adminAuditLog.create({
            data: {
                adminUserId: input.adminUserId ?? null,
                prevHash,
                hash,
                action: input.action,
                category: input.category,
                severity: input.severity ?? "INFO",
                targetType: input.targetType ?? null,
                targetId: input.targetId ?? null,
                payload: input.payload,
                ipAddress: input.ipAddress ?? null,
                userAgent: input.userAgent ?? null,
                deviceFingerprint: input.deviceFingerprint ?? null,
                sessionId: input.sessionId ?? null,
            },
        });
        if (input.severity === "CRITICAL") {
            this.log.warn(`[Audit-CRITICAL] ${input.action} target=${input.targetType}:${input.targetId} hash=${hash.slice(0, 12)}…`);
        }
        return entry;
    }
    /**
     * Vérifie l'intégrité de la chaîne. Retourne :
     *  - { ok: true, count }   si la chaîne est cohérente
     *  - { ok: false, brokenAt, count } si un log est corrompu
     */
    async verifyChain(limit = 1000) {
        const logs = await this.prisma.adminAuditLog.findMany({
            orderBy: { createdAt: "asc" },
            take: limit,
        });
        let prev = null;
        for (let i = 0; i < logs.length; i++) {
            const l = logs[i];
            const expected = (0, device_fingerprint_1.hashAuditPayload)(prev, {
                action: l.action,
                category: l.category,
                severity: l.severity,
                targetType: l.targetType,
                targetId: l.targetId,
                adminUserId: l.adminUserId,
                ipAddress: l.ipAddress,
                userAgent: l.userAgent,
                deviceFingerprint: l.deviceFingerprint,
                sessionId: l.sessionId,
                payload: l.payload ?? {},
                ts: l.createdAt.toISOString(),
            });
            if (expected !== l.hash) {
                return { ok: false, brokenAt: l.id, index: i, count: logs.length };
            }
            prev = l.hash;
        }
        return { ok: true, count: logs.length };
    }
    async listRecent(limit = 100, filter) {
        return this.prisma.adminAuditLog.findMany({
            where: {
                ...(filter?.adminUserId ? { adminUserId: filter.adminUserId } : {}),
                ...(filter?.category ? { category: filter.category } : {}),
                ...(filter?.severity ? { severity: filter.severity } : {}),
            },
            orderBy: { createdAt: "desc" },
            take: Math.min(500, limit),
            include: {
                adminUser: { select: { id: true, email: true, displayName: true, role: true } },
            },
        });
    }
};
exports.AdminAuditService = AdminAuditService;
exports.AdminAuditService = AdminAuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminAuditService);
