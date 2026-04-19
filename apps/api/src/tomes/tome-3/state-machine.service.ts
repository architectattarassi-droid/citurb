import { Injectable, NotFoundException } from "@nestjs/common";
import { HttpStatus } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { ActorType, DossierStatus } from "@prisma/client";
import { PrismaService } from "../tome-at";
import { DomainError } from "../../modules/kernel/domain-error";

// ─── Actor ─────────────────────────────────────────────────────────────────────
export type Actor = { id: string; type: ActorType };

// ─── Project state machine ─────────────────────────────────────────────────────
//
// States: E0 → E1_LANDING → E2_QUALIFICATION → E3_DOCUMENTS → E4_PACK
//         → E5_DISCLAIMER → E6_PAYMENT → E7_ACTIVE → E8_PRODUCTION
//         → E9_AUTORISATION → E10_CHANTIER → E11_VALIDATION → E12_CLOTURE
//         any → EC_GEL (freeze) / EC_GEL → restore (unfreeze)

const PROJECT_TRANSITIONS: Record<
  string,
  { next: string[]; allowedActors: ActorType[] }
> = {
  E0:               { next: ["E1_LANDING"],                         allowedActors: ["CLIENT", "OPS", "ADMIN"] },
  E1_LANDING:       { next: ["E2_QUALIFICATION"],                   allowedActors: ["CLIENT", "OPS"] },
  E2_QUALIFICATION: { next: ["E2B_URBANISME", "E3_DOCUMENTS"],      allowedActors: ["CLIENT", "OPS"] },
  E2B_URBANISME:    { next: ["E3_DOCUMENTS"],                       allowedActors: ["CLIENT", "OPS"] },
  E3_DOCUMENTS:     { next: ["E4_PACK"],                            allowedActors: ["CLIENT", "OPS"] },
  E4_PACK:          { next: ["E5_DISCLAIMER"],                      allowedActors: ["CLIENT"] },
  E5_DISCLAIMER:    { next: ["E6_PAYMENT"],                         allowedActors: ["CLIENT"] },
  E6_PAYMENT:       { next: ["E7_ACTIVE"],                          allowedActors: ["OPS", "ADMIN"] },
  E7_ACTIVE:        { next: ["E8_PRODUCTION"],                      allowedActors: ["OPS", "ADMIN"] },
  E8_PRODUCTION:    { next: ["E9_AUTORISATION"],                    allowedActors: ["OPS", "OPERATOR"] },
  E9_AUTORISATION:  { next: ["E10_CHANTIER"],                       allowedActors: ["OPS", "ADMIN"] },
  E10_CHANTIER:     { next: ["E11_VALIDATION"],                     allowedActors: ["OPS", "OPERATOR"] },
  E11_VALIDATION:   { next: ["E12_CLOTURE"],                        allowedActors: ["OPS", "ADMIN"] },
  E12_CLOTURE:      { next: [],                                     allowedActors: [] },
  EC_GEL:           { next: [],                                     allowedActors: ["OPS", "ADMIN"] },
};

const FREEZE_ACTORS: ActorType[] = ["OPS", "ADMIN"];

// ─── Dossier status machine ────────────────────────────────────────────────────
const DOSSIER_TRANSITIONS: Record<
  string,
  { next: DossierStatus[]; allowedActors: ActorType[] }
> = {
  DRAFT:         { next: ["SUBMITTED"],                              allowedActors: ["CLIENT", "OPS", "ADMIN"] },
  SUBMITTED:     { next: ["IN_REVIEW"],                             allowedActors: ["OPS", "OPERATOR", "ADMIN"] },
  IN_REVIEW:     { next: ["APPROVED", "NEEDS_CHANGES", "REJECTED"], allowedActors: ["OPS", "OPERATOR", "ADMIN"] },
  NEEDS_CHANGES: { next: ["SUBMITTED"],                             allowedActors: ["CLIENT", "OPS"] },
  APPROVED:      { next: [],                                        allowedActors: [] },
  REJECTED:      { next: [],                                        allowedActors: [] },
};

