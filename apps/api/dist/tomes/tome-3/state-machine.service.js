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
exports.DossierStateMachineService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const tome_at_1 = require("../tome-at");
const domain_error_1 = require("../../modules/kernel/domain-error");
// ─── Project state machine ─────────────────────────────────────────────────────
//
// States: E0 → E1_LANDING → E2_QUALIFICATION → E3_DOCUMENTS → E4_PACK
//         → E5_DISCLAIMER → E6_PAYMENT → E7_ACTIVE → E8_PRODUCTION
//         → E9_AUTORISATION → E10_CHANTIER → E11_VALIDATION → E12_CLOTURE
//         any → EC_GEL (freeze) / EC_GEL → restore (unfreeze)
const PROJECT_TRANSITIONS = {
    E0: { next: ["E1_LANDING"], allowedActors: ["CLIENT", "OPS", "ADMIN"] },
    E1_LANDING: { next: ["E2_QUALIFICATION"], allowedActors: ["CLIENT", "OPS"] },
    E2_QUALIFICATION: { next: ["E2B_URBANISME", "E3_DOCUMENTS"], allowedActors: ["CLIENT", "OPS"] },
    E2B_URBANISME: { next: ["E3_DOCUMENTS"], allowedActors: ["CLIENT", "OPS"] },
    E3_DOCUMENTS: { next: ["E4_PACK"], allowedActors: ["CLIENT", "OPS"] },
    E4_PACK: { next: ["E5_DISCLAIMER"], allowedActors: ["CLIENT"] },
    E5_DISCLAIMER: { next: ["E6_PAYMENT"], allowedActors: ["CLIENT"] },
    E6_PAYMENT: { next: ["E7_ACTIVE"], allowedActors: ["OPS", "ADMIN"] },
    E7_ACTIVE: { next: ["E8_PRODUCTION"], allowedActors: ["OPS", "ADMIN"] },
    E8_PRODUCTION: { next: ["E9_AUTORISATION"], allowedActors: ["OPS", "OPERATOR"] },
    E9_AUTORISATION: { next: ["E10_CHANTIER"], allowedActors: ["OPS", "ADMIN"] },
    E10_CHANTIER: { next: ["E11_VALIDATION"], allowedActors: ["OPS", "OPERATOR"] },
    E11_VALIDATION: { next: ["E12_CLOTURE"], allowedActors: ["OPS", "ADMIN"] },
    E12_CLOTURE: { next: [], allowedActors: [] },
    EC_GEL: { next: [], allowedActors: ["OPS", "ADMIN"] },
};
const FREEZE_ACTORS = ["OPS", "ADMIN"];
// ─── Dossier status machine ────────────────────────────────────────────────────
const DOSSIER_TRANSITIONS = {
    DRAFT: { next: ["SUBMITTED"], allowedActors: ["CLIENT", "OPS", "ADMIN"] },
    SUBMITTED: { next: ["IN_REVIEW"], allowedActors: ["OPS", "OPERATOR", "ADMIN"] },
    IN_REVIEW: { next: ["APPROVED", "NEEDS_CHANGES", "REJECTED"], allowedActors: ["OPS", "OPERATOR", "ADMIN"] },
    NEEDS_CHANGES: { next: ["SUBMITTED"], allowedActors: ["CLIENT", "OPS"] },
    APPROVED: { next: [], allowedActors: [] },
    REJECTED: { next: [], allowedActors: [] },
};
// ─── Service ───────────────────────────────────────────────────────────────────
let DossierStateMachineService = class DossierStateMachineService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    // ── Dossier status transition ────────────────────────────────────────────────
    async transitionDossier(dossierId, toStatus, requestingUserId, actor, requestingUserRole, note) {
        const isPrivileged = ['OPS', 'OPERATOR', 'ADMIN', 'OWNER'].includes(requestingUserRole || '');
        const dossier = isPrivileged
            ? await this.prisma.dossier.findFirst({ where: { id: dossierId } })
            : await this.prisma.dossier.findFirst({ where: { id: dossierId, ownerId: requestingUserId } });
        if (!dossier)
            throw new common_1.NotFoundException("Dossier introuvable");
        const rule = DOSSIER_TRANSITIONS[dossier.status];
        if (!rule || !rule.next.includes(toStatus)) {
            throw new domain_error_1.DomainError(`Transition invalide : ${dossier.status} → ${toStatus}`, common_2.HttpStatus.UNPROCESSABLE_ENTITY, {
                rule_id: "T3-DSM-001",
                error_code: "DOSSIER_TRANSITION_INVALID",
                category: "domain",
                severity: "medium",
                incident_id: (0, node_crypto_1.randomUUID)(),
                public_code: "TRANSITION_INVALID",
            });
        }
        if (!rule.allowedActors.includes(actor.type)) {
            throw new domain_error_1.DomainError(`Acteur ${actor.type} non autorisé pour ${dossier.status} → ${toStatus}`, common_2.HttpStatus.FORBIDDEN, {
                rule_id: "T3-DSM-002",
                error_code: "DOSSIER_TRANSITION_FORBIDDEN",
                category: "authz",
                severity: "high",
                incident_id: (0, node_crypto_1.randomUUID)(),
                public_code: "FORBIDDEN",
            });
        }
        return this.prisma.dossier.update({
            where: { id: dossierId },
            data: {
                status: toStatus,
                ...(toStatus === "SUBMITTED" ? { submittedAt: new Date() } : {}),
                ...(note && ['NEEDS_CHANGES', 'REJECTED'].includes(toStatus) ? { opsNote: note } : {}),
            },
        });
    }
    // ── Project state transition ─────────────────────────────────────────────────
    async transitionProject(projectId, toState, action, actor) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            throw new common_1.NotFoundException("Projet introuvable");
        const rule = PROJECT_TRANSITIONS[project.state];
        if (!rule || !rule.next.includes(toState)) {
            throw new domain_error_1.DomainError(`Transition projet invalide : ${project.state} → ${toState}`, common_2.HttpStatus.UNPROCESSABLE_ENTITY, {
                rule_id: "T3-PSM-001",
                error_code: "PROJECT_TRANSITION_INVALID",
                category: "domain",
                severity: "medium",
                incident_id: (0, node_crypto_1.randomUUID)(),
                public_code: "TRANSITION_INVALID",
            });
        }
        if (!rule.allowedActors.includes(actor.type)) {
            throw new domain_error_1.DomainError(`Acteur ${actor.type} non autorisé pour ${project.state} → ${toState}`, common_2.HttpStatus.FORBIDDEN, {
                rule_id: "T3-PSM-002",
                error_code: "PROJECT_TRANSITION_FORBIDDEN",
                category: "authz",
                severity: "high",
                incident_id: (0, node_crypto_1.randomUUID)(),
                public_code: "FORBIDDEN",
            });
        }
        const [updated] = await this.prisma.$transaction([
            this.prisma.project.update({
                where: { id: projectId },
                data: { state: toState },
            }),
            this.prisma.stateHistory.create({
                data: {
                    projectId,
                    fromState: project.state,
                    toState,
                    action,
                    actorId: actor.id,
                    actorType: actor.type,
                },
            }),
        ]);
        return updated;
    }
    // ── Freeze / Unfreeze ────────────────────────────────────────────────────────
    async freezeProject(projectId, reason, origin, actor) {
        if (!FREEZE_ACTORS.includes(actor.type)) {
            throw new domain_error_1.DomainError("Seuls OPS et ADMIN peuvent geler un projet", common_2.HttpStatus.FORBIDDEN, {
                rule_id: "T3-PSM-003",
                error_code: "FREEZE_FORBIDDEN",
                category: "authz",
                severity: "high",
                incident_id: (0, node_crypto_1.randomUUID)(),
                public_code: "FORBIDDEN",
            });
        }
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            throw new common_1.NotFoundException("Projet introuvable");
        if (project.state === "EC_GEL")
            return project;
        const [updated] = await this.prisma.$transaction([
            this.prisma.project.update({
                where: { id: projectId },
                data: {
                    state: "EC_GEL",
                    freezeReason: reason,
                    freezeOrigin: origin,
                    freezeAt: new Date(),
                },
            }),
            this.prisma.stateHistory.create({
                data: {
                    projectId,
                    fromState: project.state,
                    toState: "EC_GEL",
                    action: "FREEZE",
                    actorId: actor.id,
                    actorType: actor.type,
                    freezeReason: reason,
                    freezeOrigin: origin,
                },
            }),
        ]);
        return updated;
    }
    async unfreezeProject(projectId, restoreToState, actor) {
        if (!FREEZE_ACTORS.includes(actor.type)) {
            throw new domain_error_1.DomainError("Seuls OPS et ADMIN peuvent dégeler un projet", common_2.HttpStatus.FORBIDDEN, {
                rule_id: "T3-PSM-004",
                error_code: "UNFREEZE_FORBIDDEN",
                category: "authz",
                severity: "high",
                incident_id: (0, node_crypto_1.randomUUID)(),
                public_code: "FORBIDDEN",
            });
        }
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            throw new common_1.NotFoundException("Projet introuvable");
        if (project.state !== "EC_GEL")
            return project;
        if (!PROJECT_TRANSITIONS[restoreToState]) {
            throw new domain_error_1.DomainError(`État de restauration inconnu : ${restoreToState}`, common_2.HttpStatus.BAD_REQUEST, {
                rule_id: "T3-PSM-005",
                error_code: "RESTORE_STATE_UNKNOWN",
                category: "domain",
                severity: "medium",
                incident_id: (0, node_crypto_1.randomUUID)(),
                public_code: "BAD_REQUEST",
            });
        }
        const [updated] = await this.prisma.$transaction([
            this.prisma.project.update({
                where: { id: projectId },
                data: {
                    state: restoreToState,
                    freezeReason: null,
                    freezeOrigin: null,
                    freezeAt: null,
                },
            }),
            this.prisma.stateHistory.create({
                data: {
                    projectId,
                    fromState: "EC_GEL",
                    toState: restoreToState,
                    action: "UNFREEZE",
                    actorId: actor.id,
                    actorType: actor.type,
                },
            }),
        ]);
        return updated;
    }
    // ── Queries ──────────────────────────────────────────────────────────────────
    async getProjectHistory(projectId) {
        return this.prisma.stateHistory.findMany({
            where: { projectId },
            orderBy: { createdAt: "asc" },
        });
    }
};
exports.DossierStateMachineService = DossierStateMachineService;
exports.DossierStateMachineService = DossierStateMachineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tome_at_1.PrismaService])
], DossierStateMachineService);
