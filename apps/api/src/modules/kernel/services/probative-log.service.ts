import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../../../tomes/tome-at/kernel/prisma/prisma.service";

/**
 * ProbativeLogService — journal probatoire append-only avec chaîne de hashs
 *
 * Doctrine T@-R-TRACE-001:
 *   chaque entrée contient hash(prevHash + payload) pour détection de
 *   manipulation a posteriori. Toute rupture de chaîne = compromission DB.
 *
 * Performance: sériel (verrou logique) pour garantir la chaîne. Si volume élevé,
 * basculer sur batching avec transaction (TODO).
 */
@Injectable()
export class ProbativeLogService {
  private readonly logger = new Logger(ProbativeLogService.name);
  // Cache du dernier hash pour éviter une lecture DB par append (best-effort).
  private lastHashCache: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async append(payload: Record<string, any>): Promise<{ ok: boolean; hash?: string }> {
    try {
      const prevHash = await this.getLastHash();
      const serialized = JSON.stringify(payload, Object.keys(payload).sort());
      const hash = createHash("sha256").update(`${prevHash || ""}|${serialized}`).digest("hex");

      const row = await this.prisma.probativeLog.create({
        data: { prevHash, hash, payload: payload as any },
        select: { hash: true },
      });
      this.lastHashCache = row.hash;
      return { ok: true, hash: row.hash };
    } catch (e: any) {
      this.logger.error(`[ProbativeLog] Append failed: ${e?.message}`, e?.stack);
      return { ok: false };
    }
  }

  /**
   * Vérifie l'intégrité de la chaîne (à la demande, pour audit).
   */
  async verifyChain(opts: { take?: number } = {}): Promise<{ ok: boolean; checked: number; broken?: { id: string; expected: string; actual: string } }> {
    const rows = await this.prisma.probativeLog.findMany({
      orderBy: { createdAt: "asc" },
      take: opts.take ?? 1000,
      select: { id: true, prevHash: true, hash: true, payload: true },
    });
    let prev: string | null = null;
    for (const r of rows) {
      const serialized: string = JSON.stringify(r.payload, Object.keys(r.payload as any).sort());
      const expectedHash: string = createHash("sha256").update(`${prev || ""}|${serialized}`).digest("hex");
      if (expectedHash !== r.hash) {
        return { ok: false, checked: rows.length, broken: { id: r.id, expected: expectedHash, actual: r.hash } };
      }
      if ((r.prevHash || null) !== (prev || null)) {
        return { ok: false, checked: rows.length, broken: { id: r.id, expected: prev || "", actual: r.prevHash || "" } };
      }
      prev = r.hash;
    }
    return { ok: true, checked: rows.length };
  }

  private async getLastHash(): Promise<string | null> {
    if (this.lastHashCache !== null) return this.lastHashCache;
    const last = await this.prisma.probativeLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: { hash: true },
    });
    this.lastHashCache = last?.hash ?? null;
    return this.lastHashCache;
  }
}