// ─── Service ───────────────────────────────────────────────────────────────────
@Injectable()
export class DossierStateMachineService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Dossier status transition ────────────────────────────────────────────────

  async transitionDossier(
    dossierId: string,
    toStatus: DossierStatus,
    requestingUserId: string,
    actor: Actor,
    requestingUserRole?: string,
    note?: string,
  ) {
    const isPrivileged = ['OPS', 'OPERATOR', 'ADMIN', 'OWNER'].includes(
      requestingUserRole || '',
    );

    const dossier = isPrivileged
      ? await this.prisma.dossier.findFirst({ where: { id: dossierId } })
      : await this.prisma.dossier.findFirst({ where: { id: dossierId, ownerId: requestingUserId } });

    if (!dossier) throw new NotFoundException("Dossier introuvable");

    const rule = DOSSIER_TRANSITIONS[dossier.status];
    if (!rule || !(rule.next as string[]).includes(toStatus)) {
      throw new DomainError(
        `Transition invalide : ${dossier.status} → ${toStatus}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          rule_id: "T3-DSM-001",
          error_code: "DOSSIER_TRANSITION_INVALID",
          category: "domain",
          severity: "medium",
          incident_id: randomUUID(),
          public_code: "TRANSITION_INVALID",
        },
      );
    }
    if (!rule.allowedActors.includes(actor.type)) {
      throw new DomainError(
        `Acteur ${actor.type} non autorisé pour ${dossier.status} → ${toStatus}`,
        HttpStatus.FORBIDDEN,
        {
          rule_id: "T3-DSM-002",
          error_code: "DOSSIER_TRANSITION_FORBIDDEN",
          category: "authz",
          severity: "high",
          incident_id: randomUUID(),
          public_code: "FORBIDDEN",
        },
      );
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

  async transitionProject(
    projectId: string,
    toState: string,
    action: string,
    actor: Actor,
  ) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException("Projet introuvable");

    const rule = PROJECT_TRANSITIONS[project.state];
    if (!rule || !rule.next.includes(toState)) {
      throw new DomainError(
        `Transition projet invalide : ${project.state} → ${toState}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          rule_id: "T3-PSM-001",
          error_code: "PROJECT_TRANSITION_INVALID",
          category: "domain",
          severity: "medium",
          incident_id: randomUUID(),
          public_code: "TRANSITION_INVALID",
        },
      );
    }
    if (!rule.allowedActors.includes(actor.type)) {
      throw new DomainError(
        `Acteur ${actor.type} non autorisé pour ${project.state} → ${toState}`,
        HttpStatus.FORBIDDEN,
        {
          rule_id: "T3-PSM-002",
          error_code: "PROJECT_TRANSITION_FORBIDDEN",
          category: "authz",
          severity: "high",
          incident_id: randomUUID(),
          public_code: "FORBIDDEN",
        },
      );
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

  async freezeProject(
    projectId: string,
    reason: string,
    origin: string,
    actor: Actor,
  ) {
    if (!FREEZE_ACTORS.includes(actor.type)) {
      throw new DomainError(
        "Seuls OPS et ADMIN peuvent geler un projet",
        HttpStatus.FORBIDDEN,
        {
          rule_id: "T3-PSM-003",
          error_code: "FREEZE_FORBIDDEN",
          category: "authz",
          severity: "high",
          incident_id: randomUUID(),
          public_code: "FORBIDDEN",
        },
      );
    }

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException("Projet introuvable");
    if (project.state === "EC_GEL") return project;

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

  async unfreezeProject(
    projectId: string,
    restoreToState: string,
    actor: Actor,
  ) {
    if (!FREEZE_ACTORS.includes(actor.type)) {
      throw new DomainError(
        "Seuls OPS et ADMIN peuvent dégeler un projet",
        HttpStatus.FORBIDDEN,
        {
          rule_id: "T3-PSM-004",
          error_code: "UNFREEZE_FORBIDDEN",
          category: "authz",
          severity: "high",
          incident_id: randomUUID(),
          public_code: "FORBIDDEN",
        },
      );
    }

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException("Projet introuvable");
    if (project.state !== "EC_GEL") return project;

    if (!PROJECT_TRANSITIONS[restoreToState]) {
      throw new DomainError(
        `État de restauration inconnu : ${restoreToState}`,
        HttpStatus.BAD_REQUEST,
        {
          rule_id: "T3-PSM-005",
          error_code: "RESTORE_STATE_UNKNOWN",
          category: "domain",
          severity: "medium",
          incident_id: randomUUID(),
          public_code: "BAD_REQUEST",
        },
      );
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

  async getProjectHistory(projectId: string) {
    return this.prisma.stateHistory.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
  }
}
