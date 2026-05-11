import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { hashAuditPayload } from "../utils/device-fingerprint";

/**
 * AdminAuditService — Sprint H couche 8 (audit immuable hash-chain).
 *
 * Chaque action admin (login, kill switch, override, impersonate, export…)
 * est loggée dans AdminAuditLog avec :
 *   hash = SHA-256(prevHash + JSON(payload))
 *
 * Toute altération d'un log précédent invalide la chaîne entière.
 * Vérifiable via verifyChain() qui re-calcule la chaîne du dernier au premier.
 */

type LogInput = {
  adminUserId?: string;
  action: string;
  category: "AUTH" | "USER" | "CERCLE" | "DOSSIER" | "PAYMENT" | "EXPORT" | "SYSTEM" | "ADMIN";
  severity?: "INFO" | "WARN" | "CRITICAL";
  targetType?: string;
  targetId?: string;
  payload?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  sessionId?: string;
};

@Injectable()
export class AdminAuditService {
  private readonly log = new Logger("AdminAuditService");
  constructor(private readonly prisma: PrismaService) {}

  async record(input: LogInput) {
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

    const hash = hashAuditPayload(prevHash, payload);

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
        payload: input.payload as any,
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
    let prev: string | null = null;
    for (let i = 0; i < logs.length; i++) {
      const l = logs[i];
      const expected = hashAuditPayload(prev, {
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
        return { ok: false as const, brokenAt: l.id, index: i, count: logs.length };
      }
      prev = l.hash;
    }
    return { ok: true as const, count: logs.length };
  }

  async listRecent(limit = 100, filter?: { adminUserId?: string; category?: string; severity?: string }) {
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
}
