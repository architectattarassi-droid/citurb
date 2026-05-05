import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../tomes/tome-at/kernel/prisma/prisma.service";
import { ProbativeLogService } from "./probative-log.service";

/**
 * IncidentsService — création des incidents en base
 *
 * Doctrine T@-R-TRACE-001: chaque violation doit produire:
 *  - une row Incident (auditable)
 *  - une row ProbativeLog (chaînée par hash)
 *  - une row IncidentEvent initiale
 *
 * Les enums Prisma supportés:
 *   IncidentCategory: DOCTRINE_BLOCK | BYPASS_RISK | DISINTERMEDIATION_RISK |
 *                     STATE_TAMPER | PAYMENT_TAMPER | DATA_EXFILTRATION_RISK |
 *                     OFF_PLATFORM_CHANNEL_RISK | IA_POLICY_VIOLATION |
 *                     ENTITLEMENT_BYPASS | GEO_VIOLATION | CYCLE_OVERRUN
 *   IncidentSeverity: INFO | WARN | CRITICAL
 *   ActorType:        CLIENT | OPERATOR | OPS | OWNER | ADMIN
 */

export type DoctrinePointer = {
  rule_id: string;
  error_code: string;
  category: string;
  severity: string;
  incident_id?: string;
  public_code?: string;
  sources?: string[];
  // Optionnels (contexte additionnel)
  projectId?: string;
  actorId?: string;
  actorType?: string;
  door?: number;
  state?: string;
  metadata?: Record<string, any>;
};

const VALID_CATEGORIES = new Set([
  "DOCTRINE_BLOCK", "BYPASS_RISK", "DISINTERMEDIATION_RISK",
  "STATE_TAMPER", "PAYMENT_TAMPER", "DATA_EXFILTRATION_RISK",
  "OFF_PLATFORM_CHANNEL_RISK", "IA_POLICY_VIOLATION",
  "ENTITLEMENT_BYPASS", "GEO_VIOLATION", "CYCLE_OVERRUN",
]);
const VALID_SEVERITIES = new Set(["INFO", "WARN", "CRITICAL"]);
const VALID_ACTOR_TYPES = new Set(["CLIENT", "OPERATOR", "OPS", "OWNER", "ADMIN"]);

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly probative: ProbativeLogService,
  ) {}

  /**
   * Crée Incident + ProbativeLog + IncidentEvent depuis un doctrine pointer.
   * Fire-and-forget: ne bloque jamais le caller (les erreurs DB sont loggées).
   */
  async createFromDoctrinePointer(ptr: DoctrinePointer): Promise<{ ok: boolean; incidentId?: string }> {
    try {
      const category = VALID_CATEGORIES.has(ptr.category) ? ptr.category : "DOCTRINE_BLOCK";
      const severity = VALID_SEVERITIES.has(ptr.severity) ? ptr.severity : "WARN";
      const actorType = ptr.actorType && VALID_ACTOR_TYPES.has(ptr.actorType) ? ptr.actorType : null;

      const incident = await this.prisma.incident.create({
        data: {
          id: ptr.incident_id, // si fourni, l'utiliser pour cohérence avec le pointeur public
          errorCode: ptr.error_code || "UNKNOWN",
          tomeRef: ptr.rule_id,
          sources: (ptr.sources ?? []) as any,
          category: category as any,
          severity: severity as any,
          projectId: ptr.projectId ?? null,
          actorId: ptr.actorId ?? null,
          actorType: actorType as any,
          door: ptr.door ?? null,
          state: ptr.state ?? null,
          status: "OPEN",
          events: {
            create: {
              eventCode: "RAISED",
              payload: { rule_id: ptr.rule_id, public_code: ptr.public_code, metadata: ptr.metadata ?? {} } as any,
            },
          },
        },
        select: { id: true },
      });

      // Append au journal probatoire (hash chain)
      await this.probative.append({
        type: "INCIDENT_RAISED",
        incidentId: incident.id,
        rule_id: ptr.rule_id,
        error_code: ptr.error_code,
        category, severity,
        projectId: ptr.projectId,
        actorId: ptr.actorId,
        actorType,
        door: ptr.door,
        state: ptr.state,
        ts: new Date().toISOString(),
      });

      this.logger.warn(`[Incident] ${ptr.rule_id} (${severity}) → ${incident.id}`);
      return { ok: true, incidentId: incident.id };
    } catch (e: any) {
      // Ne pas faire échouer le caller si la DB est down
      this.logger.error(`[Incident] Failed to persist: ${e?.message}`, e?.stack);
      return { ok: false };
    }
  }

  /**
   * Lookup d'un incident par ID (admin / debug).
   */
  async findById(id: string) {
    return this.prisma.incident.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: "asc" } } },
    });
  }

  /**
   * Liste paginée pour ops console.
   */
  async list(opts: { take?: number; status?: string; severity?: string } = {}) {
    return this.prisma.incident.findMany({
      where: {
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.severity ? { severity: opts.severity as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(opts.take ?? 50, 200),
      include: { events: { orderBy: { createdAt: "asc" }, take: 5 } },
    });
  }
}
