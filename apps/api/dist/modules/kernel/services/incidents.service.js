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
var IncidentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../tomes/tome-at/kernel/prisma/prisma.service");
const probative_log_service_1 = require("./probative-log.service");
const VALID_CATEGORIES = new Set([
    "DOCTRINE_BLOCK", "BYPASS_RISK", "DISINTERMEDIATION_RISK",
    "STATE_TAMPER", "PAYMENT_TAMPER", "DATA_EXFILTRATION_RISK",
    "OFF_PLATFORM_CHANNEL_RISK", "IA_POLICY_VIOLATION",
    "ENTITLEMENT_BYPASS", "GEO_VIOLATION", "CYCLE_OVERRUN",
]);
const VALID_SEVERITIES = new Set(["INFO", "WARN", "CRITICAL"]);
const VALID_ACTOR_TYPES = new Set(["CLIENT", "OPERATOR", "OPS", "OWNER", "ADMIN"]);
let IncidentsService = IncidentsService_1 = class IncidentsService {
    prisma;
    probative;
    logger = new common_1.Logger(IncidentsService_1.name);
    constructor(prisma, probative) {
        this.prisma = prisma;
        this.probative = probative;
    }
    /**
     * Crée Incident + ProbativeLog + IncidentEvent depuis un doctrine pointer.
     * Fire-and-forget: ne bloque jamais le caller (les erreurs DB sont loggées).
     */
    async createFromDoctrinePointer(ptr) {
        try {
            const category = VALID_CATEGORIES.has(ptr.category) ? ptr.category : "DOCTRINE_BLOCK";
            const severity = VALID_SEVERITIES.has(ptr.severity) ? ptr.severity : "WARN";
            const actorType = ptr.actorType && VALID_ACTOR_TYPES.has(ptr.actorType) ? ptr.actorType : null;
            const incident = await this.prisma.incident.create({
                data: {
                    id: ptr.incident_id, // si fourni, l'utiliser pour cohérence avec le pointeur public
                    errorCode: ptr.error_code || "UNKNOWN",
                    tomeRef: ptr.rule_id,
                    sources: (ptr.sources ?? []),
                    category: category,
                    severity: severity,
                    projectId: ptr.projectId ?? null,
                    actorId: ptr.actorId ?? null,
                    actorType: actorType,
                    door: ptr.door ?? null,
                    state: ptr.state ?? null,
                    status: "OPEN",
                    events: {
                        create: {
                            eventCode: "RAISED",
                            payload: { rule_id: ptr.rule_id, public_code: ptr.public_code, metadata: ptr.metadata ?? {} },
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
        }
        catch (e) {
            // Ne pas faire échouer le caller si la DB est down
            this.logger.error(`[Incident] Failed to persist: ${e?.message}`, e?.stack);
            return { ok: false };
        }
    }
    /**
     * Lookup d'un incident par ID (admin / debug).
     */
    async findById(id) {
        return this.prisma.incident.findUnique({
            where: { id },
            include: { events: { orderBy: { createdAt: "asc" } } },
        });
    }
    /**
     * Liste paginée pour ops console.
     */
    async list(opts = {}) {
        return this.prisma.incident.findMany({
            where: {
                ...(opts.status ? { status: opts.status } : {}),
                ...(opts.severity ? { severity: opts.severity } : {}),
            },
            orderBy: { createdAt: "desc" },
            take: Math.min(opts.take ?? 50, 200),
            include: { events: { orderBy: { createdAt: "asc" }, take: 5 } },
        });
    }
};
exports.IncidentsService = IncidentsService;
exports.IncidentsService = IncidentsService = IncidentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        probative_log_service_1.ProbativeLogService])
], IncidentsService);
