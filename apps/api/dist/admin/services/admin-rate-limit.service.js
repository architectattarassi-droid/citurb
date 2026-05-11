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
exports.AdminRateLimitService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const LIMITS = {
    LOGIN: { windowMs: 10 * 60_000, maxAttempts: 3, lockoutMs: 60 * 60_000 }, // 3/10min → lock 1h
    OTP_REQ: { windowMs: 10 * 60_000, maxAttempts: 5, lockoutMs: 30 * 60_000 }, // 5/10min → lock 30min
    OTP_VERIFY: { windowMs: 10 * 60_000, maxAttempts: 5, lockoutMs: 30 * 60_000 },
    ADMIN_REQ: { windowMs: 60_000, maxAttempts: 30, lockoutMs: 5 * 60_000 }, // 30/1min → throttle 5min
};
let AdminRateLimitService = class AdminRateLimitService {
    prisma;
    log = new common_1.Logger("AdminRateLimitService");
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Vérifie si la clé est lockée. Retourne null si OK, ou un objet avec le temps restant.
     */
    async check(bucket, key) {
        const limit = LIMITS[bucket];
        const fullKey = `${bucket}:${key}`;
        const row = await this.prisma.adminRateLimit.findUnique({ where: { key: fullKey } });
        const now = Date.now();
        if (row?.lockedUntil && row.lockedUntil.getTime() > now) {
            return { locked: true, retryAfterSec: Math.ceil((row.lockedUntil.getTime() - now) / 1000) };
        }
        if (!row)
            return { locked: false };
        // Sliding window : si la fenêtre est expirée, reset implicite à l'incrémentation
        const windowEnd = row.windowStart.getTime() + limit.windowMs;
        if (now > windowEnd)
            return { locked: false };
        if (row.attempts >= limit.maxAttempts) {
            // Trop d'attempts dans la fenêtre → lock
            const lockedUntil = new Date(now + limit.lockoutMs);
            await this.prisma.adminRateLimit.update({
                where: { key: fullKey },
                data: { lockedUntil },
            });
            return { locked: true, retryAfterSec: Math.ceil(limit.lockoutMs / 1000) };
        }
        return { locked: false };
    }
    /**
     * Incrémente le compteur. À appeler après check() OK et après l'événement
     * (login échoué, OTP demandé, etc.). Reset implicite si fenêtre expirée.
     */
    async increment(bucket, key) {
        const limit = LIMITS[bucket];
        const fullKey = `${bucket}:${key}`;
        const now = new Date();
        const row = await this.prisma.adminRateLimit.findUnique({ where: { key: fullKey } });
        if (!row) {
            await this.prisma.adminRateLimit.create({
                data: { key: fullKey, attempts: 1, windowStart: now },
            });
            return;
        }
        const windowEnd = row.windowStart.getTime() + limit.windowMs;
        if (now.getTime() > windowEnd) {
            // Fenêtre expirée → reset
            await this.prisma.adminRateLimit.update({
                where: { key: fullKey },
                data: { attempts: 1, windowStart: now, lockedUntil: null },
            });
        }
        else {
            await this.prisma.adminRateLimit.update({
                where: { key: fullKey },
                data: { attempts: row.attempts + 1 },
            });
        }
    }
    /**
     * Réinitialise le compteur (à appeler après login réussi).
     */
    async reset(bucket, key) {
        const fullKey = `${bucket}:${key}`;
        await this.prisma.adminRateLimit.deleteMany({ where: { key: fullKey } });
    }
};
exports.AdminRateLimitService = AdminRateLimitService;
exports.AdminRateLimitService = AdminRateLimitService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminRateLimitService);
