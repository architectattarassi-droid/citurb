import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";

/**
 * AdminRateLimitService — Sprint H couche 10.
 *
 * Sliding window rate limiter pour les endpoints admin.
 *  - 3 tentatives login échouées / 10 min / clé → lock 1h
 *  - 5 OTP demandés / 10 min / clé → lock 30 min
 *  - 20 requêtes admin (GET) / minute / IP → throttle 5 min
 *
 * Stockage en DB (AdminRateLimit) pour survivre aux restarts et fonctionner
 * en mode multi-instance Railway.
 */

type LimitConfig = {
  windowMs: number;
  maxAttempts: number;
  lockoutMs: number;
};

const LIMITS: Record<string, LimitConfig> = {
  LOGIN:      { windowMs: 10 * 60_000, maxAttempts: 3,  lockoutMs: 60 * 60_000 },  // 3/10min → lock 1h
  OTP_REQ:    { windowMs: 10 * 60_000, maxAttempts: 5,  lockoutMs: 30 * 60_000 },  // 5/10min → lock 30min
  OTP_VERIFY: { windowMs: 10 * 60_000, maxAttempts: 5,  lockoutMs: 30 * 60_000 },
  ADMIN_REQ:  { windowMs: 60_000,      maxAttempts: 30, lockoutMs: 5 * 60_000 },   // 30/1min → throttle 5min
};

@Injectable()
export class AdminRateLimitService {
  private readonly log = new Logger("AdminRateLimitService");
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vérifie si la clé est lockée. Retourne null si OK, ou un objet avec le temps restant.
   */
  async check(bucket: keyof typeof LIMITS, key: string): Promise<{ locked: boolean; retryAfterSec?: number }> {
    const limit = LIMITS[bucket];
    const fullKey = `${bucket}:${key}`;
    const row = await this.prisma.adminRateLimit.findUnique({ where: { key: fullKey } });

    const now = Date.now();
    if (row?.lockedUntil && row.lockedUntil.getTime() > now) {
      return { locked: true, retryAfterSec: Math.ceil((row.lockedUntil.getTime() - now) / 1000) };
    }

    if (!row) return { locked: false };

    // Sliding window : si la fenêtre est expirée, reset implicite à l'incrémentation
    const windowEnd = row.windowStart.getTime() + limit.windowMs;
    if (now > windowEnd) return { locked: false };

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
  async increment(bucket: keyof typeof LIMITS, key: string): Promise<void> {
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
    } else {
      await this.prisma.adminRateLimit.update({
        where: { key: fullKey },
        data: { attempts: row.attempts + 1 },
      });
    }
  }

  /**
   * Réinitialise le compteur (à appeler après login réussi).
   */
  async reset(bucket: keyof typeof LIMITS, key: string): Promise<void> {
    const fullKey = `${bucket}:${key}`;
    await this.prisma.adminRateLimit.deleteMany({ where: { key: fullKey } });
  }
}
