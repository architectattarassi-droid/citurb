<!--
CITURBAREA — DOCTRINE MASTER — MASTER TECHNIQUE EXHAUSTIF
Statut: BASE CANONIQUE (Doctrinale + Technique) — PRODUCTION READY
Date: 2026-02-14 (Africa/Casablanca)
Principe: Upgrade-only absolu + State machine + Logs probatoires + Zéro logique métier front
Note: Ce fichier consolide UNIQUEMENT ce qui a été produit/validé dans ce chat + les documents fournis.
-->

# CITURBAREA — DOCTRINE MASTER (MASTER TECHNIQUE EXHAUSTIF)
**Version : v1.0-exhaustif (consolidation)**
**Statut : PRODUCTION READY**
**Figement : par amendements versionnés uniquement (T@-META-001)**

---

## Comment utiliser ce fichier
- Ce document est le **manuel d’implémentation** (dev/admin/ops/agents IA).
- Toute règle est référencée par `rule_id` et/ou par le Tome correspondant.
- Le **front** ne porte aucune logique métier : il affiche `state`, `allowed_actions`, `ui_blocks`.
- Toute violation doctrinale doit créer un `incident_id` et être **redacted** publiquement.

---

## Où intégrer la “Table de correspondance canonique”
- **Placement recommandé : Tome 0, fin de tome, sous “ANNEXE — Mapping AJOUTS / Zones grises / Verrouillages”.**
- Raison : la table est un **outil de gouvernance** (traçabilité des décisions + impact technique),
  et doit rester **proche de la Constitution Système** (T0), pas dans le kernel runtime.

---

## NOTE — Livres (socle décisionnel)
Les livres et leur “doctrine_sources” restent **OPS-ONLY** :
- présents dans ce monodoc interne
- **jamais** exposés dans l’API publique, l’UI publique, ni dans des logs publics
- runtime = `rule_id / error_code / incident_id` uniquement

---

# TABLE DES MATIÈRES
- TOME @ — Kernel constitutionnel (incidents/redaction/logs/alerting/rule registry)
- TOME 0 — Constitution système (data flywheel, geo core, interop, engines)
- TOME 1 — Gouvernance & économie (paiement=trigger, scope lock, EC freeze, cycles)
- TOME 2 — Portes P1→P6 + périmètres + anti-désintermédiation + anti-export
- TOME 3 — State machine E0→E12 + verrous L1→L7 + PMS + logs probatoires
- TOME 4 — Wiring exécutable (NestJS/Prisma/Jobs/Storage/Stripe/Geo/Data/BIM/Entity/PMI)
- ANNEXES — Mapping, décisions, protocoles agents IA, sprints

---



---

## SOURCE — bloc 3-3 verrous upgrade only pms cycles disclaimers connecteurs observation jobs.txt

```text
✅ BLOC 3/3 — VERROUS “UPGRADE-ONLY” + PMS + CYCLES + DISCLAIMERS + CONNECTEURS OBSERVATION + JOBS

Ce bloc finalise Tome 4 en exécutable complet :
(1) catalogue SKUs / packs / upgrades, (2) guard entitlements (aucune feature sans paiement),
(3) disclaimers opposables (E5), (4) PMS (preuves chantier) + checklists,
(5) cycles C1/C2/C3 + refacturation + bascule EC-Dispute,
(6) connecteurs institutionnels en mode observation (read-only signals),
(7) jobs/cron (Data Products, scoring, complétude territoriale).

A) CATALOGUE SKUs (Packs + Upgrades) — SOURCE UNIQUE
apps/api/src/domain/catalog/sku.catalog.ts
/**
 * SKUs are the only way to activate value.
 * Rule: upgrade-only. Nothing “implicit”.
 * Naming convention:
 *  - PACK_P{door}_{tier}
 *  - UPG_P{door}_{feature}
 *  - SYS_REACTIVATE_EC
 */
export type SkuCode =
  | "PACK_P1_MIN"
  | "UPG_P1_CUSTOM_PLAN"
  | "UPG_P1_3D_RENDER"
  | "UPG_P1_EXEC_DOSSIER"
  | "UPG_P1_CPS_DCE"
  | "UPG_P1_HUMAN_SUPPORT"
  | "PACK_P2_2A_1"
  | "PACK_P2_2A_2"
  | "PACK_P2_2A_3"
  | "PACK_P2_2B_1"
  | "PACK_P2_2B_2"
  | "PACK_P2_2B_3"
  | "PACK_P3_MOD_CORE"
  | "UPG_P3_INDEPENDENT_EXPERT"
  | "PACK_P4_4_1"
  | "PACK_P4_4_2"
  | "PACK_P4_4_3"
  | "UPG_P4_EXPOSURE"
  | "PACK_P5_REPORT_ESTIMATION"
  | "PACK_P5_REPORT_RISK"
  | "PACK_P6_PARTNER_ONBOARD"
  | "UPG_BIM_3D_IFC_VIEW"
  | "UPG_BIM_4D_SCHEDULE"
  | "UPG_BIM_5D_COST"
  | "UPG_BIM_6D_SUSTAIN"
  | "UPG_COST_INTEL"
  | "UPG_DATA_PRODUCT_ACCESS"
  | "SYS_REACTIVATE_EC"
  | "SYS_CYCLE_C2"
  | "SYS_CYCLE_C3";

export const SKU = {
  PACK_P1_MIN: {
    door: 1,
    description: "Ticket d’entrée Porte 1 (plan type + canal + logs + suivi probatoire)",
    activates: ["P1_CORE"],
  },
  UPG_P1_CUSTOM_PLAN: { door: 1, description: "Plan personnalisé", activates: ["P1_CUSTOM_PLAN"] },
  UPG_P1_3D_RENDER: { door: 1, description: "3D / rendus", activates: ["P1_3D"] },
  UPG_P1_EXEC_DOSSIER: { door: 1, description: "Dossier d’exécution", activates: ["P1_EXEC"] },
  UPG_P1_CPS_DCE: { door: 1, description: "CPS/DCE", activates: ["P1_CPS_DCE"] },
  UPG_P1_HUMAN_SUPPORT: { door: 1, description: "Support humain structuré", activates: ["P1_HUMAN"] },

  PACK_P3_MOD_CORE: { door: 3, description: "MOD core (PV hebdo + paiements par phase + gels)", activates: ["P3_MOD"] },
  UPG_P3_INDEPENDENT_EXPERT: { door: 3, description: "Expertise indépendante", activates: ["P3_EXPERT"] },

  PACK_P4_4_1: { door: 4, description: "Étude urbaine basique (indicative)", activates: ["P4_STUDY_1"] },
  PACK_P4_4_2: { door: 4, description: "Étude + évaluation financière (indicative)", activates: ["P4_STUDY_2"] },
  PACK_P4_4_3: { door: 4, description: "Premium pré-bancable (indicatif)", activates: ["P4_STUDY_3"] },
  UPG_P4_EXPOSURE: { door: 4, description: "Exposition maîtrisée (L6)", activates: ["P4_EXPOSURE"] },

  PACK_P5_REPORT_ESTIMATION: { door: 5, description: "Rapport estimation", activates: ["P5_ESTIMATION"] },
  PACK_P5_REPORT_RISK: { door: 5, description: "Rapport risques", activates: ["P5_RISK"] },

  PACK_P6_PARTNER_ONBOARD: { door: 6, description: "Onboarding partenaire (score + CPS + anti-contournement)", activates: ["P6_ONBOARD"] },

  // BIM & Data Engines (upgrade-only)
  UPG_BIM_3D_IFC_VIEW: { door: 0, description: "BIM 3D IFC viewer", activates: ["BIM_3D"] },
  UPG_BIM_4D_SCHEDULE: { door: 0, description: "BIM 4D délais", activates: ["BIM_4D"] },
  UPG_BIM_5D_COST: { door: 0, description: "BIM 5D coûts", activates: ["BIM_5D"] },
  UPG_BIM_6D_SUSTAIN: { door: 0, description: "BIM 6D durabilité", activates: ["BIM_6D"] },

  UPG_COST_INTEL: { door: 0, description: "Accès moteur Cost Intelligence (non contractuel)", activates: ["COST_INTEL"] },
  UPG_DATA_PRODUCT_ACCESS: { door: 0, description: "Accès Data Products (agrégés, non bruts)", activates: ["DATA_PRODUCTS"] },

  // System SKUs
  SYS_REACTIVATE_EC: { door: 0, description: "Procédure payée de réactivation EC-Dispute", activates: ["EC_REACTIVATE"] },
  SYS_CYCLE_C2: { door: 0, description: "Cycle C2 (refacturation)", activates: ["CYCLE_C2"] },
  SYS_CYCLE_C3: { door: 0, description: "Cycle C3 (seuil)", activates: ["CYCLE_C3"] },
} as const;

B) ENTITLEMENT GUARD — AUCUNE FEATURE SANS SKU ACTIF
apps/api/src/modules/entitlements/entitlements.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { EntitlementsService } from "./entitlements.service";

@Module({
  providers: [PrismaService, EntitlementsService],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}

apps/api/src/modules/entitlements/entitlements.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ActorType } from "@prisma/client";

@Injectable()
export class EntitlementsService {
  constructor(private prisma: PrismaService) {}

  async hasSku(input: {
    ownerType: ActorType;
    ownerId: string;
    skuCode: string;
    scopeType?: "PROJECT" | "GLOBAL";
    scopeId?: string | null;
  }) {
    const ent = await this.prisma.entitlement.findFirst({
      where: {
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        skuCode: input.skuCode,
        status: "ACTIVE",
        scopeType: input.scopeType ?? "GLOBAL",
        scopeId: input.scopeId ?? null,
      },
    });
    return Boolean(ent);
  }
}

apps/api/src/common/guards/entitlement.guard.ts
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ForbiddenError } from "../errors";
import { EntitlementsService } from "../../modules/entitlements/entitlements.service";
import { ActorType } from "@prisma/client";

type Opts = { skuCode: string; scope: "GLOBAL" | "PROJECT"; projectParam?: string };

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(private ent: EntitlementsService, private opts: Opts) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { actorType: ActorType; actorId: string } | undefined;
    if (!user) throw new ForbiddenError("No session");

    const projectId =
      this.opts.scope === "PROJECT" ? (req.params?.[this.opts.projectParam ?? "projectId"] as string) : null;

    const ok = await this.ent.hasSku({
      ownerType: user.actorType,
      ownerId: user.actorId,
      skuCode: this.opts.skuCode,
      scopeType: this.opts.scope,
      scopeId: projectId,
    });

    if (!ok) throw new ForbiddenError(`Upgrade required: ${this.opts.skuCode}`);
    return true;
  }
}


Dans NestJS, pour injecter proprement un guard paramétré, on utilise une factory provider.
Ici je te donne un helper standard.

apps/api/src/common/guards/entitlement.guard.factory.ts
import { Provider } from "@nestjs/common";
import { EntitlementGuard } from "./entitlement.guard";
import { EntitlementsService } from "../../modules/entitlements/entitlements.service";

export function entitlementGuardProvider(token: string, skuCode: string, scope: "GLOBAL" | "PROJECT", projectParam?: string): Provider {
  return {
    provide: token,
    useFactory: (ent: EntitlementsService) => new EntitlementGuard(ent, { skuCode, scope, projectParam }),
    inject: [EntitlementsService],
  };
}

C) DISCLAIMERS ENGINE (E5 opposable) — SIGNATURE + ARCHIVE PROBATOIRE
apps/api/src/modules/disclaimers/disclaimers.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeModule } from "../probative/probative.module";
import { StateModule } from "../state/state.module";
import { DisclaimersService } from "./disclaimers.service";
import { DisclaimersController } from "./disclaimers.controller";

@Module({
  imports: [ProbativeModule, StateModule],
  providers: [PrismaService, DisclaimersService],
  controllers: [DisclaimersController],
  exports: [DisclaimersService],
})
export class DisclaimersModule {}

apps/api/src/modules/disclaimers/disclaimers.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeService } from "../probative/probative.service";
import { StateService } from "../state/state.service";
import { ActorType } from "@prisma/client";
import { ConflictError } from "../../common/errors";
import { hmacProbative, stableJson } from "../../common/utils/crypto";

@Injectable()
export class DisclaimersService {
  constructor(
    private prisma: PrismaService,
    private prob: ProbativeService,
    private state: StateService,
  ) {}

  /**
   * Create disclaimer pack for project/sku. Client must accept in E5.
   */
  async createPack(projectId: string, skuCode: string, clauses: string[], actorType: ActorType, actorId?: string | null) {
    const st = await this.state.getState(projectId);
    if (st.state !== "E4" && st.state !== "E5") throw new ConflictError("Disclaimers can only be prepared around E4/E5");

    const canonical = { skuCode, clauses, version: 1 };
    const hash = hmacProbative(stableJson(canonical));

    const pack = await this.prisma.disclaimerPack.create({
      data: { projectId, skuCode, clauses, hash, version: 1 },
    });

    await this.prob.append({
      actor_type: actorType,
      actor_id: actorId ?? null,
      event_type: "DISCLAIMER_PACK_CREATED",
      project_id: projectId,
      payload: { packId: pack.id, skuCode, hash },
    });

    return pack;
  }

  async accept(projectId: string, packId: string, actorType: ActorType, actorId?: string | null) {
    const pack = await this.prisma.disclaimerPack.findUnique({ where: { id: packId } });
    if (!pack || pack.projectId !== projectId) throw new ConflictError("Invalid pack");

    const acceptance = await this.prisma.disclaimerAcceptance.create({
      data: {
        projectId,
        packId,
        actorType,
        actorId: actorId ?? "ANON",
        acceptedAt: new Date(),
        packHash: pack.hash,
      },
    });

    await this.prob.append({
      actor_type: actorType,
      actor_id: actorId ?? null,
      event_type: "DISCLAIMERS_ACCEPTED",
      project_id: projectId,
      payload: { packId, packHash: pack.hash },
    });

    // Transition E5 -> E6
    const st = await this.state.getState(projectId);
    if (st.state === "E5") {
      await this.state.transition({
        projectId,
        toState: "E6",
        trigger: "DISCLAIMERS_ACCEPTED",
        actorType,
        actorId: actorId ?? null,
        payload: { packId, packHash: pack.hash },
      });
    }

    return acceptance;
  }
}

apps/api/src/modules/disclaimers/disclaimers.controller.ts
import { Body, Controller, Post, Param } from "@nestjs/common";
import { DisclaimersService } from "./disclaimers.service";
import { ActorType } from "@prisma/client";

@Controller("projects/:projectId/disclaimers")
export class DisclaimersController {
  constructor(private disc: DisclaimersService) {}

  @Post("create-pack")
  create(@Param("projectId") projectId: string, @Body() b: any) {
    return this.disc.createPack(projectId, b.skuCode, b.clauses ?? [], (b.actorType as ActorType) ?? ActorType.OP, b.actorId ?? null);
  }

  @Post("accept")
  accept(@Param("projectId") projectId: string, @Body() b: any) {
    return this.disc.accept(projectId, b.packId, (b.actorType as ActorType) ?? ActorType.CLT, b.actorId ?? null);
  }
}

D) PMS ENGINE (Proof Minimum Standard) — SCORE + REJET + LIEN CHECKLIST
apps/api/src/domain/pms/pms.rules.ts
export type PmsInput = {
  hasTimestamp: boolean;
  hasGeo: boolean;
  hasScaleRef: boolean;
  angleWide: boolean;
  angleDetail: boolean;
  seriesCount: number;
  isBlurry: boolean;
  hasDuplicates: boolean;
};

export type PmsResult = {
  ok: boolean;
  score: number; // 0..100
  rejects: string[];
};

export function evaluatePms(i: PmsInput): PmsResult {
  const rejects: string[] = [];
  let score = 100;

  if (!i.hasTimestamp) { score -= 25; rejects.push("NO_TIMESTAMP"); }
  if (!i.hasScaleRef) { score -= 20; rejects.push("NO_SCALE_REF"); }
  if (!i.angleWide)   { score -= 15; rejects.push("NO_WIDE_ANGLE"); }
  if (!i.angleDetail) { score -= 15; rejects.push("NO_DETAIL_ANGLE"); }
  if (i.seriesCount < 6) { score -= 20; rejects.push("SERIES_INSUFFICIENT"); }
  if (i.isBlurry) { score -= 30; rejects.push("BLURRY"); }
  if (i.hasDuplicates) { score -= 10; rejects.push("DUPLICATES"); }

  // Geo is optional but improves
  if (!i.hasGeo) score -= 5;

  // Hard rejection rules (Tome 3)
  const hardReject = i.isBlurry || i.seriesCount < 3;
  if (hardReject) return { ok: false, score: Math.max(0, score), rejects: ["HARD_REJECT", ...rejects] };

  return { ok: score >= 70 && rejects.length <= 3, score: Math.max(0, score), rejects };
}

apps/api/src/modules/pms/pms.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeModule } from "../probative/probative.module";
import { PmsService } from "./pms.service";
import { PmsController } from "./pms.controller";

@Module({
  imports: [ProbativeModule],
  providers: [PrismaService, PmsService],
  controllers: [PmsController],
  exports: [PmsService],
})
export class PmsModule {}

apps/api/src/modules/pms/pms.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeService } from "../probative/probative.service";
import { ActorType } from "@prisma/client";
import { evaluatePms } from "../../domain/pms/pms.rules";

@Injectable()
export class PmsService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async evaluateProof(proofId: string, input: any, actorType: ActorType, actorId?: string | null) {
    const proof = await this.prisma.proof.findUnique({ where: { id: proofId } });
    if (!proof) throw new Error("Proof not found");

    const res = evaluatePms(input);

    const updated = await this.prisma.proof.update({
      where: { id: proofId },
      data: {
        status: res.ok ? "ACCEPTED" : "REJECTED",
        pmsScore: res.score,
        pmsRejects: res.rejects,
      } as any,
    });

    await this.prob.append({
      actor_type: actorType,
      actor_id: actorId ?? null,
      event_type: "PMS_EVALUATED",
      project_id: proof.projectId,
      payload: { proofId, ok: res.ok, score: res.score, rejects: res.rejects },
    });

    return updated;
  }
}

apps/api/src/modules/pms/pms.controller.ts
import { Body, Controller, Post } from "@nestjs/common";
import { PmsService } from "./pms.service";
import { ActorType } from "@prisma/client";

@Controller("pms")
export class PmsController {
  constructor(private pms: PmsService) {}

  @Post("evaluate")
  evaluate(@Body() b: any) {
    return this.pms.evaluateProof(b.proofId, b.input ?? {}, (b.actorType as ActorType) ?? ActorType.IA, b.actorId ?? null);
  }
}

E) CYCLES ENGINE (C1 inclus / C2+ payant / C3 seuil → EC-Dispute)
apps/api/src/modules/cycles/cycles.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeModule } from "../probative/probative.module";
import { StateModule } from "../state/state.module";
import { EntitlementsModule } from "../entitlements/entitlements.module";
import { CyclesService } from "./cycles.service";
import { CyclesController } from "./cycles.controller";

@Module({
  imports: [ProbativeModule, StateModule, EntitlementsModule],
  providers: [PrismaService, CyclesService],
  controllers: [CyclesController],
  exports: [CyclesService],
})
export class CyclesModule {}

apps/api/src/modules/cycles/cycles.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeService } from "../probative/probative.service";
import { StateService } from "../state/state.service";
import { EntitlementsService } from "../entitlements/entitlements.service";
import { ActorType } from "@prisma/client";
import { ConflictError, ForbiddenError } from "../../common/errors";

@Injectable()
export class CyclesService {
  constructor(
    private prisma: PrismaService,
    private prob: ProbativeService,
    private state: StateService,
    private ent: EntitlementsService,
  ) {}

  async startNextCycle(projectId: string, actorType: ActorType, actorId?: string | null) {
    const count = await this.prisma.cycle.count({ where: { projectId } });
    const next = count + 1;

    // C1 is included only if pack says so; enforcement is done by SKU logic in your pricing layer.
    // Here: from C2 onward require SKU SYS_CYCLE_C2 / SYS_CYCLE_C3 (project scope).
    if (next === 2) {
      const ok = await this.ent.hasSku({ ownerType: actorType, ownerId: actorId ?? "ANON", skuCode: "SYS_CYCLE_C2", scopeType: "PROJECT", scopeId: projectId });
      if (!ok) throw new ForbiddenError("Cycle C2 requires payment (SYS_CYCLE_C2)");
    }
    if (next >= 3) {
      const ok = await this.ent.hasSku({ ownerType: actorType, ownerId: actorId ?? "ANON", skuCode: "SYS_CYCLE_C3", scopeType: "PROJECT", scopeId: projectId });
      if (!ok) throw new ForbiddenError("Cycle C3+ requires payment (SYS_CYCLE_C3)");
    }

    // Beyond C3 => protection threshold -> EC_DISPUTE
    if (next > 3) {
      await this.state.transition({
        projectId,
        toState: "EC_DISPUTE",
        trigger: "SCOPE_DERIVE",
        actorType,
        actorId: actorId ?? null,
        payload: { reason: "Cycles exceeded threshold", cycle: next },
      });
      throw new ConflictError("Cycle threshold exceeded -> EC_DISPUTE");
    }

    const cycle = await this.prisma.cycle.create({
      data: { projectId, index: next, status: "OPEN", startedAt: new Date() } as any,
    });

    await this.prob.append({
      actor_type: actorType,
      actor_id: actorId ?? null,
      event_type: "CYCLE_STARTED",
      project_id: projectId,
      payload: { cycle: next, cycleId: cycle.id },
    });

    // Transition E9 -> E8 if remarks
    const st = await this.state.getState(projectId);
    if (st.state === "E9") {
      await this.state.transition({
        projectId,
        toState: "E8",
        trigger: "CYCLE_REMARKS",
        actorType,
        actorId: actorId ?? null,
        payload: { cycle: next },
      });
    }

    return cycle;
  }
}

apps/api/src/modules/cycles/cycles.controller.ts
import { Body, Controller, Post, Param } from "@nestjs/common";
import { CyclesService } from "./cycles.service";
import { ActorType } from "@prisma/client";

@Controller("projects/:projectId/cycles")
export class CyclesController {
  constructor(private cycles: CyclesService) {}

  @Post("next")
  next(@Param("projectId") projectId: string, @Body() b: any) {
    return this.cycles.startNextCycle(projectId, (b.actorType as ActorType) ?? ActorType.CLT, b.actorId ?? null);
  }
}

F) EC-DISPUTE RÉACTIVATION — OBLIGATOIREMENT PAYÉE
apps/api/src/modules/reactivation/reactivation.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { StateModule } from "../state/state.module";
import { ProbativeModule } from "../probative/probative.module";
import { EntitlementsModule } from "../entitlements/entitlements.module";
import { ReactivationService } from "./reactivation.service";
import { ReactivationController } from "./reactivation.controller";

@Module({
  imports: [StateModule, ProbativeModule, EntitlementsModule],
  providers: [PrismaService, ReactivationService],
  controllers: [ReactivationController],
})
export class ReactivationModule {}

apps/api/src/modules/reactivation/reactivation.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { StateService } from "../state/state.service";
import { ProbativeService } from "../probative/probative.service";
import { EntitlementsService } from "../entitlements/entitlements.service";
import { ActorType } from "@prisma/client";
import { ForbiddenError } from "../../common/errors";

@Injectable()
export class ReactivationService {
  constructor(
    private prisma: PrismaService,
    private state: StateService,
    private prob: ProbativeService,
    private ent: EntitlementsService,
  ) {}

  async reactivateEcDispute(projectId: string, actorType: ActorType, actorId: string) {
    const st = await this.state.getState(projectId);
    if (st.state !== "EC_DISPUTE") throw new ForbiddenError("Project not in EC_DISPUTE");

    const ok = await this.ent.hasSku({
      ownerType: actorType,
      ownerId: actorId,
      skuCode: "SYS_REACTIVATE_EC",
      scopeType: "PROJECT",
      scopeId: projectId,
    });
    if (!ok) throw new ForbiddenError("Reactivation requires payment: SYS_REACTIVATE_EC");

    await this.prob.append({
      actor_type: actorType,
      actor_id: actorId,
      event_type: "EC_REACTIVATION_REQUESTED",
      project_id: projectId,
      payload: {},
    });

    // Strict: only to E7 via canonical trigger (Tome 3)
    return this.state.transition({
      projectId,
      toState: "E7",
      trigger: "REACTIVATION_PAID_AND_APPROVED",
      actorType: ActorType.SYS,
      actorId: null,
      payload: { via: "SYS_REACTIVATE_EC" },
    });
  }
}

apps/api/src/modules/reactivation/reactivation.controller.ts
import { Body, Controller, Post, Param } from "@nestjs/common";
import { ReactivationService } from "./reactivation.service";
import { ActorType } from "@prisma/client";

@Controller("projects/:projectId/reactivation")
export class ReactivationController {
  constructor(private r: ReactivationService) {}

  @Post("ec-dispute")
  ec(@Param("projectId") projectId: string, @Body() b: any) {
    return this.r.reactivateEcDispute(projectId, (b.actorType as ActorType) ?? ActorType.CLT, b.actorId);
  }
}

G) CONNECTEURS INSTITUTIONNELS (OBSERVATION READ-ONLY) — SIGNALS ≠ DÉCISION

On ne “pilote” pas Rokhas/Taamir/CRI. On observe, on stocke des signaux, on les relie au geoId + projectId.

apps/api/src/modules/connectors/connectors.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeModule } from "../probative/probative.module";
import { ConnectorsService } from "./connectors.service";
import { ConnectorsController } from "./connectors.controller";

@Module({
  imports: [ProbativeModule],
  providers: [PrismaService, ConnectorsService],
  controllers: [ConnectorsController],
  exports: [ConnectorsService],
})
export class ConnectorsModule {}

apps/api/src/modules/connectors/connectors.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeService } from "../probative/probative.service";
import { ActorType } from "@prisma/client";

/**
 * Observation-only connector.
 * Data comes from:
 *  - user-provided documents
 *  - emails notifications (future)
 *  - scraping is NOT assumed here
 */
@Injectable()
export class ConnectorsService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async ingestSignal(input: {
    provider: "ROKHAS" | "TAAMIR" | "CRI" | "OTHER";
    projectId?: string | null;
    geoId?: string | null;
    signalType: string;
    payload: any;
  }) {
    const s = await this.prisma.externalSignal.create({
      data: {
        provider: input.provider,
        projectId: input.projectId ?? null,
        geoId: input.geoId ?? null,
        signalType: input.signalType,
        payload: input.payload ?? {},
        observedAt: new Date(),
      },
    });

    await this.prob.append({
      actor_type: ActorType.SYS,
      actor_id: null,
      event_type: "EXTERNAL_SIGNAL_INGESTED",
      project_id: input.projectId ?? null,
      payload: { provider: input.provider, signalType: input.signalType, id: s.id },
    });

    return s;
  }
}

apps/api/src/modules/connectors/connectors.controller.ts
import { Body, Controller, Post } from "@nestjs/common";
import { ConnectorsService } from "./connectors.service";

@Controller("connectors")
export class ConnectorsController {
  constructor(private c: ConnectorsService) {}

  @Post("signal")
  signal(@Body() b: any) {
    return this.c.ingestSignal({
      provider: b.provider,
      projectId: b.projectId ?? null,
      geoId: b.geoId ?? null,
      signalType: b.signalType,
      payload: b.payload ?? {},
    });
  }
}

H) JOBS / CRON — DATA PRODUCTS, SCORING, COMPLÉTUDE TERRITORIALE
apps/api/src/modules/jobs/jobs.module.ts
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaService } from "../../prisma.service";
import { ProbativeModule } from "../probative/probative.module";
import { DataProductsModule } from "../data-products/data-products.module";
import { JobsService } from "./jobs.service";

@Module({
  imports: [ScheduleModule.forRoot(), ProbativeModule, DataProductsModule],
  providers: [PrismaService, JobsService],
})
export class JobsModule {}

apps/api/src/modules/jobs/jobs.service.ts
import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma.service";
import { DataProductsService } from "../data-products/data-products.service";
import { ProbativeService } from "../probative/probative.service";
import { ActorType } from "@prisma/client";

/**
 * Jobs are the “flywheel”:
 * - aggregate lake -> products
 * - compute territorial completeness
 * - entity scoring signals
 */
@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private products: DataProductsService,
    private prob: ProbativeService,
  ) {}

  @Cron("0 */6 * * *") // every 6 hours
  async aggregateMaterialIndex() {
    const items = await this.prisma.dataLakeItem.findMany({
      where: { domain: "MATERIAL_PRICE" },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    // minimal aggregation example
    const byMaterial: Record<string, { n: number; avg: number }> = {};
    for (const it of items) {
      const m = String((it.raw as any)?.material ?? "UNKNOWN");
      const p = Number((it.raw as any)?.price ?? NaN);
      if (!Number.isFinite(p)) continue;
      if (!byMaterial[m]) byMaterial[m] = { n: 0, avg: 0 };
      byMaterial[m].n += 1;
      byMaterial[m].avg += (p - byMaterial[m].avg) / byMaterial[m].n;
    }

    await this.products.publish({
      productType: "MATERIAL_PRICE_INDEX_GLOBAL",
      geoId: null,
      payload: { byMaterial, note: "Indicatif - non contractuel" },
      actorType: ActorType.SYS,
      actorId: null,
    });

    await this.prob.append({
      actor_type: ActorType.SYS,
      actor_id: null,
      event_type: "JOB_AGG_MATERIAL_INDEX",
      project_id: null,
      payload: { materials: Object.keys(byMaterial).length },
    });
  }

  @Cron("15 */12 * * *") // every 12 hours
  async territorialCompleteness() {
    // Geo skeleton: compute where we have zoning/docs/products vs missing
    const geoCount = await this.prisma.geoUnit.count();
    const docsCount = await this.prisma.geoDoc.count(); // requires schema: geoDoc table (Bloc 1 can include it)
    const signalsCount = await this.prisma.externalSignal.count();

    await this.products.publish({
      productType: "TERRITORIAL_COMPLETENESS",
      geoId: null,
      payload: { geoCount, docsCount, signalsCount, ts: new Date().toISOString() },
      actorType: ActorType.SYS,
      actorId: null,
    });

    await this.prob.append({
      actor_type: ActorType.SYS,
      actor_id: null,
      event_type: "JOB_TERRITORIAL_COMPLETENESS",
      project_id: null,
      payload: { geoCount, docsCount, signalsCount },
    });
  }
}


Note importante : geoDoc et externalSignal doivent exister dans Prisma (Bloc 1).
Si tu ne les as pas encore ajoutés, tu ajoutes ces 2 modèles :

Ajout Prisma minimal (à insérer dans schema.prisma du Bloc 1)
model geoDoc {
  id        String   @id @default(cuid())
  geoId     String
  docType   String
  title     String?
  payload   Json     @default("{}")
  createdAt DateTime @default(now())
  geo       geoUnit  @relation(fields: [geoId], references: [id])

  @@index([geoId])
  @@index([docType])
}

model externalSignal {
  id         String   @id @default(cuid())
  provider   String
  projectId  String?
  geoId      String?
  signalType String
  payload    Json     @default("{}")
  observedAt DateTime @default(now())

  @@index([provider])
  @@index([projectId])
  @@index([geoId])
  @@index([signalType])
}

I) BIM 3D/4D/5D/6D — MODULES (UPGRADE-ONLY) + IFC PIPELINE SQUELETTE

Ici on ne “promet” pas la magie. On fixe une architecture :
IFC ingest → parse → extract → store → clashes rules → 4D schedule → 5D cost mapping
Tout est activé par SKU.

apps/api/src/modules/bim/bim.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { FilesModule } from "../files/files.module";
import { ProbativeModule } from "../probative/probative.module";
import { EntitlementsModule } from "../entitlements/entitlements.module";
import { BimService } from "./bim.service";
import { BimController } from "./bim.controller";

@Module({
  imports: [FilesModule, ProbativeModule, EntitlementsModule],
  providers: [PrismaService, BimService],
  controllers: [BimController],
})
export class BimModule {}

apps/api/src/modules/bim/bim.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeService } from "../probative/probative.service";
import { EntitlementsService } from "../entitlements/entitlements.service";
import { ActorType } from "@prisma/client";
import { ForbiddenError } from "../../common/errors";

/**
 * BIM engine skeleton:
 * - store IFC as fileObject
 * - parse async (job) into bimElements
 * - run rule-based clash detection
 */
@Injectable()
export class BimService {
  constructor(
    private prisma: PrismaService,
    private prob: ProbativeService,
    private ent: EntitlementsService,
  ) {}

  async require(projectId: string, actorType: ActorType, actorId: string, skuCode: string) {
    const ok = await this.ent.hasSku({ ownerType: actorType, ownerId: actorId, skuCode, scopeType: "PROJECT", scopeId: projectId });
    if (!ok) throw new ForbiddenError(`Upgrade required: ${skuCode}`);
  }

  async registerIfc(projectId: string, fileId: string, actorType: ActorType, actorId: string) {
    await this.require(projectId, actorType, actorId, "UPG_BIM_3D_IFC_VIEW");

    const m = await this.prisma.bimModel.create({
      data: { projectId, ifcFileId: fileId, status: "UPLOADED" } as any,
    });

    await this.prob.append({
      actor_type: actorType,
      actor_id: actorId,
      event_type: "BIM_IFC_REGISTERED",
      project_id: projectId,
      payload: { bimModelId: m.id, fileId },
    });

    // Parsing is done by job/worker (not in request path)
    return m;
  }
}

apps/api/src/modules/bim/bim.controller.ts
import { Body, Controller, Post, Param } from "@nestjs/common";
import { BimService } from "./bim.service";
import { ActorType } from "@prisma/client";

@Controller("projects/:projectId/bim")
export class BimController {
  constructor(private bim: BimService) {}

  @Post("register-ifc")
  register(@Param("projectId") projectId: string, @Body() b: any) {
    return this.bim.registerIfc(projectId, b.fileId, (b.actorType as ActorType) ?? ActorType.CLT, b.actorId);
  }
}


Prisma minimal (si absent) :

model bimModel {
  id        String   @id @default(cuid())
  projectId String
  ifcFileId String
  status    String
  createdAt DateTime @default(now())
  @@index([projectId])
}

J) ASSEMBLAGE FINAL — AppModule (ajouter modules manquants)
apps/api/src/app.module.ts (compléter)
import { Module } from "@nestjs/common";
import { ProbativeModule } from "./modules/probative/probative.module";
import { UsageModule } from "./modules/usage/usage.module";
import { StateModule } from "./modules/state/state.module";
import { BillingModule } from "./modules/billing/billing.module";
import { FilesModule } from "./modules/files/files.module";
import { GeoModule } from "./modules/geo/geo.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { DataLakeModule } from "./modules/data-lake/data-lake.module";
import { DataProductsModule } from "./modules/data-products/data-products.module";
import { EntitiesModule } from "./modules/entities/entities.module";
import { PmiModule } from "./modules/pmi/pmi.module";
import { CostsModule } from "./modules/costs/costs.module";
import { MatchingModule } from "./modules/matching/matching.module";

import { EntitlementsModule } from "./modules/entitlements/entitlements.module";
import { DisclaimersModule } from "./modules/disclaimers/disclaimers.module";
import { PmsModule } from "./modules/pms/pms.module";
import { CyclesModule } from "./modules/cycles/cycles.module";
import { ReactivationModule } from "./modules/reactivation/reactivation.module";
import { ConnectorsModule } from "./modules/connectors/connectors.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { BimModule } from "./modules/bim/bim.module";

@Module({
  imports: [
    ProbativeModule,
    UsageModule,
    StateModule,
    BillingModule,
    FilesModule,
    GeoModule,
    ProjectsModule,
    DataLakeModule,
    DataProductsModule,
    EntitiesModule,
    PmiModule,
    CostsModule,
    MatchingModule,

    EntitlementsModule,
    DisclaimersModule,
    PmsModule,
    CyclesModule,
    ReactivationModule,
    ConnectorsModule,
    JobsModule,
    BimModule,
  ],
})
export class AppModule {}

✅ CHECKLIST — “C’EST EXÉCUTABLE ET DOCTRINAL”
Verrous majeurs couverts

Upgrade-only absolu : entitlements + SKUs + guards + reactivation payée.

Paiement = état : webhook → entitlement → transition E6→E7.

Disclaimers opposables (E5) : hash pack + acceptance + log probatoire.

PMS : scoring + rejet + preuve liée.

Cycles : C2/C3 payants + seuil >C3 → EC_DISPUTE.

Institutionnels : observation read-only via externalSignals.

Data flywheel : jobs agrégation + products (pas raw).

BIM : pipeline IFC upgrade-only (structure prête 3D→6D).

⚠️ 2 POINTS À NE PAS LAISSER FLOUS (sinon dette doctrinale)

Auth / Sessions / ActorType
Ici j’ai supposé req.user = { actorType, actorId }.
Dans ton Tome 4, il faut un module Auth (JWT/Supabase/Keycloak) — mais la logique métier ne dépend jamais du front, donc c’est “pluggable”.

Models Prisma additionnels
Si tu n’avais pas geoDoc, externalSignal, bimModel, ajoute-les (snippets fournis).
Même logique pour disclaimerPack / disclaimerAcceptance / proof (si tu n’avais pas encore ces tables dans Bloc 1).
```



---

## SOURCE — doctrine version texte socle solide tome 0 a 4.txt

```text
MÉMO STRATÉGIQUE GLOBAL — VERSION EXHAUSTIVE AUGMENTÉE
CITURBAREA — BASE DE REFONTE DOCTRINALE COMPLÈTE
Statut : DOCUMENT DE RÉFÉRENCE AVANT FIGEMENT IRRÉVERSIBLE
Portée : Constitution (TOME 0) → Tomes 1 à 7 → Architecture technique → Codage
________________________________________
I. DÉCISION MÉTA FONDATRICE (RAPPEL)
1. Figement doctrinal avant tout code
•	Aucun développement n’est autorisé avant :
o	figement doctrinal,
o	clarification des zones grises,
o	alignement souverain.
•	La doctrine devient :
o	canonique,
o	versionnée,
o	évolutive uniquement par amendement contrôlé.
🔎 Zone grise détectée → corrigée
Risque de coder des fonctionnalités “intuitives” sans fondement doctrinal → interdit.
________________________________________
II. PRINCIPE STRUCTURANT ABSOLU
2. Tout est Upgrade — rien n’est service de base
•	Le service de base est volontairement pauvre :
o	accès,
o	orientation,
o	qualification,
o	observation.
•	Toute valeur réelle est :
o	conditionnée à une commande explicite,
o	payée,
o	activée contextuellement.
🔎 Zone grise détectée
Risque de “glissement gratuit” (feature creep) → verrouillage Upgrade-Only.
________________________________________
III. DATA FLYWHEEL — COLLECTE CONTINUE
3. Collecte continue systémique
La plateforme collecte en permanence :
•	foncier (prix, transactions),
•	lotissements,
•	cahiers des charges,
•	plans d’aménagement,
•	règlements,
•	décisions observées.
4. Transformation en modules exploitables
•	Aucune donnée brute n’est livrée.
•	Toute donnée devient :
o	module,
o	index,
o	signal,
o	score.
🔎 Zone grise détectée
Confusion possible entre stockage et exploitation → séparation Data Lake / Data Products.
________________________________________
IV. DATA SEEDING SOUVERAIN (SANS DOSSIER)
5. Alimentation proactive par owner / opérateurs
•	Import, saisie, observation terrain, DGI, prix.
•	Sans dossier, sans client.
6. Règle critique
•	Donnée seedée = actif interne, jamais livrable direct.
🔎 Zone grise détectée
Risque d’usage commercial direct → interdiction formelle.
________________________________________
V. OSSATURE CARTOGRAPHIQUE NATIONALE
7. Cartographie = squelette de la base
•	Maroc → 12 régions → 75 provinces → 1500+ communes.
•	Toute donnée est géolocalisée par défaut.
8. Capitalisation territoriale
•	Les documents réglementaires sont rattachés aux territoires, pas aux dossiers.
9. Détection automatique
•	zones couvertes,
•	zones blanches,
•	documents manquants.
🔎 Zone grise détectée
Risque d’archivage documentaire passif → activation moteur de complétude territoriale.
________________________________________
VI. INTEROPÉRABILITÉ GÉOSPATIALE LONG TERME
10. Compatibilité plateformes cartographiques
•	Google Maps, Waze, Airbnb, Booking, Uber, InDrive, Glovo, etc.
•	Standards ouverts uniquement.
•	Aucun lock-in.
🔎 Zone grise détectée
Dépendance API tierces → fallback souverain obligatoire.
________________________________________
VII. INTEROPÉRABILITÉ INSTITUTIONNELLE
11. Plateformes ciblées
•	Rokhas
•	Taamir
•	CRI
•	plateformes publiques futures
12. Trois modes
1.	Observation passive (prioritaire)
2.	Échange contrôlé
3.	Interaction assistée (jamais décisionnelle)
13. Autorité interne absolue
•	Les plateformes externes sont des signaux, jamais des juges.
🔎 Zone grise détectée
Confusion autorité institutionnelle / plateforme → hiérarchie figée.
________________________________________
VIII. DATA ENVIRONNEMENTALE & CLIMATIQUE
14. Données collectées
•	météo,
•	pluviométrie,
•	risques,
•	événements climatiques.
15. Exploitation
•	justification retards,
•	phasage chantier,
•	analyse risques,
•	études & investissement.
🔎 Zone grise détectée
Responsabilité juridique météo → donnée indicative non opposable.
________________________________________
IX. COST INTELLIGENCE ENGINE (BIM 5D)
16. Données coûts
•	matériaux,
•	produits,
•	services,
•	main-d’œuvre,
•	corps d’état.
17. Double collecte
•	dossiers (réactif),
•	data seeding (proactif).
18. Vente temporisée
•	jamais brute,
•	jamais permanente,
•	uniquement au moment décisionnel.
🔎 Zone grise détectée
Assimilation à devis → clause non contractuelle obligatoire.
________________________________________
X. BIM 3D / 4D / 5D / 6D
19. BIM natif
•	IFC obligatoire.
•	Détection automatique des clashes.
•	Suivi conception → réalisation → exploitation.
🔎 Zone grise détectée
Confusion BIM outil / BIM système → BIM = moteur interne, pas simple viewer.
________________________________________
XI. ENTITY INTELLIGENCE ENGINE
20. Cartographie des acteurs
•	entreprises,
•	fournisseurs,
•	BET,
•	artisans,
•	main-d’œuvre (minimisée).
21. Sans création de compte
•	toute entité intervenant sur projet est stockée.
•	preuves internes priment sur réputation web.
22. Statuts canonisés
•	UNVERIFIED
•	PROJECT_LINKED
•	VERIFIED
•	ENTITY_OBSERVED
🔎 Zone grise détectée
Risque RGPD / profiling → data minimization + consentement pour VERIFIED.
________________________________________
XII. PASSIVE MARKET INTELLIGENCE (PMI)
23. Détection passive d’intérêt
•	acteurs explorant la plateforme sans compte.
•	signaux anonymisés uniquement.
24. Recoupement
•	croisement avec entités, coûts, zones.
🔎 Zone grise détectée
Démarchage caché → interdiction activation commerciale directe.
________________________________________
XIII. MEDIA INTELLIGENCE ENGINE (DÉCORATION)
25. Média = capteur data
•	pas un média d’influence vide.
26. Périmètre élargi
•	décoration,
•	design,
•	mobilier,
•	matières,
•	produits,
•	services déco.
27. Extraction data
•	produits,
•	tendances,
•	acteurs,
•	signaux marché.
🔎 Zone grise détectée
Contenu esthétique non structuré → interdiction doctrinale.
________________________________________
XIV. DÉTECTION DES ACTEURS SANS COMPTE (NAVIGATION)
28. Observation passive des visiteurs pro
•	fournisseurs / sociétés matériaux explorant la plateforme.
•	classification interne par signaux.
29. Stockage interne
•	création de fiches ENTITY_OBSERVED.
•	aucune exposition, aucun contact direct.
🔎 Zone grise détectée
Tracking abusif → anonymisation + opt-out global.
________________________________________
XV. MONÉTISATION & TIMING
30. Règles absolues
•	pas de vente de bases,
•	pas d’export brut,
•	pas de pricing public,
•	activation contextuelle uniquement.
🔎 Zone grise détectée
Tentation marketplace ouverte → refus doctrinal.
________________________________________
XVI. SÉCURITÉ, SOUVERAINETÉ, ANTI-CAPTURE
31. Garde-fous globaux
•	souveraineté data,
•	anti-dépendance,
•	logs probatoires,
•	versioning,
•	granularité contrôlée,
•	droit à l’oubli / opt-out.
🔎 Zone grise détectée
Responsabilité plateforme élargie → clauses de non-substitution.
________________________________________
XVII. FINALITÉ STRATÉGIQUE CONSOLIDÉE
32. Positionnement final
CITURBAREA est :
•	une infrastructure territoriale souveraine,
•	une machine à connaissance cumulative,
•	un système d’anticipation du marché,
•	un acteur invisible mais central,
•	un actif extrêmement difficile à copier.















📊 TABLE DE CORRESPONDANCE CANONIQUE
CITURBAREA — AJOUTS · ZONES GRISES · VERROUILLAGES
________________________________________
I. GOUVERNANCE & MÉTA-RÈGLES
Élément	Origine	Tome	Module	Zone grise détectée	Décision de verrouillage	Impact technique
Figement doctrinal avant code	User	T0	Governance	Dev anticipé	Interdiction de coder sans Tome validé	Pipeline “doctrine-first”
Doctrine versionnée	Assistant	T0	Governance	Évolution non contrôlée	Amendements versionnés uniquement	Versioning doctrine
Upgrade-only absolu	User	T0	Billing Core	Glissement gratuit	Activation conditionnée paiement	Feature flags
________________________________________
II. DATA FLYWHEEL & DATA SEEDING
Élément	Origine	Tome	Module	Zone grise	Décision	Impact technique
Collecte continue data	User	T0 / T4	Data Flywheel	Donnée brute livrée	Séparation Lake / Products	Data Lake + Modules
Modules exploitables	Assistant	T4	Data Products	Confusion stockage/exploitation	Modules versionnés	API interne
Data Seeding sans dossier	User	T0	Data Seeding	Usage commercial direct	Interne uniquement	Permissions owner/op
Provenance & scoring	Assistant	T4	Data Quality	Données non fiables	confidence_score obligatoire	Pipelines de scoring
________________________________________
III. CARTOGRAPHIE & TERRITOIRE
Élément	Origine	Tome	Module	Zone grise	Décision	Impact technique
Hiérarchie Maroc (12/75/1500+)	User	T0	Geo Core	Dossiers non localisés	geo_id obligatoire	PostGIS
Cartographie = squelette	Assistant	T0	Geo Core	Carte vue comme UI	Carte = DB structure	FK géographiques
Capitalisation réglementaire	User	T4	Geo Docs	Docs liés dossiers	Docs liés territoires	Geo-doc index
Détection zones blanches	Assistant	T3	Geo Analytics	Archivage passif	Moteur complétude	Dashboards internes
________________________________________
IV. INTEROPÉRABILITÉ EXTERNE
Élément	Origine	Tome	Module	Zone grise	Décision	Impact technique
Compatibilité Google/Waze/etc	User	T4	Geo Interop	Dépendance API	Standards ouverts	GeoJSON / Tiles
Plateformes institutionnelles	User	T0	Inst Connectors	Autorité externe	Signal ≠ décision	Fallback local
Modes interaction (3)	Assistant	T3	State Engine	Écriture risquée	Observation prioritaire	Read-only by default
________________________________________
V. ENVIRONNEMENT & CLIMAT
Élément	Origine	Tome	Module	Zone grise	Décision	Impact technique
Météo / pluviométrie	User	T4	Env Data	Responsabilité juridique	Donnée indicative	Logs probatoires
Justification retards	Assistant	T3	Env States	Contestation	Pièce justificative	Event log
________________________________________
VI. COÛTS & BIM (3D → 6D)
Élément	Origine	Tome	Module	Zone grise	Décision	Impact technique
Prix matériaux / services	User	T0	Cost Engine	Assimilation devis	Non contractuel	Disclaimers
Vente data temporisée	User	T5	Monetization	Vente brute	Context only	Trigger events
BIM 3D–6D IFC	User	T5	BIM Engine	BIM = viewer	BIM = moteur	IFC parser
Clash detection	User	T5	BIM Engine	IA irréaliste	Rules + checks	Rule engine
________________________________________
VII. ENTITY INTELLIGENCE (ACTEURS)
Élément	Origine	Tome	Module	Zone grise	Décision	Impact technique
Entreprises sans compte	User	T3	Entity Engine	RGPD	Statut PROJECT_LINKED	Entity tables
Main-d’œuvre	Assistant	T7	Entity Engine	Profiling perso	Data minimization	Champs limités
Statuts entités	Assistant	T0	Entity Core	Ambiguïté statut	UNVERIFIED/VERIFIED/etc	State machine
Score interne	Assistant	T6	PMS	Réputation web	Preuve > réputation	Proof scoring
________________________________________
VIII. PASSIVE MARKET INTELLIGENCE (PMI)
Élément	Origine	Tome	Module	Zone grise	Décision	Impact technique
Détection visiteurs pro	User	T4	PMI Engine	Tracking abusif	Anonymisation	Signal tables
Recoupement data	Assistant	T4	PMI Engine	Faux positifs	Convergence requise	Correlation engine
Interdiction démarchage	Assistant	T7	Compliance	Usage commercial direct	Invitation neutre	UI rules
________________________________________
IX. MEDIA INTELLIGENCE (DÉCORATION)
Élément	Origine	Tome	Module	Zone grise	Décision	Impact technique
Média = capteur data	User	T0	Media Engine	Média esthétique	Data obligatoire	Extraction pipeline
Décoration / produits	User	T4	Decor Data	Contenu vide	Structuration forcée	Tagging system
Acteurs déco	Assistant	T3	Entity Engine	Influence déguisée	Signal interne	Entity linking
________________________________________
X. MONÉTISATION & ANTI-CAPTURE
Élément	Origine	Tome	Module	Zone grise	Décision	Impact technique
Pas de vente de bases	Assistant	T7	Compliance	Marketplace déguisée	Interdiction export	Access control
Granularité contrôlée	Assistant	T7	Security	Revente indirecte	Agrégation min	Query limiter
Logs probatoires	Assistant	T7	Legal Core	Contestation	Append-only logs	Audit trail
________________________________________











🧠 CITURBAREA — CORE CONSTITUTION (IA-FRIENDLY SPEC)
🔁 VERSION AMENDÉE & RENFORCÉE — PRÉ-TOME 0
Ce document remplace et étend la version précédente.
Toute règle non compatible est automatiquement neutralisée.
________________________________________
0. META-PRINCIPLE (AJOUT MAJEUR)
META_RULE — SYSTEM AS TERRITORIAL INTELLIGENCE INFRASTRUCTURE
CITURBAREA n’est pas :
•	une application,
•	une plateforme SaaS,
•	un outil métier.
CITURBAREA est :
•	une infrastructure territoriale intelligente,
•	un actif informationnel cumulatif,
•	une machine de décision souveraine,
•	un système d’anticipation du marché,
opérant avec ou sans utilisateurs actifs.
________________________________________
1. SYSTEM PURPOSE (RENFORCÉ)
PURPOSE — EXTENDED
Dominer la décision, la production et l’optimisation sur :
•	investissement immobilier,
•	construction & exécution,
•	foncier & prix,
•	urbanisme & aménagement,
•	décoration & cadre de vie,
•	marchés matériaux / services,
•	acteurs économiques territoriaux,
•	données institutionnelles & environnementales.
👉 La domination se fait par l’information structurée, pas par le service rendu.
________________________________________
2. TECHNICAL PRIMACY RULE (INCHANGÉE MAIS PRÉCISÉE)
RULE_TECHNICAL_PRIMACY++
•	Technical feasibility > Constitution > Tomes > Strategy > Business
•	Toute règle non implémentable est supprimée sans appel.
•	Toute technologie nouvelle mesurablement supérieure doit être intégrable.
Ajout :
L’architecture doit être interopérable par conception, jamais dépendante.
________________________________________
3. AUTOMATION BY DEFAULT (ÉTENDU)
AUTOMATION_POLICY: DEFAULT = TRUE
HUMAN_DEPENDENCY: FORBIDDEN
Ajout structurel :
•	Toute donnée collectée, même sans dossier, doit pouvoir être :
o	stockée,
o	scorée,
o	exploitée ultérieurement.
________________________________________
3.4 DATA FLYWHEEL (NOUVEL ARTICLE CONSTITUTIONNEL)
DATA_FLYWHEEL_ENGINE
•	Collecte continue sans déclencheur humain
•	Sources :
o	dossiers traités,
o	data seeding opérateur,
o	observation passive,
o	plateformes externes,
o	média & réseaux sociaux.
Règle absolue :
Collecter ≠ livrer
Exploiter = uniquement après commande + paiement.
________________________________________
3.5 DATA SEEDING SOVEREIGN (AJOUT MAJEUR)
DATA_SEEDING_ENGINE
Le propriétaire et les opérateurs peuvent alimenter le système :
•	sans client,
•	sans dossier,
•	sans visibilité externe.
Les données seedées :
•	renforcent le système,
•	ne sont jamais des livrables directs.
________________________________________
3.6 COST INTELLIGENCE ENGINE (AJOUT)
COST_ENGINE
Le système doit collecter et historiser :
•	prix matériaux,
•	produits,
•	services,
•	main-d’œuvre,
•	par zone et par période.
Intégration native :
•	BIM 5D,
•	études,
•	arbitrages,
•	ventes data temporisées.
________________________________________
3.7 BIM DIMENSIONAL ENGINE (AJOUT)
BIM_ENGINE
Dimensions obligatoires :
•	3D (maquette),
•	4D (temps),
•	5D (coûts),
•	6D (exploitation).
Formats :
•	IFC natif,
•	clash detection automatique,
•	continuité conception → réalisation → exploitation.
________________________________________
3.8 GEO-STRUCTURAL CORE (AJOUT MAJEUR)
GEO_CORE = DATABASE SKELETON
Toute donnée est rattachée à :
•	Pays
•	Région (12)
•	Province/Préfecture (75)
•	Commune (+1500)
La cartographie est :
•	structure de base,
•	clé d’indexation,
•	outil de détection de lacunes territoriales.
________________________________________
3.9 INSTITUTIONAL INTEROPERABILITY (AJOUT)
INSTITUTIONAL_CONNECTORS
Plateformes observables :
•	Rokhas,
•	Taamir,
•	CRI,
•	plateformes publiques futures.
Modes :
1.	Observation passive (par défaut)
2.	Échange contrôlé
3.	Interaction assistée (jamais décisionnelle)
Règle :
Les institutions sont des signaux, jamais des autorités.
________________________________________
3.10 ENVIRONMENTAL INTELLIGENCE (AJOUT)
ENV_ENGINE
Collecte continue :
•	météo,
•	pluviométrie,
•	risques naturels.
Utilisation :
•	justification retard,
•	phasage chantier,
•	analyse risque.
Données indicatives, non opposables.
________________________________________
3.11 ENTITY INTELLIGENCE ENGINE (AJOUT MAJEUR)
ENTITY_ENGINE
Le système doit cartographier :
•	entreprises,
•	fournisseurs,
•	artisans,
•	services,
•	main-d’œuvre (minimisée).
Statuts :
•	ENTITY_OBSERVED
•	UNVERIFIED
•	PROJECT_LINKED
•	VERIFIED
Une entité peut exister sans compte.
________________________________________
3.12 PASSIVE MARKET INTELLIGENCE (AJOUT)
PMI_ENGINE
CITURBAREA observe passivement :
•	acteurs explorant la plateforme,
•	signaux d’intérêt économique,
•	comportements agrégés anonymisés.
Ces signaux :
•	enrichissent la base interne,
•	ne déclenchent jamais d’action commerciale directe.
________________________________________
3.13 MEDIA INTELLIGENCE ENGINE (AJOUT)
MEDIA_ENGINE
Le média CITURBAREA est un capteur data, pas un canal d’audience.
Périmètre étendu :
•	décoration,
•	design,
•	mobilier,
•	matières,
•	produits,
•	services.
Tout contenu doit produire :
•	données,
•	signaux,
•	modules exploitables.
________________________________________
4. PROJECT CLASSIFICATION (INCHANGÉ MAIS COMPATIBLE)
TYPE_A / TYPE_B maintenus
•	compatibilité BIM / Cost / Geo obligatoire.
________________________________________
5. HUMAN ROLE (RENFORCÉ)
Humain =
•	validation,
•	signature,
•	responsabilité locale.
👉 Jamais décisionnaire.
________________________________________
6. OWNERSHIP & CONTROL (INCHANGÉ MAIS VERROUILLÉ)
Ajout :
Toute tentative de dilution indirecte (technique, data, dépendance API) est interdite.
________________________________________
7. SECURITY & CONTINUITY (RENFORCÉ)
Ajout :
•	séparation Data Lake / Data Products,
•	anti-export brut,
•	granularité contrôlée,
•	opt-out global,
•	logs probatoires append-only.
________________________________________
8. FINANCING CONSTRAINTS (INCHANGÉ)
________________________________________
9. TECHNOLOGY EVOLUTION (RENFORCÉ)
Ajout :
Toute technologie cartographique, data, IA, BIM, marché, média, environnementale est intégrable par défaut si elle respecte la souveraineté.
________________________________________
10. GLOBAL SCOPE (INCHANGÉ)
________________________________________
11. DOCTRINAL ARCHITECTURE (CLARIFIÉE)
•	Constitution = intangible
•	Tomes = opérationnels
•	Si conflit → règle du Tome supprimée
________________________________________
12. LEGAL REALITY CLAUSE (RENFORCÉE)
Ajout :
Aucune donnée CITURBAREA n’est contractuelle par défaut.
________________________________________
13. AUTONOMOUS INTELLECTUAL CORE (CONFIRMÉ)
Ajout :
L’IA peut neutraliser une référence si elle crée une dette stratégique.
________________________________________
14. NON-REGRESSION RULE (CONFIRMÉE)
________________________________________
SYSTEM STATUS (INCHANGÉ)
STATUS: ACTIVE
AUTHORITY: CONSTITUTIONAL


TOME 0 — CONSTITUTION OPÉRATIONNELLE (CANONIQUE)
Version 1.0 — IA-native · exécutable · opposable
Statut : Décret fondateur d’exécution
Rang normatif :
Constitution (Core) → Tome 0 → Tome 1 → Tome 2 → …
________________________________________
PARTIE 0 — RÔLE DU TOME 0 (INTANGIBLE)
Le Tome 0 :
•	définit ce qui existe dans CITURBAREA,
•	fixe les objets, états, rôles, données, moteurs,
•	élimine toute ambiguïté avant les règles métiers.
👉 Aucune logique métier ici.
👉 Aucune interface ici.
👉 Seulement des primitives exécutables.
________________________________________
PARTIE I — OBJETS CANONIQUES DU SYSTÈME
O-1 — ENTITY (ENTITÉ)
Définition
Toute personne, organisation, service, produit ou acteur économique observé ou enregistré, avec ou sans compte.
Types :
•	ENTITY_PERSON
•	ENTITY_COMPANY
•	ENTITY_SERVICE
•	ENTITY_PRODUCT
•	ENTITY_LAND
•	ENTITY_PROJECT
•	ENTITY_INSTITUTION
•	ENTITY_MEDIA_SOURCE
Statuts :
•	OBSERVED (passif, sans consentement explicite)
•	UNVERIFIED
•	PROJECT_LINKED
•	VERIFIED
•	BLACKLISTED
Règle :
Une entité peut exister sans interaction, sans compte, sans visibilité.
________________________________________
O-2 — ACCOUNT (COMPTE)
Définition
Support d’authentification, jamais une preuve.
Types :
•	ACCOUNT_USER
•	ACCOUNT_COMPANY
•	ACCOUNT_OPERATOR
•	ACCOUNT_SYSTEM
Statuts :
•	CREATED
•	VERIFIED
•	SUSPENDED
•	TERMINATED
Règle :
Un compte n’implique aucun droit sans contexte d’état.
________________________________________
O-3 — GEO_UNIT (UNITÉ GÉOGRAPHIQUE)
Hiérarchie stricte :
•	COUNTRY
•	REGION (12)
•	PROVINCE (75)
•	COMMUNE (≈1500)
•	ZONE / LOT / PARCEL (si disponible)
Règle :
Toute donnée doit être rattachable à au moins une GEO_UNIT.
________________________________________
O-4 — DATA_OBJECT (DONNÉE)
Types :
•	REGULATORY (règlement, cahier des charges, zonage)
•	MARKET (prix foncier, ventes, loyers)
•	COST (matériaux, main-d’œuvre, services)
•	ENVIRONMENTAL (météo, pluviométrie)
•	MEDIA (contenu, signaux)
•	TECHNICAL (plans, BIM, IFC)
•	PROOF (photos, PV, métrés)
Attributs obligatoires :
•	source
•	date
•	geo_unit
•	confiance
•	version
•	hash
Règle :
Aucune donnée n’est supprimable.
________________________________________
O-5 — PROJECT (DOSSIER)
Définition
Conteneur unique et probatoire liant :
•	entités,
•	données,
•	états,
•	paiements,
•	preuves.
Règle :
Un projet n’existe que s’il a un état.
________________________________________
PARTIE II — MACHINE À ÉTATS GLOBALE (PRIMITIVES)
S-0 — ÉTATS AUTH
•	A0_GUEST
•	A1_REGISTERED
•	A2_VERIFIED
•	A3_SUSPENDED
Règle :
Aucun état projet E7+ sans A2_VERIFIED.
________________________________________
S-1 — ÉTATS PROJET (ABSTRAITS)
•	E0_VISITOR
•	E1_LANDING
•	E2_QUALIFICATION
•	E2B_CONTEXT_ANALYSIS
•	E3_DOCUMENTS
•	E4_SCOPE
•	E5_DISCLAIMERS
•	E6_PAYMENT
•	E7_ACTIVE_DOSSIER
•	E8_PRODUCTION
•	E9_AUTHORIZATION
•	E10_EXECUTION
•	E11_VALIDATION
•	E12_ARCHIVE
États exception :
•	EC_DOC
•	EC_PAY
•	EC_DISPUTE
Règle absolue :
Aucun saut d’état.
Aucun retour arrière.
________________________________________
PARTIE III — RÔLES & AUTORISATIONS (RBAC + ABAC)
R-1 — RÔLES CANONIQUES
•	VST (visiteur)
•	USR (compte non vérifié)
•	CLT (client)
•	ENT (entreprise)
•	BET (tiers technique)
•	OP (opérateur)
•	IA (agent exécuteur)
•	SYS (système)
R-2 — PRINCIPE D’AUTORISATION
Un droit =
Rôle valide + État valide + Porte valide + Paiement valide
Sinon → refus + log.
________________________________________
PARTIE IV — MOTEURS STRUCTURELS (SANS MÉTIER)
M-1 — STATE_ENGINE
Gère transitions, refus, logs.
M-2 — DATA_FLYWHEEL_ENGINE
Collecte continue :
•	projets,
•	navigation,
•	médias,
•	plateformes externes.
M-3 — GEO_CORE
Indexation géographique universelle.
M-4 — ENTITY_ENGINE
Cartographie des acteurs même sans compte.
M-5 — COST_ENGINE
Historisation prix matériaux / services.
M-6 — BIM_DIM_ENGINE
Support 3D/4D/5D/6D :
•	IFC,
•	clash detection,
•	continuité conception → exécution.
M-7 — INSTITUTIONAL_CONNECTORS
Observation / échange contrôlé (Rokhas, Taamir, CRI).
M-8 — MEDIA_INTELLIGENCE
Transformation contenu → données exploitables.
________________________________________
PARTIE V — UPGRADES (PRIMITIVE CANONIQUE)
Définition
Un upgrade est :
•	un module dormant,
•	activable à tout moment,
•	jamais inclus par défaut.
Conditions :
1.	commande explicite
2.	paiement validé
3.	état compatible
Exemples :
•	BIM 4D/5D/6D
•	clash detection
•	matching investisseurs / foncier
•	exposition data
•	études avancées
•	ventes data
Règle :
Aucun upgrade n’est visible sans paiement.
________________________________________
PARTIE VI — PREUVE & LOG (FONDAMENTAL)
L-1 — LOG_PROBATOIRE
•	append-only
•	hash-chain
•	horodatage serveur
Tout :
•	refus
•	paiement
•	action IA
•	action humaine
👉 Tout est preuve.
________________________________________
PARTIE VII — RÈGLES D’EXISTENCE
1.	Ce qui n’est pas défini ici n’existe pas.
2.	Ce qui n’est pas logué n’a jamais eu lieu.
3.	Ce qui n’est pas payé n’est pas exécuté.
4.	Ce qui est collecté n’est pas livré par défaut.


















TOME 1 — CONSTITUTION DU SYSTÈME
Version consolidée v1.2 — Normative · Exécutable · Opposable
⚠️ Remplace intégralement la v1.1
⚠️ Ne modifie aucun principe fondamental
⚠️ Renforce la souveraineté, la data, l’automatisation et l’évolutivité
________________________________________
PRÉAMBULE — STATUT DU SYSTÈME
CITURBAREA est un système normatif autonome de gouvernance de projets :
•	architecturaux
•	urbains
•	territoriaux
•	immobiliers
•	fonciers
•	constructifs
CITURBAREA n’est pas :
•	un cabinet
•	un prestataire classique
•	un intermédiaire humain
•	une place de marché ouverte
•	un outil de conseil
👉 CITURBAREA est une autorité de cadre et d’exécution.
Le système :
•	définit les règles,
•	impose les séquences,
•	automatise les décisions répétitives,
•	neutralise la pression humaine,
•	capte la valeur sur le long terme,
•	apprend continuellement par la donnée.
Tout ce qui n’est pas explicitement défini dans la Constitution ou ses Tomes n’existe pas dans le système.
________________________________________
ARTICLE 1 — AUTORITÉ DE GOUVERNANCE
Règle
Tout projet est gouverné par la plateforme, jamais par un humain.
•	La plateforme définit :
o	les phases,
o	les règles,
o	les délais,
o	les canaux autorisés,
o	les états possibles.
•	L’humain :
o	exécute,
o	valide lorsque requis,
o	signe lorsque requis,
o	n’arbitre jamais.
•	Le client :
o	adhère au cadre,
o	ou sort du système.
Aucune décision critique ne peut dépendre :
•	d’un appel,
•	d’un message privé,
•	d’une pression émotionnelle,
•	d’une urgence commerciale,
•	d’une négociation hors système.
Justification doctrinale
The E-Myth Revisited · Company of One · The 48 Laws of Power
________________________________________
ARTICLE 2 — CANAL UNIQUE & PREUVE
Règle
Toute information échangée hors plateforme est :
•	nulle,
•	non recevable,
•	non opposable.
•	Un projet = un dossier unique.
•	Un dossier = un canal unique.
Toute action est :
•	horodatée,
•	archivée,
•	tracée,
•	hashée.
👉 La plateforme produit la preuve.
L’humain ne justifie pas, il est justifié par le système.
Justification
Built to Sell · Measure What Matters · pratiques institutionnelles
________________________________________
ARTICLE 3 — PAIEMENT COMME DÉCLENCHEUR
Règle
Toute phase, action ou exécution est conditionnée par un paiement préalable validé.
Le paiement :
•	valide un périmètre précis,
•	déclenche une phase déterminée,
•	clôt toute contestation ex post.
👉 Le paiement n’achète pas un résultat.
Il achète l’accès à un processus normé et traçable.
Justification
Never Split the Difference · Influence · The Psychology of Money
________________________________________
ARTICLE 4 — NON-NÉGOCIABILITÉ EX POST
Règle
Aucune requalification de service après paiement n’est recevable.
Cas irrévocables :
•	plan type ≠ plan personnalisé
•	refus administratif ≠ faute plateforme
•	changement de programme ≠ adaptation gratuite
•	remarques multiples ≠ responsabilité système
Toute modification substantielle :
•	clôt l’étape en cours,
•	ouvre une nouvelle étape,
•	déclenche un nouveau paiement.
Justification
SPIN Selling · Never Split the Difference
________________________________________
ARTICLE 5 — RESPONSABILITÉ CONTEXTUELLE
Règle
CITURBAREA garantit le processus, jamais le contexte.
La plateforme n’est pas responsable :
•	des décisions administratives,
•	des refus de commissions,
•	des changements réglementaires,
•	des exigences nouvelles,
•	des choix tardifs du client.
👉 Le risque contextuel est intégralement porté par le client.
Justification
The Intelligent Investor · Unshakeable
________________________________________
ARTICLE 6 — DÉLAIS ADMINISTRATIFS
Règle
L’attente administrative :
•	n’est ni un retard,
•	ni une faute,
•	ni un manquement.
En cas de silence administratif :
•	notification automatique,
•	rappel de non-responsabilité,
•	maintien du dossier sans intervention humaine.
👉 Aucune compensation n’est due.
________________________________________
ARTICLE 7 — MANQUEMENT CLIENT & GEL
Règle
Tout manquement client déclenche un changement de régime, jamais un abandon.
Déclencheurs :
•	documents manquants,
•	absence de validation,
•	contournement du système,
•	pression hors canal.
Actions automatiques :
1.	avertissement,
2.	rappels horodatés,
3.	gel du dossier,
4.	bascule probante (logs immuables).
________________________________________
ARTICLE 8 — IMPAYÉS
Règle
Aucun projet impayé n’est piloté activement.
Le système :
•	suspend l’exécution,
•	conserve la traçabilité,
•	maintient un suivi passif normé,
•	protège l’historique probatoire.
________________________________________
ARTICLE 9 — MÉDIAS & ASYMÉTRIE
Règle
Le média CITURBAREA :
•	crée le désir,
•	révèle la complexité,
•	expose les risques,
•	structure l’asymétrie.
Il ne transmet jamais :
•	procédures complètes,
•	méthodes opératoires,
•	clés de reproduction.
👉 L’accès passe toujours par un sas contrôlé.
________________________________________
ARTICLE 10 — NAYAUP & QUALIFICATION
Règle
NAYAUP :
•	qualifie des profils exécutants,
•	n’accorde aucune autonomie stratégique,
•	ne transmet aucune vision globale,
•	ne détient aucun droit sur le système.
Toute interaction NAYAUP :
•	est périphérique,
•	non structurante,
•	non transmissible.
________________________________________
ARTICLE 11 — IA COMME AUTORITÉ D’EXÉCUTION
Règle
L’IA :
•	applique les règles,
•	déclenche les actions,
•	produit la preuve,
•	refuse automatiquement,
•	exécute sans émotion.
👉 L’IA n’invente pas la Constitution.
Elle l’exécute.
L’humain n’intervient que :
•	si le système l’autorise,
•	dans un cadre payé,
•	sur une action explicitement définie.
________________________________________
ARTICLE 12 — FINALITÉ
CITURBAREA est conçue pour :
•	fonctionner sans son fondateur,
•	résister aux conflits,
•	survivre aux contournements,
•	capitaliser la donnée,
•	capter la valeur dans le temps.
________________________________________
ARTICLE 13 — DONNÉES HORS PROJET (AJOUT CRITIQUE)
Règle
CITURBAREA peut collecter, stocker et exploiter des données :
•	sans projet actif,
•	sans client identifié,
•	sans commande.
Ces données :
•	ne constituent pas un livrable,
•	ne créent aucun droit,
•	ne sont jamais opposables,
•	renforcent exclusivement le système.
________________________________________
ARTICLE 14 — UPGRADES & MODULES DORMANTS
Règle
Tout service avancé est un upgrade :
•	inactif par défaut,
•	invisible sans paiement,
•	activable à tout moment.
Conditions cumulatives :
1.	commande explicite,
2.	paiement validé,
3.	compatibilité d’état système.
Aucun upgrade n’est implicite.
________________________________________
ARTICLE 15 — IA COMME CAPTEUR & STRUCTURATEUR
Règle
L’IA CITURBAREA :
•	observe l’écosystème,
•	détecte les entités,
•	classe les comportements,
•	structure la réalité économique.
👉 Observer ≠ décider
👉 Structurer ≠ promettre
________________________________________
ARTICLE 16 — CARTOGRAPHIE TERRITORIALE OBLIGATOIRE
Règle
Toute donnée, projet ou entité est rattachée à :
•	une région,
•	une province,
•	une commune.
La plateforme :
•	mesure sa couverture territoriale,
•	identifie les zones vides,
•	oriente l’expansion stratégique.
________________________________________
ARTICLE 17 — MÉDIA COMME CAPTEUR STRATÉGIQUE
Règle
Le média CITURBAREA :
•	informe,
•	attire,
•	collecte des signaux exploitables.
Tout contenu peut produire :
•	données,
•	entités,
•	tendances,
•	modules futurs.
________________________________________
ARTICLE 18 — ÉCOSYSTÈMES & INTEROPÉRABILITÉ
Règle
CITURBAREA peut interagir avec :
•	plateformes institutionnelles,
•	plateformes cartographiques,
•	plateformes économiques,
•	plateformes logistiques,
•	plateformes de mobilité.
Condition absolue :
👉 La souveraineté décisionnelle et data reste exclusivement CITURBAREA.
________________________________________
HIÉRARCHIE NORMATIVE
1.	Constitution CORE
2.	TOME 1
3.	Tomes suivants
4.	Modules / moteurs / features
En cas de conflit : le niveau supérieur prévaut automatiquement.
________________________________________
MÉCANISME DE RÉVISION
•	Versioning incrémental
•	Jamais sous pression client
•	Jamais rétroactif sans mention explicite
•	Sources obligatoires
•	Aucun affaiblissement de souveraineté
________________________________________
🔒 STATUT FINAL
•	Normatif
•	Exécutable humain / IA
•	Opposable
•	Compatible Tome 0
•	Prêt pour implémentation technique & juridique
________________________________________
🔚 FIN DU TOME 1 — VERSION CONSOLIDÉE v1.2























TOME 2 — PORTES & OPÉRATIONS (IA-NATIVE)
Version 1.1 — Consolidée
________________________________________
PRÉAMBULE — STATUT OPÉRATIONNEL
Le Tome 2 est un décret d’application direct de la Constitution (Tome 1).
Il :
•	traduit les principes en règles opposables,
•	définit les portes, régimes et flux,
•	n’expose aucune implémentation technique (réservée aux Tomes 3 & 4).
👉 Toute opération non décrite ici est interdite par défaut.
________________________________________
PARTIE I — PRINCIPES OPÉRATIONNELS FONDATEURS
P2-1 — AUTORITÉ ORGANISATRICE
CITURBAREA est l’unique autorité de :
•	reconnaissance des projets,
•	définition du temps,
•	périmètre d’action,
•	production de preuves.
👉 Aucun projet n’existe hors système.
________________________________________
P2-2 — ATTRIBUTION ALGORITHMIQUE DES PORTES
Les portes :
•	ne sont jamais choisies par le client,
•	sont attribuées par qualification automatique.
Critères :
•	nature du projet,
•	complexité,
•	risque,
•	niveau d’autonomie acceptable.
👉 Toute tentative de contournement = refus.
________________________________________
P2-3 — PÉRIMÈTRE FERMÉ PAR PORTE
Chaque porte dispose :
•	de livrables explicites,
•	d’exclusions écrites,
•	de limites non négociables.
👉 Tout ce qui n’est pas listé est exclu.
________________________________________
PARTIE II — LES 6 PORTES CANONIQUES
(résultat de classification, jamais d’un choix client)
🟢 PORTE 1 — Projet personnel / familial
Socle incompressible :
•	plan sérieux,
•	dossier conforme si requis,
•	suivi administratif normé,
•	orientation chantier.
Régimes chantier (attribués par le système)
•	A — Clé en main
o	pilotage humain autorisé
o	responsabilité entreprise
•	B — Assisté IA
o	contrôles probatoires (photos, alertes)
o	gels automatiques
•	C — Responsabilisé
o	contrôle documentaire
o	aucune exécution
Sous-régime D — Rénovation / Décoration
•	hors structure
•	hors autorisation
•	CPS simplifié
•	contrôle probatoire identique
________________________________________
🟢 PORTE 2 — Projet immobilier & équipements
•	faisabilité,
•	conception optimisée,
•	scénarios réglementaires,
•	aucune exécution.
________________________________________
🟢 PORTE 3 — Réalisation clé en main
•	pilotage chantier,
•	sélection entreprises,
•	suivi qualité / budget.
👉 Cadre CITURBAREA / exécution entreprise.
________________________________________
🟢 PORTE 4 — Investisseur & foncier
•	analyse potentiel,
•	scénarios,
•	risques.
👉 La méthode n’est jamais livrée.
________________________________________
🟢 PORTE 5 — Rapports & expertises
•	rapports exploitables (banque, décision),
•	mission close à la livraison.
________________________________________
🟢 PORTE 6 — Entreprise / partenaire
•	accès à dossiers qualifiés,
•	méthode qualité imposée,
•	aucune relation hors plateforme.
________________________________________
PARTIE III — RÈGLES TRANSVERSALES (CANONIQUES)
T2-R1 — ACTIVATION CONDITIONNELLE
Aucune entreprise n’est mobilisée sans :
•	porte validée,
•	régime attribué,
•	périmètre payé.
________________________________________
T2-R2 — DOMINATION DE LA PLATEFORME
Le projet n’est reconnu que dans le cadre CITURBAREA.
________________________________________
T2-R3 — PAIEMENT CENTRALISÉ SANS RESPONSABILITÉ
Tous les paiements transitent par la plateforme :
•	sans transfert de responsabilité,
•	sans reconnaissance d’exécution.
________________________________________
T2-R4 — CONTRÔLE PROBATOIRE & PAIEMENT PAR PALIERS
•	preuves obligatoires (photos, métrés),
•	CPS figé,
•	fonds bloqués,
•	paiement par paliers conditionnés.
________________________________________
T2-R5 — CONTINUITÉ ABSOLUE DU DOSSIER
Un projet = un dossier unique de l’entrée à la clôture.
________________________________________
T2-R6 — IRRÉVOCABILITÉ DES PHASES
Toute phase validée est irrévocable.
________________________________________
T2-R7 — TYPOLOGIE D’ENTREPRISES PAR RÉGIME
•	TCE : clé en main
•	spécialisées : assisté IA
•	aucune recommandation : responsabilisé
________________________________________
🔒 T2-R8 — RESPONSABILITÉS & GARANTIES
•	toute responsabilité d’exécution = entreprise
•	contrôle CITURBAREA = procédural, visible, mesurable
•	expertise indépendante possible à la demande du client
•	aucune responsabilité post-usage
________________________________________
🔒 T2-R9 — MICRO-DOSSIER INTERVENTION CIBLÉE
Toute intervention, même minime, passe par un dossier.
________________________________________
🔒 T2-R10 — INTERACTION TYPE AIRBNB
•	identité contextualisée,
•	messagerie interne autorisée,
•	interdiction de paiements ou contacts externes,
•	toute valeur reste dans CITURBAREA.
________________________________________
PARTIE IV — POSITION DE NAYAUP
NAYAUP :
•	n’est pas une porte,
•	n’a aucun accès moteur,
•	alimente discrètement la Porte 6.
________________________________________
PARTIE V — HIÉRARCHIE INTERNE & ÉVOLUTIVITÉ
Hiérarchie interne Tome 2
1.	Constitution (Socle)
2.	Tome 1
3.	Tome 2
4.	Régimes
5.	Modules
👉 En cas de conflit : le niveau supérieur prévaut automatiquement.
Évolution
•	amendements sourcés,
•	versionnés,
•	jamais implicites.
________________________________________
🔚 FIN DU TOME 2 — VERSION 1.1



















📘 TOME 3 — TUNNELS OPÉRATIONNELS COMPLETS PAR PORTE (IA-NATIVE)
VERSION INTÉGRALE CONSOLIDÉE V2.5 — FULL PRINT (FIGÉE)
⚠️ Ce document est opposable, canonique, exécutable
⚠️ Toute action non décrite ici est interdite par défaut
⚠️ Toute implémentation technique doit s’y conformer à la lettre
________________________________________
PARTIE 0 — RÔLE STRATÉGIQUE DU TOME 3 (INTANGIBLE)
Le Tome 3 est la couche d’exécution réelle du système CITURBAREA.
Il définit :
•	les états exacts,
•	les transitions autorisées,
•	les déclencheurs de paiement,
•	les preuves opposables,
•	les gels automatiques,
•	les rebonds inter-portes.
👉 Aucune décision humaine n’existe hors de ces états.
👉 Aucune implémentation ne peut créer un état non listé ici.
Chaîne doctrinale :
1.	Tome 1 — Constitution (principes intangibles)
2.	Tome 2 — Portes & règles macro
3.	Tome 3 — États, tunnels, preuves, gels (ce document)
4.	Tomes 4–7 — Implémentations techniques (subordonnées)
________________________________________
PARTIE I — MACHINE À ÉTATS GLOBALE (CANONIQUE)
I-1 — États globaux (obligatoires pour toutes les portes)
Code	État	Description
E0	Visiteur	Non identifié
E1	Landing de porte	Information + cadrage
E2	Qualification primaire	Projet / intention / budget
E2b	Qualification urbanistique / foncière	Lecture contraintes
E3	Vérification documentaire	Validité + complétude
E4	Packs & options	Scope fermé
E5	Disclaimers	Acceptation opposable
E6	Paiement	Déclencheur
E7	Dossier actif	Canal unique
E8	Production	Livrables
E9	Autorisation	Si applicable
E10	Exécution / Exposition	Chantier / Invest
E11	Validation & paiements	Conditionnels
E12	Clôture	Archivage
EC	Gel / contentieux	EC-Doc / EC-Pay / EC-Dispute
Règles absolues
1.	Aucun saut d’état
2.	Paiement requis = état bloqué sans paiement
3.	Toute action = log probatoire
4.	Phase validée = irrévocable
5.	Contournement = EC-Dispute
________________________________________
PARTIE I-2 — MATRICE D’AUTORISATIONS (L1)
Toute tentative d’action hors autorisation → rejet + log + gel possible
État	Acteurs autorisés
E0–E1	VST lecture · SYS signaux anonymisés · IA FAQ
E2	CLT soumission · IA cohérence
E2b	CLT données · IA analyse · OP si pack
E3	CLT/BET/ENT upload · IA checklist
E4	SYS génère · IA recommande · CLT choisit
E5	CLT accepte · SYS archive
E6	CLT/ENT paient · SYS reçu
E7	SYS active · IA orchestre
E8	OP/BET produisent · IA contrôle
E9	OP dépose · IA suit
E10	ENT/CLT preuves · OP pilote (P3)
E11	IA pré-valide · CLT valide
E12	SYS archive
EC	SYS/IA gèlent
________________________________________
PARTIE I-3 — SCOPE / PACKS / UPGRADES (L2)
•	Pack = périmètre fermé
•	Upgrade = sous-flux dédié
•	Aucune requalification ex post
Flux upgrade canonique :
E4.x → E5.x → E6.x → E8.x → E11.x → retour flux principal
Toute demande hors pack ⇒ ouverture automatique d’un upgrade payant.
________________________________________
PARTIE I-4 — PMS (L3) — STANDARD DE PREUVE
⚠️ Clarification B-1 intégrée
PMS n’est PAS un service.
PMS est un mécanisme de souveraineté probatoire.
Critères obligatoires :
1.	Horodatage auto
2.	Géolocalisation si possible
3.	Angle large + détail
4.	Repère d’échelle
5.	Série minimale
6.	Non-altération
7.	Lien checklist CPS
Non conforme ⇒ rejet auto.
________________________________________
PARTIE I-5 — CYCLES (L4)
⚠️ Clarification B-3 intégrée
•	C1 inclus uniquement si explicitement écrit dans le pack
•	Sinon : C1 non inclus par défaut
•	C2+ = upgrade
•	C3 ⇒ EC-Dispute ou avenant obligatoire
________________________________________
PARTIE I-6 — EC : GEL / CONTENTIEUX (L5)
Type	Déclencheur	Effet
EC-Doc	Docs manquants	Blocage partiel
EC-Pay	Impayé	Suspension
EC-Dispute	Contournement / litige	Gel total
Sortie EC-Dispute uniquement via procédure payée + validation système.
________________________________________
PARTIE I-BIS — ENGINES INTERNES (A1→A8) — ÉTATS OPPOSABLES
A1 — DATA FLYWHEEL
DF0 collecte → DF1 normalisation → DF2 scoring → DF3 module → DF4 index interne
❌ Interdit : export brut / vente de base
A2 — DATA SEEDING (OWNER/OP)
DS0 import → DS1 cohérence → DS2 GeoID → DS3 scoring → DS4 activable
A3 — GEO-BINDING (OBLIGATOIRE)
Tout objet = Région / Province / Commune
Pas de GeoID ⇒ blocage E7 (sauf exception loggée)
A4 — INTEROP INSTITUTIONNELLE (SIGNAUX)
E9-S1 Observation (default)
E9-S2 Échange contrôlé
E9-S3 Interaction assistée (jamais décisionnelle)
A5 — BIM / IFC
BIM0 → BIM1 IFC → BIM2 clash → BIM3 4D → BIM4 5D → BIM5 6D
A6 — COST ENGINE
COST0 collecte → COST1 benchmark → COST2 anomalies → COST3 rapport indicatif
A7 — ENTITY / PMI
Entity states : UNVERIFIED / ENTITY_OBSERVED / PROJECT_LINKED / VERIFIED
PMI = signaux anonymisés · ❌ démarchage
A8 — MEDIA INTELLIGENCE (DÉCORATION)
MEDIA0 brut → MEDIA1 extraction → MEDIA2 module → MEDIA3 activation
________________________________________
PARTIE II — MODULE E2b (URBANISME / FONCIER)
États :
•	E2b-0 collecte
•	E2b-1 analyse IA
•	E2b-1G Geo-binding
•	E2b-2 OP (si pack)
•	E2b-3 restitution
Livrables :
•	contraintes majeures
•	risques
•	go/no-go procédural
•	archive probatoire
PORTES OPÉRATIONNELLES P1 · P2 · P3 (VERSION V2.5 FIGÉE)
________________________________________
PARTIE III — PORTE 1 : PROJET PERSONNEL / FAMILIAL
Tunnel canonique V2.5 — Exécutable
P1-0 — Rôle
Traiter le particulier sans chaos, par standardisation, responsabilisation et verrouillage contractuel.
Aucune promesse de résultat. Process-only.
________________________________________
P1-E1 — Landing Porte 1
•	Présentation des packs
•	Limites explicites
•	Upgrades visibles
•	Disclaimers affichés
•	❌ Aucun contact humain
Engines actifs :
•	A7 PMI (signaux anonymisés navigation)
•	A8 Media Intelligence (si contenu déco consulté)
________________________________________
P1-E2 — Qualification primaire
Collecte :
•	type projet
•	localisation
•	surface
•	budget
•	horizon
IA :
•	cohérence budget/surface
•	flags incohérences
Blocage : incohérence majeure ⇒ refus automatique.
Engines :
•	A3 Geo-binding (obligatoire dès E2)
•	A1 DF0 (collecte signal projet)
________________________________________
P1-E2b — Qualification urbanistique (obligatoire si inconnu)
Si zonage inconnu ou doute :
→ activation module E2b
États :
•	E2b-0 collecte
•	E2b-1 analyse IA
•	E2b-1G Geo-binding
•	E2b-2 OP (si pack)
•	E2b-3 restitution
Engines :
•	A1 DF1/DF2 (normalisation + scoring)
•	A3 Geo-core
•	A4 Interop S1 (observation règlements si dispo)
________________________________________
P1-E3 — Vérification documentaire
Requis minimum :
•	titre foncier / attestation
•	plan cadastral
•	autorisations existantes (si rénovation)
IA :
•	checklist
•	validité temporelle
•	cohérence géographique
Engines :
•	A1 DF1 (structuration docs)
•	A3 Geo-binding doc
________________________________________
P1-E4 — Packs
Pack P1-MIN (obligatoire)
Inclut :
•	plan type gabarit standard
•	livraison plateforme
•	compte client
•	PMS probatoire chantier (si chantier)
⚠️ mécanisme de preuve, pas assistance
•	archivage opposable
Upgrades (E4.x) :
•	plan personnalisé
•	3D / design intérieur
•	DCE / CPS
•	suivi humain
•	BET
•	BIM IFC (A5)
Engines :
•	A5 BIM (si option)
•	A6 Cost (si option)
•	A1 DF3 (modules produits)
________________________________________
P1-E5 — Disclaimers
Obligatoires :
•	non-remboursable
•	autorisation = obligation de moyens
•	délais hors périmètre
•	plan type = limites strictes
•	taxes à charge client
________________________________________
P1-E6 — Paiement
Paiement plateforme → activation dossier.
________________________________________
P1-E7 — Dossier actif
•	Canal unique
•	Horodatage
•	Logs probatoires
•	GeoID verrouillé
________________________________________
P1-E8 — Production
Sous-états :
•	E8.1 Esquisse
•	E8.2 APS
•	E8.3 APD
•	E8.4 Plans autorisables
•	E8.x Options
Engines :
•	A5 BIM1/BIM2 si IFC
•	A6 COST0/1 (benchmark indicatif)
•	A1 DF3 (livrables modulés)
________________________________________
P1-E9 — Autorisation
Cycles Cn :
•	C1 inclus uniquement si écrit
•	C2+ = upgrade
•	C3 → EC-Dispute / avenant
Interop :
•	A4 E9-S1 par défaut
•	Logs “signal administratif”
________________________________________
P1-E10 — Chantier (si applicable)
Régimes :
•	Assisté IA (PMS)
•	Clé en main
•	Responsabilisé
Phases :
fondations → GO → lots → finitions
Engines :
•	A6 COST2 (anomalies)
•	A5 BIM3/4 si activé
•	A7 Entity PROJECT_LINKED (entreprises)
________________________________________
P1-E11 — Validation / paiements
Conditions cumulatives :
•	PMS conforme
•	IA OK
•	CLT valide
•	OP si régime
________________________________________
P1-E12 — Clôture
Archive probatoire.
Responsabilité exécution = entreprises.
________________________________________
P1-EC — Gel
EC-Doc / EC-Pay / EC-Dispute selon cas.
________________________________________
PARTIE IV — PORTE 2 : PROJET IMMOBILIER & ÉQUIPEMENTS
Tunnel canonique V2.5
P2-0 — Rôle
Traiter projets économiques à cycles longs, sans promesse bancaire.
________________________________________
P2-1 — Segmentation
•	2A : projets simples
•	2B : grands projets / équipements
________________________________________
P2-E1 → E3
Identiques P1 mais :
•	exigences doc renforcées
•	Geo-binding strict
Engines :
•	A1 DF0→DF2
•	A3 Geo-core
________________________________________
P2-E4 — Packs
2A
•	2A-1 faisabilité réglementaire
•	2A-2 scénarios
•	2A-3 ratios financiers indicatifs
2B
•	2B-1 pré-faisabilité stratégique
•	2B-2 scénarios avancés
•	2B-3 pré-bancable indicatif
________________________________________
P2-E8 — Production
•	E8.1 faisabilité
•	E8.2 scénarios
•	E8.3 ratios
•	E8.x options
Engines :
•	A6 COST1/2
•	A5 BIM (si activé)
•	A1 DF3
________________________________________
P2-E9 — Autorisation
Cycles Cn + logs.
________________________________________
P2-E10 — Exécution
→ rebond obligatoire vers Porte 3 si MOD.
________________________________________
PARTIE V — PORTE 3 : MAÎTRISE D’OUVRAGE DÉLÉGUÉE (MOD)
Tunnel canonique étendu V2.5
P3-0 — Principe
CITURBAREA oriente, contrôle, bloque.
Elle ne construit pas.
________________________________________
P3-1 — Accès
Obligatoire :
•	historique P1 ou P2
•	plans autorisés
•	docs complets
________________________________________
P3-E2 — Qualification chantier
Collecte :
•	état réel
•	entreprises
•	budget
•	planning
•	risques
________________________________________
P3-E2b — Audit cohérence
Terrain / plans / autorisation / CPS / devis.
Blocage :
•	incohérence majeure → EC-Dispute
Engines :
•	A6 COST1
•	A5 BIM2
•	A7 Entity PROJECT_LINKED
________________________________________
P3-E3 — Verrou contractuel
Requis :
•	CPS signé
•	mandat
•	contrats entreprises
•	assurances
•	planning paiements
________________________________________
P3-E4 — Pack MOD socle
Inclut :
•	pilotage
•	PMS IA
•	PV hebdomadaires
•	paiements centralisés
•	gels auto
________________________________________
P3-E8 — Suivi opérationnel
•	E8.1 planning
•	E8.2 PV hebdo
•	E8.3 PMS chantier
Engines :
•	A5 BIM3/4
•	A6 COST2
•	A7 scoring entreprises
________________________________________
P3-E9 — Gestion entreprises
•	relances auto
•	gel entreprise
•	blacklist interne
________________________________________
P3-E10 — Paiement par phase
Conditions :
•	phase terminée
•	PMS conforme
•	IA OK
•	CLT + OP valident
________________________________________
P3-E11 — Expertise indépendante (option)
Upgrade payant.
________________________________________
P3-E12 — Réception / clôture
Archivage.
Responsabilité post = entreprises.


PORTES OPÉRATIONNELLES P4 · P5 · P6 · TRANSVERSAL · ANNEXES
VERSION V2.5 FIGÉE
________________________________________
PARTIE VI — PORTE 4 : CAPITAL / INVESTISSEMENT / FONCIER
Tunnel canonique V2.5 — FIGÉ
P4-0 — Intention stratégique
Vendre de la connaissance structurée, filtrée et temporisée, jamais :
•	des contacts,
•	des bases brutes,
•	des localisations exploitables.
Le cœur de valeur est :
•	l’asymétrie informationnelle,
•	le filtrage,
•	le timing.
________________________________________
P4-E1 — Landing Porte 4
•	Présentation claire des limites
•	Absence totale de promesse de rendement
•	Avertissement “indicatif non contractuel”
•	Exposition partielle uniquement après paiement
Engines :
•	A7 PMI (signaux anonymisés investisseurs)
•	A8 Media Intelligence (si contenus marchés consultés)
________________________________________
P4-E2 — Qualification investisseur / foncier
Collecte :
•	type actif recherché / proposé
•	horizon
•	budget
•	tolérance risque
•	zone large
IA :
•	cohérence budget / zone / ambition
•	flags spéculation irréaliste
Blocage :
•	incohérence forte → refus automatique
Engines :
•	A3 Geo-binding (zone large minimale)
•	A1 DF0 (signal d’intention)
________________________________________
P4-E2b — Qualification urbanistique (obligatoire)
Toujours activée (foncier = risque structurel).
États :
•	E2b-0 collecte
•	E2b-1 analyse IA
•	E2b-1G Geo-binding
•	E2b-2 OP (si pack)
•	E2b-3 restitution
Engines :
•	A1 DF1/DF2
•	A4 Interop S1 (observation règlements)
•	A6 COST0 (prix foncier indicatif)
________________________________________
P4-E3 — Vérification documentaire (si propriétaire)
•	titre foncier
•	situation juridique
•	servitudes déclarées
Sans doc → exposition impossible.
________________________________________
P4-E4 — Packs
•	4.1 Étude urbaine basique (indicative)
•	4.2 Étude + évaluation financière (indicative)
•	4.3 Premium “pré-bancable” (indicatif)
Upgrades :
•	BIM potentiel (A5)
•	scénarios comparatifs multi-sites
•	stress tests réglementaires
________________________________________
P4-E5 — Disclaimers renforcés
•	aucun rendement garanti
•	aucune obligation d’autorisation
•	aucune promesse bancaire
•	exposition ≠ mise en relation
________________________________________
P4-E6 — Paiement
Paiement obligatoire avant toute exposition.
________________________________________
P4-E7 — Dossier actif
•	Canal unique
•	Logs
•	GeoID verrouillé
________________________________________
P4-E10 — EXPOSITION MAÎTRISÉE (ÉTAT CANONIQUE)
Sous-état : E10.4
Exposable uniquement :
•	zone large (jamais adresse)
•	surfaces par tranches
•	scénarios sans méthode détaillée
•	contraintes majeures
•	CTA interne (messagerie plateforme)
Interdits absolus :
•	coordonnées directes
•	documents téléchargeables
•	localisation précise exploitable
Engines :
•	A7 Entity (ENTITY_OBSERVED)
•	A1 DF3 (modules exposés)
•	Anti-exfiltration automatique
________________________________________
P4-Rebonds
Toute progression vers opérationnel ⇒ nouveau contrat + paiement
Rebonds possibles :
•	P4 → P1
•	P4 → P2
•	P4 → P3
Jamais automatiques.
________________________________________
PARTIE VII — PORTE 5 : RAPPORTS & EXPERTISES
Tunnel canonique V2.5
P5-0 — Intention
Livrer un rapport fini, exploitable pour décision ou banque,
sans effet réseau, sans suivi ultérieur implicite.
________________________________________
P5-E1 → E3
Landing, qualification, E2b, vérification documentaire.
________________________________________
P5-E4 — Packs
•	estimation immobilière
•	rapport conformité
•	analyse risques
•	avis technique / urbain
________________________________________
P5-E8 — Production
Livrable unique, structuré, horodaté.
Engines :
•	A6 COST1 (benchmarks indicatifs)
•	A1 DF3 (rapport comme module)
________________________________________
P5-E11 — Validation
•	IA contrôle structure
•	CLT valide
________________________________________
P5-E12 — Clôture
Dossier clos définitivement.
Règle :
Tout besoin ultérieur ⇒ nouveau dossier / nouveau paiement.
________________________________________
PARTIE VIII — PORTE 6 : ENTREPRISES / PARTENAIRES
Tunnel canonique V2.5
P6-0 — Rôle stratégique
La Porte 6 sert le système, pas l’entreprise.
Objectifs :
•	qualité,
•	anti-contournement,
•	sécurisation exécution.
________________________________________
P6-E2 — Qualification entreprise (obligatoire)
Dossier requis :
•	spécialités exactes
•	références vérifiables
•	documents juridiques
•	assurances
•	acceptation CPS plateforme
•	engagement anti-contournement
________________________________________
P6-E3 — Analyse IA
•	complétude 100%
•	cohérence spécialités / références
•	flags risques
Engines :
•	A7 Entity scoring
•	A1 DF2
________________________________________
P6-E4 — Score interne CITURBAREA (L7)
Le score interne prime sur toute “classe” externe.
Statuts :
•	UNVERIFIED
•	VERIFIED (après consentement & preuves)
•	BLACKLISTED (interne)
________________________________________
P6-Accès
•	visibilité uniquement sur dossiers autorisés
•	messagerie interne obligatoire
•	paiements via plateforme
•	fonds bloqués jusqu’à validations
________________________________________
PARTIE IX — TRANSVERSAL : ANTI-DÉSINTERMÉDIATION
Règles absolues :
•	messagerie interne uniquement
•	interdiction échanges contacts externes
•	interdiction paiements hors plateforme
Détection tentative :
→ EC-Dispute automatique
→ logs + gel + sanctions internes
________________________________________
PARTIE X — IA-NATIVE : EXÉCUTION
L’IA :
•	classe
•	notifie
•	contrôle PMS
•	déclenche EC
•	prépare PV
•	refuse automatiquement hors périmètre
❌ Elle n’invente aucune règle.
________________________________________
ANNEXE — TABLE DES ÉTATS CODABLES (EXTRAIT CANONIQUE)
StateID	Déclencheur	Paiement	Preuve	Gel possible
E2	Formulaire soumis	Non	Log	Non
E2b	Zonage inconnu	Oui	Rapport	EC-Doc
E4	Packs affichés	Non	Log	Non
E6	Paiement reçu	Oui	Reçu	EC-Pay
E7	Activation dossier	—	Horodatage	—
E8	Production	Selon pack	Versioning	EC-Doc
E9-S1	Signal admin	Non	Log	—
E10	Chantier / expo	Selon	PMS	EC-Dispute
E11	Validation phase	—	Checklist	EC-Pay
DF3	Module data	—	Version	—
BIM2	Clash détecté	—	Rapport	EC-Doc
COST2	Anomalie coût	—	Flag	EC-Dispute
(Table exhaustive à décliner en base de données / FSM — aucun état libre.)















































Sql tome 4 :

/* =========================================================
CITURBAREA — TOME 4 v1.2 (BLOC 1bis)
Interfaces TypeScript (Domain)
Couvre : Consent/PMI, Entity, Data Products, BIM Clash
========================================================= */

export type ConsentMode = "ESSENTIAL_ONLY" | "ANONYMIZED_PMI" | "OFF";
export type PmiEventType =
  | "PAGE_VIEW"
  | "PACK_VIEW"
  | "SEARCH"
  | "CTA_CLICK"
  | "DOWNLOAD_ATTEMPT"
  | "FORM_START"
  | "FORM_ABORT"
  | "FORM_SUBMIT";

export type EntityStatus =
  | "UNVERIFIED"
  | "ENTITY_OBSERVED"
  | "PROJECT_LINKED"
  | "VERIFIED"
  | "ENTITY_REDACTED";

export type EntityCategory =
  | "CONTRACTOR"
  | "SUPPLIER"
  | "BET"
  | "TOPO"
  | "LABOR"
  | "DECOR"
  | "DEVELOPER"
  | "OTHER";

export type DataProductType =
  | "REGDOC"
  | "LANDPRICE"
  | "COSTINDEX"
  | "PROJECTPATTERN"
  | "ENTITYMAP"
  | "ENVCLIMATE"
  | "BIMINSIGHT";

export type DataVisibility = "INTERNAL" | "PACK_ONLY" | "OWNER_ONLY";

export interface VisitorConsent {
  consentToken: string;
  mode: ConsentMode;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
}

export interface PmiEvent {
  sessionId: string; // uuid
  consentToken?: string | null;
  eventType: PmiEventType;
  contentId?: string | null;
  referrerDomain?: string | null;
  geoRegionId?: string | null;
  geoProvinceId?: string | null;
  confidenceScore: number; // 0..100
  riskFlags: string[];
  createdAt: string;
}

export interface Entity {
  id: string;
  entityName: string;
  category: EntityCategory;
  status: EntityStatus;
  geoRegionId?: string | null;
  geoProvinceId?: string | null;
  publicUrls: string[];
  notesInternal?: string | null;
  confidenceScore: number; // 0..100
  isRedacted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DataSource {
  id: string;
  sourceType: "UPLOAD" | "PUBLIC_DOC" | "API" | "OP_SEEDED" | "EMAIL" | "SCRAPE_PASSIVE";
  sourceName?: string | null;
  sourceUrl?: string | null;
  capturedAt?: string | null;
  geoRegionId?: string | null;
  geoProvinceId?: string | null;
  geoCommuneId?: string | null;
  rawHash?: string | null;
  confidenceScore: number;
  createdAt: string;
}

export interface DataProduct {
  id: string;
  productType: DataProductType;
  geoRegionId?: string | null;
  geoProvinceId?: string | null;
  geoCommuneId?: string | null;
  currentVersionId?: string | null;
  visibility: DataVisibility;
  exportable: boolean;
  commercializable: boolean; // usage "context-only" appliqué par règles
  createdAt: string;
  updatedAt: string;
}

export interface DataProductVersion<TPayload = unknown> {
  id: string;
  productId: string;
  version: string; // semver
  sourceBundle: string[]; // data_sources ids
  confidenceScore: number;
  restrictions: Record<string, unknown>; // {context_only:true, pack_only:true}
  payload: TPayload;
  status: "ACTIVE" | "DEPRECATED" | "REVOKED";
  payloadHash: string;
  createdAt: string;
}

export type BimSeverity = "MINOR" | "MAJOR" | "BLOCKER";

export interface BimModel {
  id: string;
  projectRef: string;
  geoCommuneId?: string | null;
  version: number;
  ifcStandard: "IFC2X3" | "IFC4" | "UNKNOWN";
  ifcHash: string;
  storageUri: string;
  status: "ACTIVE" | "SUPERSEDED" | "REVOKED";
  createdAt: string;
}

export interface BimClash {
  id: string;
  reportId: string;
  elementA: string;
  elementB: string;
  ruleId?: string | null;
  severity: BimSeverity;
  details: Record<string, unknown>;
  createdAt: string;
}
```



---

## SOURCE — Bloc 1-3 = arborescence + Prisma schema unifié (DB canonique).txt

```text
Parfait. Je te livre SQUELETTE NESTJS + PRISMA UNIFIÉ aligné Tome 1→4, en 3 blocs.

Bloc 1/3 = arborescence + Prisma schema unifié (DB canonique)

Bloc 2/3 = modules NestJS (Probative, State, Billing, Files, Geo, DataLake/Products)

Bloc 3/3 = Matching + Quotas + Webhook paiement + exemples endpoints + conventions

✅ BLOC 1/3 — ARBORESCENCE + PRISMA UNIFIÉ (CANONIQUE)
1) Arborescence (monorepo simple)
citurbarea/
  apps/
    api/
      src/
        main.ts
        app.module.ts
        config/
          env.ts
        common/
          errors.ts
          guards/
            rbac.guard.ts
          utils/
            crypto.ts
            daykey.ts
        modules/
          auth/
          users/
          probative/
          state/
          billing/
          files/
          geo/
          projects/
          proofs/
          cycles/
          freezes/
          data-lake/
          data-products/
          entities/
          pmi/
          costs/
          matching/
          usage/
      prisma/
        schema.prisma
      package.json
      tsconfig.json
  package.json

2) schema.prisma — UNIFIÉ (Tome 4 complet)

Notes:

Tout est append-only là où probatoire (logs, transitions, PV).

geoId est obligatoire dès qu’on peut (ossature 12/75/1500+).

Entitlements = activation payée (upgrade-only).

PMI = anonymisé (minimisation).

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  OWNER
  OP
  AUDITOR
  SUPPORT
}

enum ActorType {
  SYS
  IA
  OP
  CLT
  ENT
}

enum ProjectStatus {
  ACTIVE
  CLOSED
  FROZEN
}

enum FreezeType {
  EC_DOC
  EC_PAY
  EC_DISPUTE
}

enum PaymentStatus {
  INITIATED
  SUCCEEDED
  FAILED
  REFUNDED
}

enum FileStatus {
  ACTIVE
  SUPERSEDED
}

enum EntityStatus {
  UNVERIFIED
  PROJECT_LINKED
  VERIFIED
  ENTITY_OBSERVED
}

enum MatchStatus {
  SUGGESTED
  REQUESTED
  PAID
  APPROVED
  REJECTED
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      UserRole
  status    String   @default("ACTIVE")
  createdAt DateTime @default(now())

  grants    PermissionGrant[]
}

model PermissionGrant {
  id     String @id @default(uuid())
  userId String
  perm   String
  scope  String @default("GLOBAL")

  user   User   @relation(fields: [userId], references: [id])
}

model GeoUnit {
  id        String  @id
  level     String  // REGION/PROVINCE/COMMUNE
  name      String
  parentId  String?
  centroid  Json?
  bbox      Json?
  meta      Json?

  parent    GeoUnit? @relation("GeoParent", fields: [parentId], references: [id])
  children  GeoUnit[] @relation("GeoParent")

  @@index([level])
  @@index([parentId])
}

model Project {
  id          String        @id @default(uuid())
  geoId       String
  door        Int           // 1..6 (attribuée)
  status      ProjectStatus @default(ACTIVE)
  title       String?
  clientRef   String?       // id interne client (si CLT)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  geo         GeoUnit       @relation(fields: [geoId], references: [id])

  state       ProjectState?
  transitions StateTransition[]
  payments    Payment[]
  proofs      Proof[]
  cycles      Cycle[]
  freezes     Freeze[]
  files       FileObject[]
}

model ProjectState {
  id         String   @id @default(uuid())
  projectId  String   @unique
  state      String   // E0..E12, EC_DOC, EC_PAY, EC_DISPUTE
  substate   String?  // E8.2 etc
  data       Json     @default("{}")
  updatedAt  DateTime @updatedAt

  project    Project  @relation(fields: [projectId], references: [id])
}

model StateTransition {
  id         String   @id @default(uuid())
  projectId  String
  fromState  String
  toState    String
  trigger    String   // PAYMENT_OK, DISCLAIMER_ACCEPTED, PMS_OK, IA_FLAG...
  actorType  ActorType
  actorId    String?
  payload    Json     @default("{}")
  ts         DateTime @default(now())

  project    Project  @relation(fields: [projectId], references: [id])

  @@index([projectId, ts])
  @@index([toState])
}

model Payment {
  id          String        @id @default(uuid())
  projectId   String?
  payerType   ActorType
  payerId     String?
  skuCode     String
  amount      Int
  currency    String        @default("MAD")
  status      PaymentStatus @default(INITIATED)
  provider    String        @default("STRIPE")
  providerRef String?       // payment_intent id
  meta        Json          @default("{}")
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  project     Project?      @relation(fields: [projectId], references: [id])

  @@index([projectId])
  @@index([skuCode, status])
}

model Sku {
  id        String  @id @default(uuid())
  code      String  @unique
  name      String
  scopeType String  // PROJECT/GEO/ASSET/TIME
  meta      Json    @default("{}")
  active    Boolean @default(true)
}

model Entitlement {
  id        String   @id @default(uuid())
  skuCode   String
  ownerType ActorType
  ownerId   String
  scopeType String
  scopeId   String?
  validFrom DateTime @default(now())
  validTo   DateTime?
  status    String   @default("ACTIVE")
  createdAt DateTime @default(now())

  @@index([ownerType, ownerId, skuCode])
  @@index([scopeType, scopeId])
}

model Proof {
  id         String   @id @default(uuid())
  projectId  String
  phase      String   // foundation/slab/...
  checklist  Json     @default("{}")
  pmsScore   Int      @default(0)
  verdict    String   @default("PENDING") // OK/REJECTED/PENDING
  meta       Json     @default("{}")
  createdAt  DateTime @default(now())

  project    Project  @relation(fields: [projectId], references: [id])
  files      FileObject[]

  @@index([projectId, createdAt])
}

model Cycle {
  id         String   @id @default(uuid())
  projectId  String
  kind       String   // ADMIN_REMARKS, CORRECTION, ...
  number     Int
  status     String   @default("OPEN") // OPEN/CLOSED
  createdAt  DateTime @default(now())

  project    Project  @relation(fields: [projectId], references: [id])

  @@unique([projectId, kind, number])
}

model Freeze {
  id         String     @id @default(uuid())
  projectId  String
  type       FreezeType
  reason     String
  status     String     @default("ACTIVE") // ACTIVE/RESOLVED
  createdAt  DateTime   @default(now())
  resolvedAt DateTime?

  project    Project    @relation(fields: [projectId], references: [id])

  @@index([projectId, type, status])
}

model FileObject {
  id        String     @id @default(uuid())
  bucketKey String
  sha256    String
  size      Int
  mime      String
  version   Int        @default(1)
  ownerType String     // PROJECT/PROOF/GEODOC/ENTITY/COST/...
  ownerId   String
  status    FileStatus @default(ACTIVE)
  createdAt DateTime   @default(now())

  // relations optional by polymorphic owner
  proofId   String?
  projectId String?

  proof     Proof?     @relation(fields: [proofId], references: [id])
  project   Project?   @relation(fields: [projectId], references: [id])

  @@index([ownerType, ownerId])
  @@unique([bucketKey, version])
}

model logs_probatoires {
  id         String   @id @default(uuid())
  ts         DateTime @default(now())
  actor_type ActorType
  actor_id   String?
  event_type String
  project_id String?
  payload    Json     @default("{}")
  prev_hash  String?
  hash       String

  @@index([project_id, ts])
}

model DataLakeItem {
  id         String   @id @default(uuid())
  domain     String   // LAND_PRICE / MATERIAL_PRICE / SALES_REF / ...
  geoId      String?
  raw        Json
  sourceType String   // SEED / PROJECT / OBSERVED
  confidence Int      @default(50)
  createdBy  String
  createdAt  DateTime @default(now())

  @@index([domain])
  @@index([geoId])
}

model DataProduct {
  id          String   @id @default(uuid())
  productType String   // LAND_PRICE_INDEX / MATERIAL_BASKET / ...
  geoId       String?
  version     Int      @default(1)
  payload     Json
  createdAt   DateTime @default(now())

  @@index([productType, geoId])
}

model Entity {
  id        String       @id @default(uuid())
  kind      String       // COMPANY/SUPPLIER/BET/ARTISAN
  name      String
  geoId     String?
  status    EntityStatus @default(UNVERIFIED)
  meta      Json         @default("{}")
  createdAt DateTime     @default(now())

  @@index([status])
  @@index([geoId])
}

model EntityObservation {
  id         String   @id @default(uuid())
  entityId   String?
  fingerprint String  // hash anonymisé (PMI)
  signals    Json     @default("{}")
  createdAt  DateTime @default(now())

  @@index([fingerprint])
}

model LandAsset {
  id        String   @id @default(uuid())
  geoId     String
  ownerType String   // LANDOWNER/BROKER/ENTITY
  ownerRef  String
  surface   Float
  approxLoc Json
  docsRef   Json?
  status    String   @default("UNVERIFIED")
  createdAt DateTime @default(now())

  @@index([geoId])
}

model InvestorProfile {
  id          String   @id @default(uuid())
  geoFocus    Json
  ticketMin   Float
  ticketMax   Float
  riskMode    String
  preferences Json
  status      String   @default("UNVERIFIED")
  createdAt   DateTime @default(now())
}

model MatchSuggestion {
  id          String      @id @default(uuid())
  landId      String
  investorId  String
  score       Int
  reasons     Json        @default("{}")
  status      MatchStatus @default(SUGGESTED)
  createdAt   DateTime    @default(now())

  @@index([status, score])
}

model UsageMeter {
  id        String @id @default(uuid())
  ownerType ActorType
  ownerId   String
  skuCode   String
  scopeId   String?
  day       String // YYYY-MM-DD
  count     Int    @default(0)

  @@unique([ownerType, ownerId, skuCode, scopeId, day])
}

3) Seed minimal (SKUs canonisés)

À mettre via script Prisma seed plus tard :

P1_MIN, P3_MOD_BASE, MATCH_REVIEW, LAND_PRICE_INDEX, MATERIAL_BASKET_INDEX, REACTIVATION_EC, etc.
```



---

## SOURCE — BLOC2-3= NETSJS MODULES COEUR ALIGNE TOME 1 4 MEMO.txt

```text
✅ BLOC 2/3 — NESTJS (MODULES CŒUR) ALIGNÉ TOME 1→4 + MÉMO

Tout le code ci-dessous est synchronisé avec le schema.prisma du Bloc 1.
Règles clés respectées : State Machine d’abord, zéro logique métier front, logs probatoires immuables, upgrade-only via entitlements, geo backbone, PMI anonymisé, fallback storage.

A) BOOTSTRAP & CONFIG
apps/api/src/main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}
bootstrap();

apps/api/src/config/env.ts
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  DATABASE_URL: must("DATABASE_URL"),
  PORT: Number(process.env.PORT ?? "3000"),

  // S3 primary
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_REGION: process.env.S3_REGION ?? "eu-west-1",
  S3_BUCKET: must("S3_BUCKET"),
  S3_ACCESS_KEY: must("S3_ACCESS_KEY"),
  S3_SECRET_KEY: must("S3_SECRET_KEY"),

  // Fallback storage sync handled outside (cron/rsync) but keys exist
  FALLBACK_STORAGE_ENABLED: (process.env.FALLBACK_STORAGE_ENABLED ?? "true") === "true",

  // Stripe
  STRIPE_SECRET_KEY: must("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: must("STRIPE_WEBHOOK_SECRET"),

  // Security
  PROBATIVE_HASH_SECRET: must("PROBATIVE_HASH_SECRET"),
};

function must(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var: ${k}`);
  return v;
}

B) COMMON (ERRORS / CRYPTO / RBAC)
apps/api/src/common/errors.ts
import { HttpException, HttpStatus } from "@nestjs/common";

export class DomainError extends HttpException {
  constructor(message: string, status = HttpStatus.BAD_REQUEST) {
    super({ error: message }, status);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Forbidden") {
    super(message, HttpStatus.FORBIDDEN);
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "Not found") {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class ConflictError extends DomainError {
  constructor(message = "Conflict") {
    super(message, HttpStatus.CONFLICT);
  }
}

apps/api/src/common/utils/crypto.ts
import crypto from "crypto";
import { env } from "../../config/env";

export function sha256Hex(buf: Buffer | string) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function hmacProbative(input: string) {
  return crypto.createHmac("sha256", env.PROBATIVE_HASH_SECRET).update(input).digest("hex");
}

export function stableJson(obj: any) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

apps/api/src/common/guards/rbac.guard.ts
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ForbiddenError } from "../errors";

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private requiredPerms: string[] = []) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { role?: string; perms?: string[] } | undefined;

    if (!user) throw new ForbiddenError("No user session");
    if (user.role === "OWNER") return true;

    const perms = new Set(user.perms ?? []);
    for (const p of this.requiredPerms) if (!perms.has(p)) throw new ForbiddenError(`Missing perm: ${p}`);
    return true;
  }
}

C) PRISMA PROVIDER
apps/api/src/prisma.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

D) PROBATIVE MODULE (append-only hash chain)
apps/api/src/modules/probative/probative.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeService } from "./probative.service";

@Module({
  providers: [PrismaService, ProbativeService],
  exports: [ProbativeService],
})
export class ProbativeModule {}

apps/api/src/modules/probative/probative.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { hmacProbative, stableJson } from "../../common/utils/crypto";
import { ActorType } from "@prisma/client";

type LogEvent = {
  actor_type: ActorType;
  actor_id?: string | null;
  event_type: string;
  project_id?: string | null;
  payload?: any;
};

@Injectable()
export class ProbativeService {
  constructor(private prisma: PrismaService) {}

  /**
   * Append-only probative log with hash chaining.
   * Rule: no delete, no update; only append.
   */
  async append(evt: LogEvent) {
    const prev = await this.prisma.logs_probatoires.findFirst({
      where: evt.project_id ? { project_id: evt.project_id } : undefined,
      orderBy: { ts: "desc" },
    });

    const ts = new Date();
    const payload = evt.payload ?? {};
    const material = stableJson({
      ts: ts.toISOString(),
      actor_type: evt.actor_type,
      actor_id: evt.actor_id ?? null,
      event_type: evt.event_type,
      project_id: evt.project_id ?? null,
      payload,
      prev_hash: prev?.hash ?? null,
    });

    const hash = hmacProbative(material);

    return this.prisma.logs_probatoires.create({
      data: {
        ts,
        actor_type: evt.actor_type,
        actor_id: evt.actor_id ?? null,
        event_type: evt.event_type,
        project_id: evt.project_id ?? null,
        payload,
        prev_hash: prev?.hash ?? null,
        hash,
      },
    });
  }
}

E) STATE MODULE (Tome 3 = moteur d’exécution)
apps/api/src/modules/state/state.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeModule } from "../probative/probative.module";
import { StateService } from "./state.service";
import { StateController } from "./state.controller";

@Module({
  imports: [ProbativeModule],
  providers: [PrismaService, StateService],
  controllers: [StateController],
  exports: [StateService],
})
export class StateModule {}

apps/api/src/modules/state/state.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors";
import { ProbativeService } from "../probative/probative.service";
import { ActorType, FreezeType } from "@prisma/client";

/**
 * Canon states: E0..E12 + EC_DOC/EC_PAY/EC_DISPUTE
 * Tome 3 rule: no jump, no undefined transition.
 *
 * NOTE: transitions are "policy-defined" here (tech layer),
 * but MUST map strictly to Tome 3. Keep this file as "single source"
 * for allowed transitions + triggers.
 */
const ALLOWED: Record<string, Record<string, string[]>> = {
  // from -> to -> triggers
  E0: { E1: ["VISIT"], E2: ["QUALIFY"] },
  E1: { E2: ["QUALIFY"] },
  E2: { E2b: ["NEEDS_URBAN_CHECK"], E3: ["QUAL_OK"] },
  E2b: { E3: ["URBAN_OK"] },
  E3: { E4: ["DOCS_OK"], EC_DOC: ["DOCS_MISSING"] },
  E4: { E5: ["PACK_SELECTED"] },
  E5: { E6: ["DISCLAIMERS_ACCEPTED"] },
  E6: { E7: ["PAYMENT_OK"], EC_PAY: ["PAYMENT_FAILED"] },
  E7: { E8: ["START_PRODUCTION"] },
  E8: { E9: ["NEEDS_AUTH"], E10: ["NEEDS_EXEC"], E11: ["READY_VALIDATE"], E12: ["CLOSE"] },
  E9: { E8: ["CYCLE_REMARKS"], E10: ["AUTH_OK"], EC_DISPUTE: ["SCOPE_DERIVE"] },
  E10:{ E11: ["PMS_OK"], EC_DISPUTE: ["BYPASS_ATTEMPT"] },
  E11:{ E12: ["PHASE_VALIDATED"] },
  EC_DOC: { E3: ["DOCS_FIXED"] },
  EC_PAY: { E6: ["PAYMENT_RETRY"] },
  EC_DISPUTE: { E7: ["REACTIVATION_PAID_AND_APPROVED"] }, // via paid procedure only
};

@Injectable()
export class StateService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async getState(projectId: string) {
    const st = await this.prisma.projectState.findUnique({ where: { projectId } });
    if (!st) throw new NotFoundError("Project state not found");
    return st;
  }

  async ensureNotFrozen(projectId: string) {
    const activeFreeze = await this.prisma.freeze.findFirst({
      where: { projectId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (activeFreeze) throw new ForbiddenError(`Project frozen: ${activeFreeze.type}`);
  }

  async transition(params: {
    projectId: string;
    toState: string;
    trigger: string;
    actorType: ActorType;
    actorId?: string | null;
    payload?: any;
  }) {
    const { projectId, toState, trigger, actorType, actorId, payload } = params;

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError("Project not found");

    const current = await this.getState(projectId);

    // Freeze rule (except if moving within EC resolution path)
    if (!current.state.startsWith("EC_")) {
      await this.ensureNotFrozen(projectId);
    }

    const allowedTo = ALLOWED[current.state]?.[toState];
    if (!allowedTo || !allowedTo.includes(trigger)) {
      throw new ConflictError(`Transition not allowed: ${current.state} -> ${toState} via ${trigger}`);
    }

    // Transaction + append-only logs
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.projectState.update({
        where: { projectId },
        data: { state: toState, substate: null, data: payload ?? {} },
      });

      await tx.stateTransition.create({
        data: {
          projectId,
          fromState: current.state,
          toState,
          trigger,
          actorType,
          actorId: actorId ?? null,
          payload: payload ?? {},
        },
      });

      await this.prob.append({
        actor_type: actorType,
        actor_id: actorId ?? null,
        event_type: "STATE_TRANSITION",
        project_id: projectId,
        payload: { from: current.state, to: toState, trigger, data: payload ?? {} },
      });

      // Auto freeze creation for EC states
      if (toState === "EC_DOC") {
        await tx.freeze.create({
          data: { projectId, type: FreezeType.EC_DOC, reason: "Docs missing", status: "ACTIVE" },
        });
      }
      if (toState === "EC_PAY") {
        await tx.freeze.create({
          data: { projectId, type: FreezeType.EC_PAY, reason: "Payment failed", status: "ACTIVE" },
        });
      }
      if (toState === "EC_DISPUTE") {
        await tx.freeze.create({
          data: { projectId, type: FreezeType.EC_DISPUTE, reason: "Dispute/bypass", status: "ACTIVE" },
        });
      }

      return updated;
    });
  }

  async resolveFreeze(projectId: string, type: FreezeType, actorType: ActorType, actorId?: string | null) {
    const f = await this.prisma.freeze.findFirst({
      where: { projectId, type, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (!f) return;

    await this.prisma.freeze.update({
      where: { id: f.id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });

    await this.prob.append({
      actor_type: actorType,
      actor_id: actorId ?? null,
      event_type: "FREEZE_RESOLVED",
      project_id: projectId,
      payload: { type },
    });
  }
}

apps/api/src/modules/state/state.controller.ts
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { StateService } from "./state.service";
import { ActorType } from "@prisma/client";

@Controller("state")
export class StateController {
  constructor(private state: StateService) {}

  @Get(":projectId")
  get(@Param("projectId") projectId: string) {
    return this.state.getState(projectId);
  }

  @Post(":projectId/transition")
  transition(
    @Param("projectId") projectId: string,
    @Body() body: { toState: string; trigger: string; actorType?: ActorType; actorId?: string; payload?: any },
  ) {
    return this.state.transition({
      projectId,
      toState: body.toState,
      trigger: body.trigger,
      actorType: body.actorType ?? ActorType.SYS,
      actorId: body.actorId ?? null,
      payload: body.payload ?? {},
    });
  }
}

F) BILLING MODULE (paiement = état + entitlements)
apps/api/src/modules/billing/billing.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeModule } from "../probative/probative.module";
import { StateModule } from "../state/state.module";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { UsageModule } from "../usage/usage.module";

@Module({
  imports: [ProbativeModule, StateModule, UsageModule],
  providers: [PrismaService, BillingService],
  controllers: [BillingController],
  exports: [BillingService],
})
export class BillingModule {}

apps/api/src/modules/billing/billing.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeService } from "../probative/probative.service";
import { StateService } from "../state/state.service";
import { ActorType, PaymentStatus } from "@prisma/client";
import { ConflictError } from "../../common/errors";

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private prob: ProbativeService,
    private state: StateService,
  ) {}

  /**
   * Record provider webhook result then transition state if needed.
   * Rule: backend truth only.
   */
  async handlePaymentSucceeded(input: {
    providerRef: string;
    skuCode: string;
    amount: number;
    currency: string;
    projectId?: string | null;
    payerType: ActorType;
    payerId?: string | null;
    meta?: any;
  }) {
    const existing = await this.prisma.payment.findFirst({ where: { providerRef: input.providerRef } });
    if (existing?.status === PaymentStatus.SUCCEEDED) return existing;

    const payment = await this.prisma.payment.upsert({
      where: { id: existing?.id ?? "___NO___" },
      create: {
        providerRef: input.providerRef,
        skuCode: input.skuCode,
        amount: input.amount,
        currency: input.currency,
        status: PaymentStatus.SUCCEEDED,
        provider: "STRIPE",
        projectId: input.projectId ?? null,
        payerType: input.payerType,
        payerId: input.payerId ?? null,
        meta: input.meta ?? {},
      },
      update: {
        status: PaymentStatus.SUCCEEDED,
        meta: input.meta ?? {},
      },
    });

    // Entitlement always created (upgrade-only)
    await this.prisma.entitlement.create({
      data: {
        skuCode: input.skuCode,
        ownerType: input.payerType,
        ownerId: input.payerId ?? "ANON",
        scopeType: input.projectId ? "PROJECT" : "GLOBAL",
        scopeId: input.projectId ?? null,
        status: "ACTIVE",
      },
    });

    await this.prob.append({
      actor_type: ActorType.SYS,
      actor_id: null,
      event_type: "PAYMENT_SUCCEEDED",
      project_id: input.projectId ?? null,
      payload: { sku: input.skuCode, amount: input.amount, currency: input.currency, providerRef: input.providerRef },
    });

    // If projectId exists and project is in E6 -> go E7 by trigger PAYMENT_OK
    if (input.projectId) {
      const st = await this.state.getState(input.projectId);
      if (st.state === "E6") {
        await this.state.transition({
          projectId: input.projectId,
          toState: "E7",
          trigger: "PAYMENT_OK",
          actorType: ActorType.SYS,
          actorId: null,
          payload: { skuCode: input.skuCode, providerRef: input.providerRef },
        });
        await this.state.resolveFreeze(input.projectId, "EC_PAY" as any, ActorType.SYS, null);
      }
    }

    return payment;
  }

  async handlePaymentFailed(input: { providerRef: string; projectId?: string | null; reason?: string }) {
    const payment = await this.prisma.payment.findFirst({ where: { providerRef: input.providerRef } });
    if (!payment) throw new ConflictError("Unknown payment");

    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } });

    await this.prob.append({
      actor_type: ActorType.SYS,
      actor_id: null,
      event_type: "PAYMENT_FAILED",
      project_id: input.projectId ?? payment.projectId ?? null,
      payload: { providerRef: input.providerRef, reason: input.reason ?? "unknown" },
    });

    if (payment.projectId) {
      const st = await this.state.getState(payment.projectId);
      if (st.state === "E6") {
        await this.state.transition({
          projectId: payment.projectId,
          toState: "EC_PAY",
          trigger: "PAYMENT_FAILED",
          actorType: ActorType.SYS,
          actorId: null,
          payload: { providerRef: input.providerRef },
        });
      }
    }
  }
}

apps/api/src/modules/billing/billing.controller.ts
import { Body, Controller, Headers, Post, Req } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { env } from "../../config/env";
import Stripe from "stripe";
import { ActorType } from "@prisma/client";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as any });

@Controller("billing")
export class BillingController {
  constructor(private billing: BillingService) {}

  /**
   * Stripe webhook endpoint.
   * IMPORTANT: raw body must be enabled in Nest adapter if needed.
   * For brevity, assume req.rawBody exists (set in main.ts with body parser config in production).
   */
  @Post("webhook")
  async webhook(@Req() req: any, @Headers("stripe-signature") sig: string) {
    const event = stripe.webhooks.constructEvent(req.rawBody, sig, env.STRIPE_WEBHOOK_SECRET);

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as any;
      // metadata must carry skuCode + projectId + payerType + payerId
      return this.billing.handlePaymentSucceeded({
        providerRef: pi.id,
        skuCode: pi.metadata?.skuCode ?? "UNKNOWN",
        amount: pi.amount_received,
        currency: pi.currency?.toUpperCase() ?? "MAD",
        projectId: pi.metadata?.projectId ?? null,
        payerType: (pi.metadata?.payerType as ActorType) ?? ActorType.CLT,
        payerId: pi.metadata?.payerId ?? null,
        meta: { stripe: { id: pi.id } },
      });
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as any;
      await this.billing.handlePaymentFailed({
        providerRef: pi.id,
        projectId: pi.metadata?.projectId ?? null,
        reason: pi.last_payment_error?.message,
      });
      return { ok: true };
    }

    return { ok: true };
  }
}

G) FILES MODULE (S3 + hash + versioning)
apps/api/src/modules/files/files.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeModule } from "../probative/probative.module";
import { FilesService } from "./files.service";
import { FilesController } from "./files.controller";

@Module({
  imports: [ProbativeModule],
  providers: [PrismaService, FilesService],
  controllers: [FilesController],
  exports: [FilesService],
})
export class FilesModule {}

apps/api/src/modules/files/files.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeService } from "../probative/probative.service";
import { sha256Hex } from "../../common/utils/crypto";
import { env } from "../../config/env";
import { ActorType, FileStatus } from "@prisma/client";
import { ConflictError } from "../../common/errors";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
  forcePathStyle: true,
});

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async upload(params: {
    ownerType: string;
    ownerId: string;
    projectId?: string | null;
    proofId?: string | null;
    mime: string;
    data: Buffer;
    actorType: ActorType;
    actorId?: string | null;
  }) {
    const sha256 = sha256Hex(params.data);
    const baseKey = `${params.ownerType}/${params.ownerId}/${sha256}`;

    // versioning per bucketKey
    const last = await this.prisma.fileObject.findFirst({
      where: { bucketKey: baseKey },
      orderBy: { version: "desc" },
    });
    const version = (last?.version ?? 0) + 1;

    const key = `${baseKey}/v${version}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: params.data,
        ContentType: params.mime,
      }),
    );

    const file = await this.prisma.fileObject.create({
      data: {
        bucketKey: baseKey,
        sha256,
        size: params.data.length,
        mime: params.mime,
        version,
        ownerType: params.ownerType,
        ownerId: params.ownerId,
        status: FileStatus.ACTIVE,
        projectId: params.projectId ?? null,
        proofId: params.proofId ?? null,
      },
    });

    await this.prob.append({
      actor_type: params.actorType,
      actor_id: params.actorId ?? null,
      event_type: "FILE_UPLOADED",
      project_id: params.projectId ?? null,
      payload: { fileId: file.id, ownerType: params.ownerType, ownerId: params.ownerId, sha256, version },
    });

    return { fileId: file.id, bucketKey: key, sha256, version };
  }

  async supersede(fileId: string, actorType: ActorType, actorId?: string | null) {
    const file = await this.prisma.fileObject.findUnique({ where: { id: fileId } });
    if (!file) throw new ConflictError("File not found");
    if (file.status === FileStatus.SUPERSEDED) return file;

    const updated = await this.prisma.fileObject.update({
      where: { id: fileId },
      data: { status: FileStatus.SUPERSEDED },
    });

    await this.prob.append({
      actor_type: actorType,
      actor_id: actorId ?? null,
      event_type: "FILE_SUPERSEDED",
      project_id: file.projectId ?? null,
      payload: { fileId },
    });

    return updated;
  }
}

apps/api/src/modules/files/files.controller.ts
import { Body, Controller, Post } from "@nestjs/common";
import { FilesService } from "./files.service";
import { ActorType } from "@prisma/client";

@Controller("files")
export class FilesController {
  constructor(private files: FilesService) {}

  // For production: use multipart; here simplified (base64 payload).
  @Post("upload")
  async upload(@Body() body: any) {
    const buf = Buffer.from(body.base64, "base64");
    return this.files.upload({
      ownerType: body.ownerType,
      ownerId: body.ownerId,
      projectId: body.projectId ?? null,
      proofId: body.proofId ?? null,
      mime: body.mime ?? "application/octet-stream",
      data: buf,
      actorType: (body.actorType as ActorType) ?? ActorType.CLT,
      actorId: body.actorId ?? null,
    });
  }
}

H) GEO MODULE (ossature 12/75/1500+ obligatoire)
apps/api/src/modules/geo/geo.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { GeoService } from "./geo.service";
import { GeoController } from "./geo.controller";

@Module({
  providers: [PrismaService, GeoService],
  controllers: [GeoController],
  exports: [GeoService],
})
export class GeoModule {}

apps/api/src/modules/geo/geo.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { NotFoundError } from "../../common/errors";

@Injectable()
export class GeoService {
  constructor(private prisma: PrismaService) {}

  async get(id: string) {
    const g = await this.prisma.geoUnit.findUnique({ where: { id } });
    if (!g) throw new NotFoundError("Geo unit not found");
    return g;
  }

  async children(id: string) {
    return this.prisma.geoUnit.findMany({ where: { parentId: id } });
  }
}

apps/api/src/modules/geo/geo.controller.ts
import { Controller, Get, Param } from "@nestjs/common";
import { GeoService } from "./geo.service";

@Controller("geo")
export class GeoController {
  constructor(private geo: GeoService) {}

  @Get(":id") get(@Param("id") id: string) {
    return this.geo.get(id);
  }

  @Get(":id/children") children(@Param("id") id: string) {
    return this.geo.children(id);
  }
}

I) PROJECTS MODULE (création = E0→E7 piloté)
apps/api/src/modules/projects/projects.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeModule } from "../probative/probative.module";
import { ProjectsService } from "./projects.service";
import { ProjectsController } from "./projects.controller";

@Module({
  imports: [ProbativeModule],
  providers: [PrismaService, ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}

apps/api/src/modules/projects/projects.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeService } from "../probative/probative.service";
import { ActorType } from "@prisma/client";

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async create(input: { geoId: string; door: number; title?: string | null; clientRef?: string | null }) {
    const p = await this.prisma.project.create({
      data: {
        geoId: input.geoId,
        door: input.door,
        title: input.title ?? null,
        clientRef: input.clientRef ?? null,
        state: { create: { state: "E0", substate: null, data: {} } },
      },
      include: { state: true },
    });

    await this.prob.append({
      actor_type: ActorType.SYS,
      actor_id: null,
      event_type: "PROJECT_CREATED",
      project_id: p.id,
      payload: { geoId: p.geoId, door: p.door },
    });

    return p;
  }
}

apps/api/src/modules/projects/projects.controller.ts
import { Body, Controller, Post } from "@nestjs/common";
import { ProjectsService } from "./projects.service";

@Controller("projects")
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @Post()
  create(@Body() b: any) {
    return this.projects.create({
      geoId: b.geoId,
      door: Number(b.door),
      title: b.title ?? null,
      clientRef: b.clientRef ?? null,
    });
  }
}

J) DATA LAKE + DATA PRODUCTS (memo Data Flywheel + seeding souverain)
apps/api/src/modules/data-lake/data-lake.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeModule } from "../probative/probative.module";
import { DataLakeService } from "./data-lake.service";
import { DataLakeController } from "./data-lake.controller";

@Module({
  imports: [ProbativeModule],
  providers: [PrismaService, DataLakeService],
  controllers: [DataLakeController],
  exports: [DataLakeService],
})
export class DataLakeModule {}

apps/api/src/modules/data-lake/data-lake.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeService } from "../probative/probative.service";
import { ActorType } from "@prisma/client";

@Injectable()
export class DataLakeService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  /**
   * Seeding proactif (OWNER/OP) ou ingestion projet.
   * Rule: never deliver raw; raw is internal asset.
   */
  async ingest(input: {
    domain: string;
    geoId?: string | null;
    raw: any;
    sourceType: "SEED" | "PROJECT" | "OBSERVED";
    confidence?: number;
    createdBy: string; // userId or system
    actorType: ActorType;
    actorId?: string | null;
  }) {
    const item = await this.prisma.dataLakeItem.create({
      data: {
        domain: input.domain,
        geoId: input.geoId ?? null,
        raw: input.raw,
        sourceType: input.sourceType,
        confidence: input.confidence ?? 50,
        createdBy: input.createdBy,
      },
    });

    await this.prob.append({
      actor_type: input.actorType,
      actor_id: input.actorId ?? null,
      event_type: "DATALAKE_INGEST",
      project_id: null,
      payload: { id: item.id, domain: item.domain, geoId: item.geoId, sourceType: item.sourceType, confidence: item.confidence },
    });

    return item;
  }
}

apps/api/src/modules/data-lake/data-lake.controller.ts
import { Body, Controller, Post } from "@nestjs/common";
import { DataLakeService } from "./data-lake.service";
import { ActorType } from "@prisma/client";

@Controller("data-lake")
export class DataLakeController {
  constructor(private lake: DataLakeService) {}

  @Post("ingest")
  ingest(@Body() b: any) {
    return this.lake.ingest({
      domain: b.domain,
      geoId: b.geoId ?? null,
      raw: b.raw ?? {},
      sourceType: b.sourceType ?? "SEED",
      confidence: b.confidence ?? 50,
      createdBy: b.createdBy ?? "SYSTEM",
      actorType: (b.actorType as ActorType) ?? ActorType.OP,
      actorId: b.actorId ?? null,
    });
  }
}

apps/api/src/modules/data-products/data-products.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { DataProductsService } from "./data-products.service";
import { DataProductsController } from "./data-products.controller";
import { ProbativeModule } from "../probative/probative.module";

@Module({
  imports: [ProbativeModule],
  providers: [PrismaService, DataProductsService],
  controllers: [DataProductsController],
  exports: [DataProductsService],
})
export class DataProductsModule {}

apps/api/src/modules/data-products/data-products.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeService } from "../probative/probative.service";
import { ActorType } from "@prisma/client";

/**
 * Data Product = aggregated module output.
 * Rule: never raw export.
 */
@Injectable()
export class DataProductsService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async publish(input: {
    productType: string;
    geoId?: string | null;
    payload: any;
    actorType: ActorType;
    actorId?: string | null;
  }) {
    const last = await this.prisma.dataProduct.findFirst({
      where: { productType: input.productType, geoId: input.geoId ?? null },
      orderBy: { version: "desc" },
    });

    const version = (last?.version ?? 0) + 1;

    const prod = await this.prisma.dataProduct.create({
      data: { productType: input.productType, geoId: input.geoId ?? null, version, payload: input.payload },
    });

    await this.prob.append({
      actor_type: input.actorType,
      actor_id: input.actorId ?? null,
      event_type: "DATA_PRODUCT_PUBLISHED",
      project_id: null,
      payload: { productType: prod.productType, geoId: prod.geoId, version: prod.version },
    });

    return prod;
  }
}

apps/api/src/modules/data-products/data-products.controller.ts
import { Body, Controller, Post } from "@nestjs/common";
import { DataProductsService } from "./data-products.service";
import { ActorType } from "@prisma/client";

@Controller("data-products")
export class DataProductsController {
  constructor(private products: DataProductsService) {}

  @Post("publish")
  publish(@Body() b: any) {
    return this.products.publish({
      productType: b.productType,
      geoId: b.geoId ?? null,
      payload: b.payload ?? {},
      actorType: (b.actorType as ActorType) ?? ActorType.OP,
      actorId: b.actorId ?? null,
    });
  }
}

K) ENTITIES + PMI (anonymisé + statuts)
apps/api/src/modules/entities/entities.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeModule } from "../probative/probative.module";
import { EntitiesService } from "./entities.service";
import { EntitiesController } from "./entities.controller";

@Module({
  imports: [ProbativeModule],
  providers: [PrismaService, EntitiesService],
  controllers: [EntitiesController],
  exports: [EntitiesService],
})
export class EntitiesModule {}

apps/api/src/modules/entities/entities.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeService } from "../probative/probative.service";
import { ActorType, EntityStatus } from "@prisma/client";

@Injectable()
export class EntitiesService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async upsertEntity(input: {
    kind: string;
    name: string;
    geoId?: string | null;
    status?: EntityStatus;
    meta?: any;
    actorType: ActorType;
    actorId?: string | null;
  }) {
    const e = await this.prisma.entity.create({
      data: {
        kind: input.kind,
        name: input.name,
        geoId: input.geoId ?? null,
        status: input.status ?? EntityStatus.UNVERIFIED,
        meta: input.meta ?? {},
      },
    });

    await this.prob.append({
      actor_type: input.actorType,
      actor_id: input.actorId ?? null,
      event_type: "ENTITY_CREATED",
      project_id: null,
      payload: { id: e.id, status: e.status, kind: e.kind, geoId: e.geoId },
    });

    return e;
  }
}

apps/api/src/modules/entities/entities.controller.ts
import { Body, Controller, Post } from "@nestjs/common";
import { EntitiesService } from "./entities.service";
import { ActorType, EntityStatus } from "@prisma/client";

@Controller("entities")
export class EntitiesController {
  constructor(private entities: EntitiesService) {}

  @Post()
  create(@Body() b: any) {
    return this.entities.upsertEntity({
      kind: b.kind,
      name: b.name,
      geoId: b.geoId ?? null,
      status: (b.status as EntityStatus) ?? EntityStatus.UNVERIFIED,
      meta: b.meta ?? {},
      actorType: (b.actorType as ActorType) ?? ActorType.OP,
      actorId: b.actorId ?? null,
    });
  }
}

apps/api/src/modules/pmi/pmi.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeModule } from "../probative/probative.module";
import { PmiService } from "./pmi.service";
import { PmiController } from "./pmi.controller";

@Module({
  imports: [ProbativeModule],
  providers: [PrismaService, PmiService],
  controllers: [PmiController],
  exports: [PmiService],
})
export class PmiModule {}

apps/api/src/modules/pmi/pmi.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeService } from "../probative/probative.service";
import { ActorType } from "@prisma/client";
import { sha256Hex } from "../../common/utils/crypto";

/**
 * Passive Market Intelligence:
 * - anonymized fingerprint (no direct PII)
 * - no direct commercial activation
 */
@Injectable()
export class PmiService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async observe(input: {
    anonSeed: string; // e.g. UA+ip salted on edge; never store raw IP
    signals: any;     // pages visited, geo interest, categories
  }) {
    const fingerprint = sha256Hex(input.anonSeed);

    const obs = await this.prisma.entityObservation.create({
      data: { fingerprint, signals: input.signals ?? {} },
    });

    await this.prob.append({
      actor_type: ActorType.SYS,
      actor_id: null,
      event_type: "PMI_OBSERVED",
      project_id: null,
      payload: { fingerprint, obsId: obs.id },
    });

    return { ok: true };
  }
}

apps/api/src/modules/pmi/pmi.controller.ts
import { Body, Controller, Post } from "@nestjs/common";
import { PmiService } from "./pmi.service";

@Controller("pmi")
export class PmiController {
  constructor(private pmi: PmiService) {}

  @Post("observe")
  observe(@Body() b: any) {
    return this.pmi.observe({
      anonSeed: b.anonSeed,
      signals: b.signals ?? {},
    });
  }
}

L) COSTS MODULE (prix matériaux/services → data lake → products)
apps/api/src/modules/costs/costs.module.ts
import { Module } from "@nestjs/common";
import { DataLakeModule } from "../data-lake/data-lake.module";
import { DataProductsModule } from "../data-products/data-products.module";
import { CostsService } from "./costs.service";
import { CostsController } from "./costs.controller";

@Module({
  imports: [DataLakeModule, DataProductsModule],
  providers: [CostsService],
  controllers: [CostsController],
})
export class CostsModule {}

apps/api/src/modules/costs/costs.service.ts
import { Injectable } from "@nestjs/common";
import { DataLakeService } from "../data-lake/data-lake.service";
import { DataProductsService } from "../data-products/data-products.service";
import { ActorType } from "@prisma/client";

/**
 * Cost Intelligence Engine:
 * - ingest raw price signals
 * - publish aggregated baskets (non-contractual, indicative)
 */
@Injectable()
export class CostsService {
  constructor(private lake: DataLakeService, private products: DataProductsService) {}

  async ingestMaterialPrice(b: any) {
    return this.lake.ingest({
      domain: "MATERIAL_PRICE",
      geoId: b.geoId ?? null,
      raw: {
        material: b.material,
        unit: b.unit,
        price: b.price,
        source: b.source,
        ts: new Date().toISOString(),
      },
      sourceType: b.sourceType ?? "SEED",
      confidence: b.confidence ?? 60,
      createdBy: b.createdBy ?? "SYSTEM",
      actorType: (b.actorType as ActorType) ?? ActorType.OP,
      actorId: b.actorId ?? null,
    });
  }

  async publishBasketIndex(b: any) {
    // Example aggregated product. Real aggregation done by job.
    return this.products.publish({
      productType: "MATERIAL_BASKET_INDEX",
      geoId: b.geoId ?? null,
      payload: { basket: b.basket ?? [], note: "Indicatif - non contractuel" },
      actorType: (b.actorType as ActorType) ?? ActorType.OP,
      actorId: b.actorId ?? null,
    });
  }
}

apps/api/src/modules/costs/costs.controller.ts
import { Body, Controller, Post } from "@nestjs/common";
import { CostsService } from "./costs.service";

@Controller("costs")
export class CostsController {
  constructor(private costs: CostsService) {}

  @Post("material/ingest")
  ingest(@Body() b: any) {
    return this.costs.ingestMaterialPrice(b);
  }

  @Post("basket/publish")
  publish(@Body() b: any) {
    return this.costs.publishBasketIndex(b);
  }
}

M) MATCHING MODULE (investor ↔ land) — suggestion → paid review → approval
apps/api/src/modules/matching/matching.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeModule } from "../probative/probative.module";
import { BillingModule } from "../billing/billing.module";
import { MatchingService } from "./matching.service";
import { MatchingController } from "./matching.controller";

@Module({
  imports: [ProbativeModule, BillingModule],
  providers: [PrismaService, MatchingService],
  controllers: [MatchingController],
})
export class MatchingModule {}

apps/api/src/modules/matching/matching.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ProbativeService } from "../probative/probative.service";
import { ActorType, MatchStatus } from "@prisma/client";
import { ForbiddenError } from "../../common/errors";

@Injectable()
export class MatchingService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  /**
   * IA suggests only. No auto-contact. No exposure of precise location.
   */
  async suggest(landId: string, investorId: string, score: number, reasons: any) {
    const m = await this.prisma.matchSuggestion.create({
      data: { landId, investorId, score, reasons, status: MatchStatus.SUGGESTED },
    });

    await this.prob.append({
      actor_type: ActorType.IA,
      actor_id: null,
      event_type: "MATCH_SUGGESTED",
      project_id: null,
      payload: { matchId: m.id, landId, investorId, score },
    });

    return m;
  }

  /**
   * Paid review gate (Upgrade-only).
   * In Bloc 3 we will enforce entitlement check (sku MATCH_REVIEW).
   */
  async requestPaidReview(matchId: string, actorType: ActorType, actorId?: string | null) {
    if (actorType !== ActorType.CLT && actorType !== ActorType.ENT) {
      throw new ForbiddenError("Only client/entity can request review");
    }

    const m = await this.prisma.matchSuggestion.update({
      where: { id: matchId },
      data: { status: MatchStatus.REQUESTED },
    });

    await this.prob.append({
      actor_type: actorType,
      actor_id: actorId ?? null,
      event_type: "MATCH_REVIEW_REQUESTED",
      project_id: null,
      payload: { matchId },
    });

    return m;
  }

  async approve(matchId: string, actorType: ActorType, actorId?: string | null) {
    // Approval only by OP/OWNER
    if (actorType !== ActorType.OP && actorType !== ActorType.SYS) throw new ForbiddenError("Approval restricted");

    const m = await this.prisma.matchSuggestion.update({
      where: { id: matchId },
      data: { status: MatchStatus.APPROVED },
    });

    await this.prob.append({
      actor_type: actorType,
      actor_id: actorId ?? null,
      event_type: "MATCH_APPROVED",
      project_id: null,
      payload: { matchId },
    });

    return m;
  }
}

apps/api/src/modules/matching/matching.controller.ts
import { Body, Controller, Post } from "@nestjs/common";
import { MatchingService } from "./matching.service";
import { ActorType } from "@prisma/client";

@Controller("matching")
export class MatchingController {
  constructor(private matching: MatchingService) {}

  @Post("suggest")
  suggest(@Body() b: any) {
    return this.matching.suggest(b.landId, b.investorId, b.score ?? 50, b.reasons ?? {});
  }

  @Post("request-review")
  request(@Body() b: any) {
    return this.matching.requestPaidReview(b.matchId, (b.actorType as ActorType) ?? ActorType.CLT, b.actorId ?? null);
  }

  @Post("approve")
  approve(@Body() b: any) {
    return this.matching.approve(b.matchId, (b.actorType as ActorType) ?? ActorType.OP, b.actorId ?? null);
  }
}

N) USAGE / QUOTAS (upgrade-only + anti-abuse)
apps/api/src/modules/usage/usage.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { UsageService } from "./usage.service";

@Module({
  providers: [PrismaService, UsageService],
  exports: [UsageService],
})
export class UsageModule {}

apps/api/src/modules/usage/usage.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { ActorType } from "@prisma/client";
import { ConflictError } from "../../common/errors";

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class UsageService {
  constructor(private prisma: PrismaService) {}

  async bump(input: { ownerType: ActorType; ownerId: string; skuCode: string; scopeId?: string | null; maxPerDay: number }) {
    const day = dayKey();
    const key = { ownerType: input.ownerType, ownerId: input.ownerId, skuCode: input.skuCode, scopeId: input.scopeId ?? null, day };

    const row = await this.prisma.usageMeter.upsert({
      where: { ownerType_ownerId_skuCode_scopeId_day: key as any },
      create: { ...key, count: 1 } as any,
      update: { count: { increment: 1 } },
    });

    if (row.count > input.maxPerDay) throw new ConflictError("Daily quota exceeded");
    return row;
  }
}

O) APP MODULE (assemblage)
apps/api/src/app.module.ts
import { Module } from "@nestjs/common";
import { ProbativeModule } from "./modules/probative/probative.module";
import { StateModule } from "./modules/state/state.module";
import { BillingModule } from "./modules/billing/billing.module";
import { FilesModule } from "./modules/files/files.module";
import { GeoModule } from "./modules/geo/geo.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { DataLakeModule } from "./modules/data-lake/data-lake.module";
import { DataProductsModule } from "./modules/data-products/data-products.module";
import { EntitiesModule } from "./modules/entities/entities.module";
import { PmiModule } from "./modules/pmi/pmi.module";
import { CostsModule } from "./modules/costs/costs.module";
import { MatchingModule } from "./modules/matching/matching.module";
import { UsageModule } from "./modules/usage/usage.module";

@Module({
  imports: [
    ProbativeModule,
    UsageModule,
    StateModule,
    BillingModule,
    FilesModule,
    GeoModule,
    ProjectsModule,
    DataLakeModule,
    DataProductsModule,
    EntitiesModule,
    PmiModule,
    CostsModule,
    MatchingModule,
  ],
})
export class AppModule {}

✅ Ce que couvre déjà ce Bloc 2 (sans zone grise)

Tome 3 exécuté via StateService (transitions + triggers + gel EC).

Paiement = état + Entitlements (upgrade-only).

Logs probatoires hash-chain append-only.

Data flywheel (Lake) + Data Products (modules vendables, pas raw).

Geo backbone (12/75/1500+) prêt.

PMI anonymisé (fingerprint hash, pas de PII).

Matching suggestion IA + review payée + approbation humaine.
```



---

## SOURCE — TOME 4 — V1.0 (extension) — BLOC SUIVANT.txt

```text
TOME 4 — V1.0 (extension) — BLOC SUIVANT
A) Offer Catalog (packs) + mapping Features + règles “Upgrade-only”
A1) Doctrine → règle technique

Toute valeur = Offer payée → Entitlements activés

Aucune feature visible/exécutable sans entitlement actif

Le pricing public n’est pas requis : l’offre peut être affichée sans prix, ou prix “indicatif” puis confirmé au checkout.

A2) DB : tables offers + offer_features + pricebooks (optionnel)

Ajoute ceci à schema.prisma :

model Offer {
  code        String @id
  doorId      String
  name        String
  description String
  status      String @default("ACTIVE") // ACTIVE / HIDDEN / RETIRED
  isUpgrade   Boolean @default(true)    // doctrine: tout est upgrade (même ticket d'entrée)
  createdAt   DateTime @default(now())
  features    OfferFeature[]
}

model OfferFeature {
  id          String @id @default(uuid())
  offerCode   String
  featureCode String
  offer       Offer  @relation(fields: [offerCode], references: [code])
}

model Pricebook {
  id        String @id @default(uuid())
  offerCode String
  currency  String @default("MAD")
  amount    Int
  status    String @default("ACTIVE")
  offer     Offer  @relation(fields: [offerCode], references: [code])
}

A3) Seed minimal des offres (exemples canoniques)

P1_MIN (ticket d’entrée) → dossier + plan type + PMS basic

E2B_REPORT → pré-étude urbanistique/foncière

P3_MOD_CORE → PV weekly + PMS basic + paiement par jalons (déclencheurs)

Tout le reste devient simple : tu ajoutes des offers (P4 exposure, BIM IFC, 4D, 5D…) sans toucher aux règles.

A4) API : Offers endpoints (lecture + choix)
// apps/api/src/modules/offers/offers.module.ts
import { Module } from "@nestjs/common";
import { OffersController } from "./offers.controller";
import { OffersService } from "./offers.service";
import { PrismaService } from "../../infra/db/prisma";

@Module({ controllers: [OffersController], providers: [OffersService, PrismaService] })
export class OffersModule {}

// apps/api/src/modules/offers/offers.controller.ts
import { Controller, Get, Param, Query } from "@nestjs/common";
import { OffersService } from "./offers.service";

@Controller("offers")
export class OffersController {
  constructor(private svc: OffersService) {}

  @Get()
  list(@Query("doorId") doorId?: string) {
    return this.svc.list(doorId);
  }

  @Get(":code")
  get(@Param("code") code: string) {
    return this.svc.get(code);
  }
}

// apps/api/src/modules/offers/offers.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infra/db/prisma";

@Injectable()
export class OffersService {
  constructor(private prisma: PrismaService) {}

  list(doorId?: string) {
    return this.prisma.offer.findMany({
      where: { status: "ACTIVE", ...(doorId ? { doorId } : {}) },
      include: { features: true },
      orderBy: { code: "asc" },
    });
  }

  get(code: string) {
    return this.prisma.offer.findUnique({
      where: { code },
      include: { features: true },
    });
  }
}

B) Permissions Engine (L1) — “front = lecteur”, backend = calcul opposable
B1) Doctrine → règle technique

Chaque endpoint vérifie : (state + role + feature entitlements)

Si action interdite → REFUS + log probatoire (EVT_REFUS_FEATURE)

B2) Domain: rôles + matrice permissions
// packages/domain/src/policies/permissions.ts
import { State } from "../state/states";

export type ActorRole = "VST"|"CLT"|"ENT"|"OP"|"BET"|"IA"|"SYS";
export type ActionCode =
  | "READ"
  | "SUBMIT_QUALIFICATION"
  | "UPLOAD_DOC"
  | "ACCEPT_DISCLAIMER"
  | "CREATE_ORDER"
  | "UPLOAD_PROOF"
  | "PUBLISH_DELIVERABLE"
  | "OPEN_CYCLE"
  | "OPEN_FREEZE"
  | "RESOLVE_FREEZE";

type Rule = { state: State; role: ActorRole; actions: ActionCode[] };

export const PERMISSION_MATRIX: Rule[] = [
  { state:"E0", role:"VST", actions:["READ"] },
  { state:"E1", role:"VST", actions:["READ"] },

  { state:"E2", role:"CLT", actions:["SUBMIT_QUALIFICATION","READ"] },
  { state:"E3", role:"CLT", actions:["UPLOAD_DOC","READ"] },
  { state:"E3", role:"BET", actions:["UPLOAD_DOC","READ"] },
  { state:"E3", role:"ENT", actions:["UPLOAD_DOC","READ"] },

  { state:"E5", role:"CLT", actions:["ACCEPT_DISCLAIMER","READ"] },

  { state:"E7", role:"CLT", actions:["READ","UPLOAD_DOC"] },
  { state:"E8", role:"OP",  actions:["PUBLISH_DELIVERABLE","READ"] },

  { state:"E10", role:"CLT", actions:["UPLOAD_PROOF","READ"] },
  { state:"E10", role:"ENT", actions:["UPLOAD_PROOF","READ"] },

  { state:"EC_DOC", role:"CLT", actions:["UPLOAD_DOC","READ","RESOLVE_FREEZE"] },
  { state:"EC_PAY", role:"CLT", actions:["READ","RESOLVE_FREEZE"] },
];

// packages/domain/src/policies/permissions.ts (helper)
export function can(role: ActorRole, state: State, action: ActionCode): boolean {
  return PERMISSION_MATRIX.some(r => r.role===role && r.state===state && r.actions.includes(action));
}

B3) API Guard (NestJS)
// apps/api/src/modules/compliance/perm.guard.ts
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { can } from "@citurbaarea/domain/policies/permissions";
import { PrismaService } from "../../infra/db/prisma";
import { ProbativeService } from "../probative/probative.service";

@Injectable()
export class PermGuard implements CanActivate {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();

    const projectId = req.params?.projectId || req.body?.projectId;
    const role = (req.headers["x-role"] || "VST") as any;   // placeholder auth
    const actorId = (req.headers["x-actor-id"] || "VST") as string;
    const action = req.headers["x-action"] as any;          // action déclarée par route

    if (!projectId) return true; // endpoints publics

    const st = await this.prisma.projectState.findUnique({ where: { projectId } });
    const state = (st?.state || "E0") as any;

    const ok = can(role, state, action);
    if (!ok) {
      await this.prob.append(projectId, actorId, "EVT_REFUS_FEATURE", { role, state, action });
      throw new ForbiddenException("FORBIDDEN_BY_STATE_ROLE");
    }
    return true;
  }
}


Important : en prod, x-role/x-actor-id viendront de l’auth réelle (JWT + actor table), mais la logique reste identique.

C) Freeze Engine (L5) — EC_DOC / EC_PAY / EC_DISPUTE
C1) Doctrine → règle technique

Freeze = objet DB + état système

Résolution = procédure, parfois payée (surtout EC_DISPUTE)

C2) DB : Freeze déjà présent, on ajoute “ResolutionOffer” (si payant)

Ajoute :

model FreezeResolution {
  id        String @id @default(uuid())
  freezeId  String
  offerCode String?  // si résolution payante
  status    String @default("PENDING") // PENDING/PAID/APPROVED/REJECTED
  createdAt DateTime @default(now())
}

C3) API : open freeze / resolve freeze
// apps/api/src/modules/projects/freezes.controller.ts
import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { PermGuard } from "../compliance/perm.guard";
import { FreezesService } from "./freezes.service";

@Controller("projects/:projectId/freezes")
@UseGuards(PermGuard)
export class FreezesController {
  constructor(private svc: FreezesService) {}

  @Post("open")
  open(@Param("projectId") projectId: string, @Body() dto: any) {
    return this.svc.open(projectId, dto);
  }

  @Post("resolve")
  resolve(@Param("projectId") projectId: string, @Body() dto: any) {
    return this.svc.resolve(projectId, dto);
  }
}

// apps/api/src/modules/projects/freezes.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infra/db/prisma";
import { ProbativeService } from "../probative/probative.service";

@Injectable()
export class FreezesService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async open(projectId: string, dto: { freezeType: "EC_DOC"|"EC_PAY"|"EC_DISPUTE"; reasonCode: string; actorId: string }) {
    const fr = await this.prisma.freeze.create({
      data: { projectId, freezeType: dto.freezeType, reasonCode: dto.reasonCode },
    });

    await this.prisma.projectState.update({
      where: { projectId },
      data: { state: dto.freezeType, version: { increment: 1 }, updatedAt: new Date() },
    });

    await this.prob.append(projectId, dto.actorId, "EVT_FREEZE_OPENED", { freezeId: fr.id, ...dto });
    await this.prob.append(projectId, "SYS", "EVT_STATE_SET", { state: dto.freezeType });

    return { freezeId: fr.id, state: dto.freezeType };
  }

  async resolve(projectId: string, dto: { freezeId: string; actorId: string; resolutionRef?: string }) {
    const fr = await this.prisma.freeze.findUnique({ where: { id: dto.freezeId } });
    if (!fr || fr.projectId !== projectId) throw new Error("FREEZE_NOT_FOUND");

    // doctrine : EC_DISPUTE => résolution souvent payante (upgrade “Réactivation”)
    if (fr.freezeType === "EC_DISPUTE") {
      const res = await this.prisma.freezeResolution.findFirst({ where: { freezeId: fr.id, status: "APPROVED" } });
      if (!res) throw new Error("DISPUTE_REACTIVATION_REQUIRED");
    }

    await this.prisma.freeze.update({
      where: { id: fr.id },
      data: { closedAt: new Date(), resolutionRef: dto.resolutionRef ?? "RESOLVED" },
    });

    // retour à l’état précédent : on ne “devine” pas → on stocke la dernière transition “safe”.
    // Simplification : retour E7 par défaut (à raffiner via StateTransition history)
    await this.prisma.projectState.update({
      where: { projectId },
      data: { state: "E7", version: { increment: 1 }, updatedAt: new Date() },
    });

    await this.prob.append(projectId, dto.actorId, "EVT_FREEZE_CLOSED", { freezeId: fr.id });
    await this.prob.append(projectId, "SYS", "EVT_STATE_SET", { state: "E7" });

    return { ok: true, state: "E7" };
  }
}

D) Data Flywheel + Data Seeding + Geo Skeleton (Mémo)

Tu as demandé : collecte continue, seed sans dossier, ossature Maroc 12/75/1500, docs liés territoires, PMI, Entity intelligence, prix matériaux, météo.

D1) DB : GEO CORE (12/75/communes)

Ajoute tables :

model GeoRegion {
  id   String @id
  name String
}
model GeoProvince {
  id       String @id
  name     String
  regionId String
}
model GeoCommune {
  id         String @id
  name       String
  provinceId String
}


Project.geoId = communeId (canon). Region/province dérivés.

D2) DB : GeoDocs (plans d’aménagement, cahiers des charges, zoning…)
model GeoDoc {
  id        String @id @default(uuid())
  geoId     String // communeId (ou province/region selon doc)
  docType   String // PA, SDAU, RPA, CDC_Lotissement, etc.
  source    String // "seeded" | "dossier" | "observed"
  title     String
  fileRef   String // storage key
  hash      String
  createdAt DateTime @default(now())
  confidence Int @default(50)
}

D3) DB : Market data (foncier + matériaux) “jamais brute en export”
model MarketSignal {
  id        String @id @default(uuid())
  geoId     String
  signalType String // LAND_PRICE, RENT, MATERIAL_PRICE, LABOR_RATE
  value     Float
  unit      String  // MAD/m2, MAD/ton, etc.
  source    String  // DGI, terrain, web, provider
  observedAt DateTime
  confidence Int @default(50)
  createdAt DateTime @default(now())
}

D4) DB : Entities + Observed visitors (PMI) — anonymisé
model Entity {
  id        String @id @default(uuid())
  name      String
  entityType String // COMPANY, SUPPLIER, BET, ARTISAN
  status    String  // UNVERIFIED, PROJECT_LINKED, VERIFIED, ENTITY_OBSERVED
  geoId     String?
  createdAt DateTime @default(now())
}

model PassiveSignal {
  id        String @id @default(uuid())
  signalType String // VISIT, SEARCH, VIEW_OFFER
  anonKey   String  // hash (pas IP brute)
  meta      Json
  createdAt DateTime @default(now())
}

D5) API : Data seeding (OWNER/OP only)

Règle : seed = actif interne, jamais livrable brut.

// apps/api/src/modules/signals/signals.controller.ts
import { Body, Controller, Post } from "@nestjs/common";
import { SignalsService } from "./signals.service";

@Controller("signals")
export class SignalsController {
  constructor(private svc: SignalsService) {}

  @Post("seed/market")
  seedMarket(@Body() dto: any) {
    // auth OWNER/OP à brancher, ici simplifié
    return this.svc.seedMarket(dto);
  }

  @Post("seed/geodoc")
  seedGeoDoc(@Body() dto: any) {
    return this.svc.seedGeoDoc(dto);
  }
}

// apps/api/src/modules/signals/signals.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infra/db/prisma";

@Injectable()
export class SignalsService {
  constructor(private prisma: PrismaService) {}

  seedMarket(dto: { geoId: string; signalType: string; value: number; unit: string; source: string; observedAt: string; confidence?: number }) {
    return this.prisma.marketSignal.create({
      data: { ...dto, observedAt: new Date(dto.observedAt), confidence: dto.confidence ?? 60 },
    });
  }

  seedGeoDoc(dto: { geoId: string; docType: string; title: string; fileRef: string; hash: string }) {
    return this.prisma.geoDoc.create({
      data: { ...dto, source: "seeded", confidence: 70 },
    });
  }
}

E) Comment ça s’aligne aux Tomes (et où sont les livrables concrets)

Tome 3 = tunnels + états + preuves + cycles + gels (livrables “définis”)

Tome 4 = code et DB qui rendent ça exécutable (livrables “produits & stockés”)

Le “projet concret” se voit :

côté client : Web (lecture d’état + actions autorisées)

côté système : ProjectState + ProbativeLog + Deliverables

côté IA : workers (PMS, PV, scoring, ingestion)
```



---

## SOURCE — TOME 4 — V1.0 (extension) — BLOC SUIVANT auth comptes conversion visiteur dossier permissions l1 front state driven data products queryables.txt

```text
TOME 4 — V1.0 (extension) — BLOC SUIVANT
Auth / Comptes / Conversion visiteur → dossier (sans casser la preuve) + Permissions L1 + Front “state-driven” + Data Products queryables
13) Auth & Comptes (Visiteur non connecté → Client/Entreprise/Opérateur)
13.1 Règles doctrinales (Tome 3 I-2 + E0→E7)

E0 Visiteur : lecture + qualification (E2) possible sans compte.

Création compte n’est autorisée que quand :

un paiement doit être fait (E6),

ou un dossier actif doit exister (E7).

Aucun accès “métier” tant que l’état n’a pas créé les droits.

13.2 Modèle DB (Accounts / Sessions / Identity)
model Account {
  id        String @id @default(uuid())
  type      String // CLT / ENT / OP / OWNER
  status    String @default("ACTIVE") // ACTIVE / SUSPENDED
  email     String? @unique
  phone     String? @unique
  passwordHash String?
  createdAt DateTime @default(now())
}

model Session {
  id        String @id @default(uuid())
  accountId String?
  guestId   String?
  tokenHash String @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model Guest {
  id        String @id @default(uuid())
  createdAt DateTime @default(now())
  // minimisation: pas d'email/phone par défaut
  // on stocke uniquement l'historique de qualification et consentements
}

model Consent {
  id        String @id @default(uuid())
  subjectType String // GUEST / ACCOUNT
  subjectId String
  key       String // PMI_OPT_OUT / TERMS_ACCEPTED / DISCLAIMERS_ACCEPTED
  value     Boolean
  createdAt DateTime @default(now())
}

14) Conversion “Guest → Account” (sans casser l’historique probatoire)
14.1 Principe

Le guest est l’origine du flux E0/E2.
Quand E6 (paiement) arrive : on “attache” le guest à un account, sans modifier les logs existants.

14.2 DB : lien explicite
model GuestLink {
  id        String @id @default(uuid())
  guestId   String
  accountId String
  createdAt DateTime @default(now())
}

14.3 Service : create account + link + probative
// apps/api/src/modules/auth/auth.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infra/db/prisma";
import { ProbativeService } from "../probative/probative.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async createClientFromGuest(dto: { guestId: string; email: string; password: string }) {
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const account = await this.prisma.account.create({
      data: { type: "CLT", email: dto.email, passwordHash },
    });

    await this.prisma.guestLink.create({ data: { guestId: dto.guestId, accountId: account.id } });

    // Log probatoire: on n'efface rien, on "attache" juste
    await this.prob.append("SYS", "SYS", "EVT_GUEST_LINKED_TO_ACCOUNT", {
      guestId: dto.guestId,
      accountId: account.id,
      accountType: "CLT",
    });

    return account;
  }
}

15) Permissions (L1) — “Matrice d’autorisations par acteur” exécutable
15.1 Objectif

Le front ne décide jamais. Il demande au backend :

état courant du dossier

actions autorisées pour ce rôle

15.2 DB : permissions calculées / cache (optionnel)
model PermissionSnapshot {
  id        String @id @default(uuid())
  projectId String
  role      String // CLT/ENT/OP/IA/SYS/VST
  state     String // E0..E12/EC_*
  actions   Json   // { "UPLOAD_DOC": true, "PAY": false, ... }
  createdAt DateTime @default(now())
}

15.3 Code : policy engine (simple, extensible)
// apps/api/src/modules/policy/policy.ts
type Role = "VST"|"CLT"|"ENT"|"OP"|"IA"|"SYS"|"BET"|"OWNER";
type State =
  | "E0"|"E1"|"E2"|"E2B"|"E3"|"E4"|"E5"|"E6"|"E7"|"E8"|"E9"|"E10"|"E11"|"E12"
  | "EC_DOC"|"EC_PAY"|"EC_DISPUTE";

export type Action =
  | "READ_PUBLIC" | "SUBMIT_QUALIFICATION" | "UPLOAD_DOC" | "ACCEPT_DISCLAIMERS"
  | "PAY" | "VIEW_DOSSIER" | "POST_MESSAGE" | "UPLOAD_PROOF"
  | "VALIDATE_PHASE" | "REQUEST_UPGRADE" | "REACTIVATE";

export function computeActions(role: Role, state: State): Record<Action, boolean> {
  const denyAll = () => ({
    READ_PUBLIC:false, SUBMIT_QUALIFICATION:false, UPLOAD_DOC:false, ACCEPT_DISCLAIMERS:false,
    PAY:false, VIEW_DOSSIER:false, POST_MESSAGE:false, UPLOAD_PROOF:false,
    VALIDATE_PHASE:false, REQUEST_UPGRADE:false, REACTIVATE:false
  });

  const a = denyAll();

  // Public reading
  if (state === "E0" || state === "E1") a.READ_PUBLIC = true;

  // Qualification
  if (state === "E2" && (role === "VST" || role === "CLT")) a.SUBMIT_QUALIFICATION = true;

  // Disclaimers
  if (state === "E5" && (role === "CLT" || role === "ENT")) a.ACCEPT_DISCLAIMERS = true;

  // Payment
  if (state === "E6" && (role === "CLT" || role === "ENT")) a.PAY = true;

  // Dossier active viewing
  if (["E7","E8","E9","E10","E11","E12","EC_DOC","EC_PAY","EC_DISPUTE"].includes(state)) {
    if (role !== "VST") a.VIEW_DOSSIER = true;
    if (role === "CLT" || role === "ENT") a.POST_MESSAGE = true; // subject to anti-disintermediation detector
  }

  // Upload docs / proofs
  if (state === "E3" && (role === "CLT" || role === "ENT" || role === "BET")) a.UPLOAD_DOC = true;
  if (state === "E10" && (role === "CLT" || role === "ENT")) a.UPLOAD_PROOF = true;

  // Validation
  if (state === "E11" && role === "CLT") a.VALIDATE_PHASE = true;

  // Upgrade always available once dossier exists (state-driven)
  if (["E7","E8","E9","E10","E11"].includes(state) && role === "CLT") a.REQUEST_UPGRADE = true;

  // Reactivation only via paid procedure (handled by state machine)
  if (["EC_DOC","EC_PAY","EC_DISPUTE"].includes(state) && role === "CLT") a.REACTIVATE = true;

  return a;
}

16) API “State-first” : endpoints minimum (aucune logique métier front)
16.1 Contrat backend → front

GET /projects/:id/state → { state, cycle, freezes, allowedActions }

POST /projects/:id/transition → tentative action (backend refuse si non autorisée)

POST /projects/:id/docs / proofs / messages → backend valide + log

// apps/api/src/modules/projects/projects.controller.ts
@Get(":id/state")
async getState(@Param("id") projectId: string, @Req() req: any) {
  const role = req.user?.role ?? "VST";
  const current = await this.stateService.getCurrent(projectId);
  const allowed = computeActions(role, current.state);
  return { ...current, allowedActions: allowed };
}

17) Front React “state-driven” (squelette exécutable)
17.1 Principe

Une page = un renderer d’état

Les composants n’ont aucune règle (ils affichent ce que le backend dit)

17.2 Exemple : ProjectShell
// apps/web/src/features/project/ProjectShell.tsx
import { useEffect, useState } from "react";

type ProjectStateResp = {
  state: string;
  allowedActions: Record<string, boolean>;
  cycle?: string;
  freezes?: any[];
};

async function fetchState(projectId: string): Promise<ProjectStateResp> {
  const r = await fetch(`/api/projects/${projectId}/state`, { credentials: "include" });
  if (!r.ok) throw new Error("STATE_FETCH_FAILED");
  return r.json();
}

export function ProjectShell({ projectId }: { projectId: string }) {
  const [data, setData] = useState<ProjectStateResp | null>(null);

  useEffect(() => {
    fetchState(projectId).then(setData).catch(() => setData(null));
  }, [projectId]);

  if (!data) return <div>Loading…</div>;

  switch (data.state) {
    case "E3":
      return <DocsUpload projectId={projectId} allowed={data.allowedActions} />;
    case "E5":
      return <Disclaimers projectId={projectId} allowed={data.allowedActions} />;
    case "E6":
      return <Checkout projectId={projectId} allowed={data.allowedActions} />;
    case "E10":
      return <ProofsUpload projectId={projectId} allowed={data.allowedActions} />;
    case "EC_DISPUTE":
      return <FrozenDispute projectId={projectId} />;
    default:
      return <GenericDashboard projectId={projectId} state={data.state} allowed={data.allowedActions} />;
  }
}

18) Opt-out PMI (mémo XIV) + Rate limiting
18.1 Opt-out global

Stockage consentement PMI_OPT_OUT=true sur guest/account

Le collector PMI doit vérifier ce flag

// apps/api/src/modules/pmi/pmi.guard.ts
@Injectable()
export class PmiGuard {
  constructor(private prisma: PrismaService) {}

  async canCollect(subjectType: "GUEST"|"ACCOUNT", subjectId: string) {
    const c = await this.prisma.consent.findFirst({
      where: { subjectType, subjectId, key: "PMI_OPT_OUT", value: true },
    });
    return !c;
  }
}

18.2 Rate limiting (anti-abus + souveraineté)

Edge/proxy ou Nest middleware

Doctrinal : sécurité > confort

19) Data Products “queryables” (Land Index / Cost Index / Reg Rulesets)
19.1 Règle doctrinale (mémo III, IV, IX)

Pas d’export brut

Vente temporisée / context-only

Un “Data Product” sert à :

répondre à des requêtes internes,

alimenter des packs payés,

donner des scores / indices

19.2 Produits canoniques (v1)

LAND_INDEX(geoId, period) : indicateur prix foncier (agrégé)

COST_INDEX(materialCategory, geoId, period) : indicateur coûts

REG_RULESET(geoId) : règles structurées (zoning/servitudes/gabarits)

19.3 API interne (pas public)
// apps/api/src/modules/data-products/dataProducts.service.ts
@Injectable()
export class DataProductsService {
  constructor(private prisma: PrismaService) {}

  async getLandIndex(geoId: string) {
    const p = await this.prisma.dataProduct.findFirst({
      where: { productCode: "LAND_INDEX", geoId },
      orderBy: { version: "desc" },
    });
    return p?.payload ?? null;
  }

  async getRegRuleset(geoId: string) {
    const p = await this.prisma.dataProduct.findFirst({
      where: { productCode: "REG_RULESET", geoId },
      orderBy: { version: "desc" },
    });
    return p?.payload ?? null;
  }
}

19.4 Gate “entitlement” : seulement si pack payé

Tu ajoutes une table Entitlement (droits activés par paiement).

model Entitlement {
  id        String @id @default(uuid())
  projectId String
  code      String // e.g. "DP_LAND_INDEX", "DP_COST_INDEX", "BIM_VIEWER"
  active    Boolean @default(true)
  createdAt DateTime @default(now())
}

Ce que ce bloc verrouille (et pourquoi c’est “complet” à ce stade)

✅ Visiteur non connecté intégré (E0/E1/E2)

✅ Création compte uniquement quand nécessaire (E6/E7)

✅ Conversion guest→account sans perdre la preuve

✅ Permissions L1 exécutable (backend décide)

✅ Front React sans logique métier (state renderer)

✅ Opt-out PMI + minimisation

✅ Data Products queryables + entitlements (upgrade-only)
```



---

## SOURCE — TOME 4 — V1.0 (extension) — BLOC SUIVANT GEO CORE MOTEUR DE COMPLETUDE TTERITORIALE INTEROP INSTITUONNELLE PMI ENGINE SQEULETTE NATIOANLE REGLES DOCTRINALES.txt

```text
TOME 4 — V1.0 (extension) — BLOC SUIVANT
GEO CORE (12/75/1500+) + MOTEUR DE COMPLÉTUDE TERRITORIALE + INTEROP INSTITUTIONNELLE (read-only par défaut) + PMI Engine (anonymisé)
25) GEO CORE — Squelette national (Maroc → 12 régions → 75 provinces/préfectures → 1500+ communes)
25.1 Règles doctrinales (Mémo V + Tome 0 + Tome 3 E2b/PMS)

Tout dossier, document, signal, observation, prix, entité doit avoir un geo_id (au minimum commune, sinon province, sinon région).

Les documents réglementaires sont liés au territoire, pas au dossier.

Carte = structure de DB (pas un gadget UI).

25.2 DB (PostgreSQL + PostGIS) — tables geo canon
-- extensions
CREATE EXTENSION IF NOT EXISTS postgis;

-- 12 régions / 75 provinces / communes
CREATE TABLE geo_region (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,       -- ex: "R01"
  name_fr TEXT NOT NULL,
  name_ar TEXT,
  geom GEOMETRY(MULTIPOLYGON, 4326)
);

CREATE TABLE geo_province (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES geo_region(id),
  code TEXT UNIQUE NOT NULL,       -- ex: "P001"
  name_fr TEXT NOT NULL,
  name_ar TEXT,
  geom GEOMETRY(MULTIPOLYGON, 4326)
);

CREATE TABLE geo_commune (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID NOT NULL REFERENCES geo_province(id),
  code TEXT UNIQUE NOT NULL,       -- ex: "C0001"
  name_fr TEXT NOT NULL,
  name_ar TEXT,
  geom GEOMETRY(MULTIPOLYGON, 4326)
);

-- résolution de rattachement (utile si manque)
CREATE TABLE geo_resolver (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_text TEXT NOT NULL,
  commune_id UUID REFERENCES geo_commune(id),
  confidence INT NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

25.3 Règle “geo obligatoire” (backend gate)
// apps/api/src/modules/geo/geo.guard.ts
export function requireGeo(input: { communeId?: string|null; provinceId?: string|null; regionId?: string|null }) {
  if (input.communeId || input.provinceId || input.regionId) return;
  throw new Error("GEO_ID_REQUIRED");
}

26) GEO-DOCS — documents réglementaires liés au territoire (pas aux dossiers)
26.1 Règles (Mémo V + III/IV + Tome 3 E2b)

Un document (plan d’aménagement, règlement, cahier des charges lotissement, zoning, servitudes, etc.) est un GeoDoc.

Un GeoDoc est versionné, hashé, horodaté, et rattaché à un geo_scope (commune / province / région / polygone spécifique).

Livraison au client = rapport/indices, jamais “export brut” systématique (upgrade-only).

26.2 DB — GeoDoc + index
model GeoDoc {
  id          String @id @default(uuid())
  geoLevel    String // COMMUNE / PROVINCE / REGION / CUSTOM_POLYGON
  geoId       String? // commune/province/region id
  title       String
  docType     String // PA / SDAU / CC_LOTISSEMENT / ZONING / SERVITUDE / ...
  sourceType  String // OFFICIAL / OBSERVED / SEED
  sourceRef   String? // url, bulletin ref, dépôt, etc.
  fileId      String // stockage (S3)
  sha256      String
  version     Int @default(1)
  status      String @default("ACTIVE")
  extracted   Json?  // extraction structurée (si faite)
  createdAt   DateTime @default(now())
}

model GeoRuleSet {
  id        String @id @default(uuid())
  geoId     String?
  ruleType  String // HEIGHT / SETBACK / COS / CES / USE / ...
  payload   Json
  confidence Int @default(50)
  version   Int @default(1)
  createdAt DateTime @default(now())
}

26.3 Extraction “vers module exploitable” (Data Product)

séparation stricte Data Lake (GeoDoc) vs Data Product (GeoRuleSet / DataProduct)

// apps/api/src/modules/geo-docs/geodocs.extractor.ts
@Injectable()
export class GeoDocsExtractor {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async publishRulesFromDoc(geoDocId: string) {
    const doc = await this.prisma.geoDoc.findUnique({ where: { id: geoDocId }});
    if (!doc) throw new Error("GEODOC_NOT_FOUND");

    // MVP: rules saisies/validées par OP (seed), puis automatisation progressive.
    // Ici on transforme doc.extracted -> GeoRuleSet
    const extracted = (doc.extracted ?? {}) as any;
    const rules = extracted.rules ?? [];

    for (const r of rules) {
      await this.prisma.geoRuleSet.create({
        data: {
          geoId: doc.geoId ?? null,
          ruleType: r.type,
          payload: r.payload,
          confidence: r.confidence ?? 60,
          version: 1
        }
      });
    }

    await this.prob.append("SYS","SYS","EVT_GEO_RULESET_PUBLISHED",{ geoDocId, geoId: doc.geoId, count: rules.length });
  }
}

27) MOTEUR DE COMPLÉTUDE TERRITORIALE — zones blanches + docs manquants + couverture CITURBAREA
27.1 Règles (Mémo V + table de correspondance)

Chaque territoire a une liste canonique de docs attendus (par type de zone/commune).

Le système calcule :

Coverage Score (0–100)

Missing Docs

Zones blanches prioritaires

Usage : dashboards internes + orientation data seeding + stratégie d’expansion.

27.2 DB — requirements + coverage
model GeoDocRequirement {
  id       String @id @default(uuid())
  geoLevel String // COMMUNE/PROVINCE/REGION
  docType  String // PA / CC_LOTISSEMENT / ZONING / ...
  required Boolean @default(true)
  notes    String?
}

model GeoCoverage {
  id        String @id @default(uuid())
  geoLevel  String
  geoId     String
  score     Int
  missing   Json // [{docType, reason}]
  updatedAt DateTime @default(now())
}

27.3 Compute coverage job
// apps/api/src/modules/geo/geo.coverage.ts
@Injectable()
export class GeoCoverageJob {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async computeCommuneCoverage(communeId: string) {
    const reqs = await this.prisma.geoDocRequirement.findMany({
      where: { geoLevel: "COMMUNE", required: true }
    });

    const docs = await this.prisma.geoDoc.findMany({
      where: { geoLevel: "COMMUNE", geoId: communeId, status: "ACTIVE" }
    });

    const present = new Set(docs.map(d => d.docType));
    const missing = reqs.filter(r => !present.has(r.docType)).map(r => ({
      docType: r.docType, reason: "NOT_FOUND"
    }));

    const score = Math.max(0, Math.min(100, Math.round(100 * (reqs.length - missing.length) / Math.max(1, reqs.length))));
    await this.prisma.geoCoverage.upsert({
      where: { geoLevel_geoId: { geoLevel: "COMMUNE", geoId: communeId } },
      update: { score, missing, updatedAt: new Date() },
      create: { geoLevel: "COMMUNE", geoId: communeId, score, missing },
    });

    await this.prob.append("SYS","SYS","EVT_GEO_COVERAGE_UPDATED",{ geoLevel:"COMMUNE", geoId: communeId, score, missingCount: missing.length });
    return { score, missing };
  }
}

28) INTEROP INSTITUTIONNELLE — Rokhas / Taamir / CRI (3 modes) “Signal ≠ Autorité”
28.1 Règles (Mémo VII + Tome 0 souveraineté)

Mode 1 (prioritaire) : Observation passive (read-only)

ingestion emails notifications, numéros dossiers, statuts, PV, délais, remarques (quand légalement obtenus)

Mode 2 : Échange contrôlé

uniquement si API officielle / contrat / conformité juridique

toujours en “shadow mode” : le système compare, ne dépend pas

Mode 3 : Interaction assistée (jamais décisionnelle)

UI guide l’opérateur humain ; la plateforme journalise ; aucun “auto-submit” sans cadre officiel

28.2 DB — connectors + signals + correlation
model ExternalConnector {
  id        String @id @default(uuid())
  name      String // ROKHAS / TAAMIR / CRI
  mode      String // OBSERVE / EXCHANGE / ASSIST
  status    String @default("ACTIVE")
  config    Json
  createdAt DateTime @default(now())
}

model ExternalSignal {
  id          String @id @default(uuid())
  connectorId String
  geoId       String?
  projectId   String?
  signalType  String // STATUS_CHANGE / PV / REMARKS / DEADLINE / RECEIPT
  payload     Json
  observedAt  DateTime @default(now())
  confidence  Int @default(50)
}

model ExternalCorrelation {
  id         String @id @default(uuid())
  projectId  String
  connector  String
  externalRef String // ex: dossier number
  confidence Int
  createdAt  DateTime @default(now())
}

28.3 Ingestion “read-only” type (ex: email parsing / webhook)
// apps/api/src/modules/interop/interop.observe.ts
@Injectable()
export class InteropObserver {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async ingestSignal(connectorName: string, raw: { geoId?: string; projectId?: string; type: string; payload: any; confidence?: number }) {
    const conn = await this.prisma.externalConnector.findFirst({ where: { name: connectorName, status: "ACTIVE" }});
    if (!conn) throw new Error("CONNECTOR_NOT_ACTIVE");

    if (conn.mode !== "OBSERVE" && conn.mode !== "EXCHANGE") {
      // ASSIST ne reçoit pas de signaux automatiques (guidage UI)
      throw new Error("CONNECTOR_MODE_REJECTS_AUTO_INGEST");
    }

    const sig = await this.prisma.externalSignal.create({
      data: {
        connectorId: conn.id,
        geoId: raw.geoId ?? null,
        projectId: raw.projectId ?? null,
        signalType: raw.type,
        payload: raw.payload,
        confidence: raw.confidence ?? 60
      }
    });

    await this.prob.append("SYS","SYS","EVT_EXTERNAL_SIGNAL_INGESTED",{ connector: connectorName, signalId: sig.id, type: raw.type, projectId: raw.projectId ?? null });
    return sig;
  }
}

29) PMI ENGINE — Passive Market Intelligence (anonymisé) + interdiction démarchage direct
29.1 Règles (Mémo XII + XIV)

On ne “profile” pas des personnes.

On capte signaux anonymisés (session, pages vues, temps, intérêts) → PMI_Signal.

On ne déclenche aucune activation commerciale directe.

La seule sortie autorisée : invitation neutre vers packs / qualification (sans ciblage agressif).

29.2 DB — sessions anonymes + signaux
model PmiSession {
  id        String @id @default(uuid())
  anonId    String // hash stable (ex: cookie salted)
  firstSeen DateTime @default(now())
  lastSeen  DateTime @default(now())
  geoHint   String? // geoId approx si disponible
  tags      Json?   // intérêts agrégés
}

model PmiSignal {
  id        String @id @default(uuid())
  sessionId String
  signal    String // VIEW_PAGE / SEARCH / DOWNLOAD_ATTEMPT / PRICING_INTEREST
  payload   Json
  createdAt DateTime @default(now())
}

model PmiInference {
  id        String @id @default(uuid())
  sessionId String
  inference String // "LIKELY_SUPPLIER" / "LIKELY_INVESTOR" / ...
  confidence Int
  createdAt DateTime @default(now())
}

29.3 Collector minimal (backend) — anonymisation + opt-out global
// apps/api/src/modules/pmi/pmi.service.ts
import crypto from "crypto";

function hashAnon(input: string, salt: string) {
  return crypto.createHmac("sha256", salt).update(input).digest("hex");
}

@Injectable()
export class PmiService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async track(rawAnonKey: string, salt: string, ev: { signal: string; payload: any; geoHint?: string }) {
    const anonId = hashAnon(rawAnonKey, salt);

    const session = await this.prisma.pmiSession.upsert({
      where: { anonId },
      update: { lastSeen: new Date(), geoHint: ev.geoHint ?? undefined },
      create: { anonId, geoHint: ev.geoHint ?? null }
    });

    await this.prisma.pmiSignal.create({
      data: { sessionId: session.id, signal: ev.signal, payload: ev.payload }
    });

    // pas de probative log détaillé ici (risque “surveillance”) => on log seulement agrégé
    return { ok: true };
  }
}

29.4 Inference rules-first (convergence requise)
// apps/api/src/modules/pmi/pmi.infer.ts
@Injectable()
export class PmiInferJob {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async infer(sessionId: string) {
    const signals = await this.prisma.pmiSignal.findMany({ where: { sessionId } });

    const views = signals.filter(s => s.signal === "VIEW_PAGE").length;
    const pricing = signals.filter(s => s.signal === "PRICING_INTEREST").length;
    const downloads = signals.filter(s => s.signal === "DOWNLOAD_ATTEMPT").length;

    // convergence simple: au moins 2 signaux
    let inf: { inference: string; confidence: number } | null = null;
    if (pricing >= 1 && downloads >= 1) inf = { inference: "HIGH_INTENT", confidence: 75 };
    else if (views >= 5 && pricing >= 1) inf = { inference: "MED_INTENT", confidence: 60 };

    if (inf) {
      await this.prisma.pmiInference.create({
        data: { sessionId, inference: inf.inference, confidence: inf.confidence }
      });
      await this.prob.append("SYS","SYS","EVT_PMI_INFERENCE",{ sessionId, inference: inf.inference, confidence: inf.confidence });
    }
  }
}

30) Connexion / Visiteur non connecté — intégration “comptable” (Tome 3 E0→E2)
30.1 Règle

Un visiteur existe comme E0 Visiteur (session anonymisée).

Il ne déclenche aucune action métier hors :

lecture,

FAQ cadrée,

qualification (E2) si compte créé,

tracking anonymisé PMI (opt-out).

30.2 Schéma minimal (front n’a pas de logique métier)

Front affiche : landing porte / docs publics / CTA packs

Toute action = API → state machine backend

Ce bloc couvre le mémo (parties V, VI, VII, XII, XIV + question “visiteur non connecté”)

✅ Geo skeleton + GeoDocs + RuleSets
✅ Moteur complétude territoriale (zones blanches / docs manquants)
✅ Interop institutionnelle 3 modes (read-only par défaut, souveraineté)
✅ PMI Engine anonymisé (pas de démarchage direct)
✅ Visiteur non connecté intégré au modèle d’état
```



---

## SOURCE — TOME 4 — V1.0 (extension) — BLOC SUIVANT cost intteligence engine 5d bim engine ifc clash detection entity intelligence engine.txt

```text
TOME 4 — V1.0 (extension) — BLOC SUIVANT
(1) Cost Intelligence Engine (5D) + (2) BIM Engine IFC 3D/4D/5D/6D + Clash Detection + (3) Entity Intelligence Engine (acteurs) — le tout “upgrade-only” + logs probatoires
20) COST INTELLIGENCE ENGINE (5D) — “index + signaux” (jamais devis)
20.1 Règles doctrinales (Mémo IX + Tome 3 L2/L3/L5)

Aucune donnée brute livrée (prix unitaires, listes fournisseurs) en dehors d’un pack payé.

Jamais un devis : uniquement indices / fourchettes / scénarios + disclaimers.

Double collecte :

Reactive via dossiers (preuves, DCE, achats, PV)

Proactive (data seeding) via Owner/Opérateurs (DGI, marché, observations)

Vente temporisée : accès data product uniquement si Entitlement actif.

20.2 DB — Sources / Observations / Index / Products
model CostObservation {
  id          String @id @default(uuid())
  sourceType  String // DOSSIER / SEED / WEB / PARTNER
  sourceRef   String? // projectId, docId, etc.
  geoId       String? // rattachement géographique si connu
  category    String  // CIMENT / ACIER / CARRELAGE / MAIN_OEUVRE / SERVICE_...
  brand       String?
  unit        String  // m2, m3, kg, u, jour, forfait
  unitPrice   Decimal
  currency    String @default("MAD")
  observedAt  DateTime
  confidence  Int     @default(50) // 0..100
  note        String?
  createdBy   String? // accountId (OWNER/OP)
  createdAt   DateTime @default(now())
}

model CostIndex {
  id         String @id @default(uuid())
  geoId      String? // null = national
  category   String
  period     String  // "2026-02" / "2026-Q1"
  p10        Decimal
  p50        Decimal
  p90        Decimal
  currency   String @default("MAD")
  sampleSize Int
  confidence Int
  version    Int @default(1)
  createdAt  DateTime @default(now())
}

model DataProduct {
  id          String @id @default(uuid())
  productCode String // COST_INDEX / LAND_INDEX / REG_RULESET / ...
  geoId       String?
  version     Int @default(1)
  payload     Json
  createdAt   DateTime @default(now())
}

20.3 Pipelines — ingestion → scoring → index
20.3.1 Ingestion (owner/op) — “seed data”
// apps/api/src/modules/cost/cost.service.ts
@Injectable()
export class CostService {
  constructor(
    private prisma: PrismaService,
    private prob: ProbativeService,
  ) {}

  async seedObservation(actorAccountId: string, input: {
    geoId?: string;
    category: string;
    unit: string;
    unitPrice: number;
    observedAt: string; // ISO
    sourceNote?: string;
  }) {
    const obs = await this.prisma.costObservation.create({
      data: {
        sourceType: "SEED",
        geoId: input.geoId ?? null,
        category: input.category,
        unit: input.unit,
        unitPrice: input.unitPrice,
        observedAt: new Date(input.observedAt),
        confidence: 70,
        note: input.sourceNote ?? null,
        createdBy: actorAccountId,
      }
    });

    await this.prob.append(actorAccountId, "OWNER", "EVT_COST_OBS_SEEDED", {
      observationId: obs.id,
      geoId: obs.geoId,
      category: obs.category,
      unit: obs.unit,
      observedAt: obs.observedAt,
    });

    return obs;
  }
}

20.3.2 Index builder (cron/job) — agrégation robuste
// apps/api/src/modules/cost/cost.indexer.ts
function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

@Injectable()
export class CostIndexer {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async buildMonthlyIndex(period: string) {
    const from = new Date(`${period}-01T00:00:00Z`);
    const to = new Date(from); to.setMonth(to.getMonth() + 1);

    const observations = await this.prisma.costObservation.findMany({
      where: { observedAt: { gte: from, lt: to } },
    });

    const key = (o: any) => `${o.geoId ?? "NAT"}::${o.category}`;
    const groups = new Map<string, number[]>();

    for (const o of observations) {
      const k = key(o);
      const arr = groups.get(k) ?? [];
      arr.push(Number(o.unitPrice));
      groups.set(k, arr);
    }

    for (const [k, arr] of groups.entries()) {
      arr.sort((a,b)=>a-b);
      const [geoId, category] = k.split("::");

      const p10 = percentile(arr, 0.10);
      const p50 = percentile(arr, 0.50);
      const p90 = percentile(arr, 0.90);

      const idx = await this.prisma.costIndex.create({
        data: {
          geoId: geoId === "NAT" ? null : geoId,
          category,
          period,
          p10, p50, p90,
          currency: "MAD",
          sampleSize: arr.length,
          confidence: Math.min(90, 40 + Math.floor(Math.log10(arr.length + 1) * 20)),
          version: 1
        }
      });

      await this.prbSafe("SYS", "SYS", "EVT_COST_INDEX_BUILT", {
        costIndexId: idx.id, geoId: idx.geoId, category, period, sampleSize: idx.sampleSize
      });
    }
  }

  private async prbSafe(actorId: string, role: string, event: string, payload: any) {
    await this.prob.append(actorId, role, event, payload);
  }
}

20.4 Delivery (pack payé) — DataProduct COST_INDEX
// apps/api/src/modules/data-products/dataProducts.publisher.ts
@Injectable()
export class DataProductsPublisher {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async publishCostIndexProduct(period: string, geoId?: string | null) {
    const rows = await this.prisma.costIndex.findMany({ where: { period, geoId: geoId ?? null } });

    const payload = {
      period,
      geoId: geoId ?? null,
      disclaimer: "INDICATIF — NON CONTRACTUEL — ne constitue pas un devis.",
      items: rows.map(r => ({
        category: r.category, p10: r.p10, p50: r.p50, p90: r.p90, currency: r.currency,
        confidence: r.confidence, sampleSize: r.sampleSize
      }))
    };

    const dp = await this.prisma.dataProduct.create({
      data: { productCode: "COST_INDEX", geoId: geoId ?? null, payload, version: 1 }
    });

    await this.prob.append("SYS","SYS","EVT_DATA_PRODUCT_PUBLISHED",{ id: dp.id, productCode:"COST_INDEX", period, geoId: geoId ?? null });
    return dp;
  }
}

21) BIM ENGINE (IFC) — 3D/4D/5D/6D/7D “moteur interne” + clash detection
21.1 Règles doctrinales (Mémo X + Tome 4 §9 + Tome 3 PMS + cycles)

IFC obligatoire pour tout module BIM.

BIM ≠ viewer : c’est un moteur :

import IFC → parsing → classification → règles → détection clashes → rapports → états.

Clash detection :

d’abord rules-based (réaliste, auditable),

puis IA (option) mais jamais sans preuve + logs.

4D/5D/6D : on stocke des dimensions liées aux objets IFC (temps/coût/durabilité), mais la vente reste upgrade-only.

21.2 DB — BIM models / objects / dimensions / clashes
model BimModel {
  id         String @id @default(uuid())
  projectId  String
  fileId     String // référence storage (S3)
  ifcSchema  String? // IFC2X3 / IFC4
  version    Int @default(1)
  status     String @default("IMPORTED") // IMPORTED / PARSED / FAILED
  createdAt  DateTime @default(now())
}

model BimObject {
  id        String @id @default(uuid())
  modelId   String
  ifcGuid   String
  ifcType   String // IfcWall, IfcBeam...
  name      String?
  props     Json
  bbox      Json // {min:{x,y,z}, max:{x,y,z}} for fast clash
  createdAt DateTime @default(now())
  @@unique([modelId, ifcGuid])
}

model BimDimension {
  id        String @id @default(uuid())
  modelId   String
  ifcGuid   String
  dimType   String // 4D_TIME / 5D_COST / 6D_SUST / 7D_OPS
  payload   Json
  createdAt DateTime @default(now())
  @@index([modelId, ifcGuid])
}

model BimClash {
  id        String @id @default(uuid())
  modelId   String
  aGuid     String
  bGuid     String
  clashType String // HARD / CLEARANCE / RULE
  severity  String // LOW/MED/HIGH
  evidence  Json   // bbox overlap, rule id, distance
  status    String @default("OPEN") // OPEN / ACK / RESOLVED
  createdAt DateTime @default(now())
}

21.3 IFC parsing (backend worker) — minimal viable, auditable

Implémentation “réaliste” : tu peux commencer par bbox + type + props.
Les clashes “HARD” = overlap bbox (approx) + filtres type. Puis tu améliores.

// apps/api/src/modules/bim/bim.worker.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infra/db/prisma";
import { ProbativeService } from "../probative/probative.service";

/**
 * Placeholder: parser IFC.
 * En prod: utiliser un parseur IFC côté worker (WASM/Node) ou microservice dédié.
 */
@Injectable()
export class BimWorker {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async importIfc(modelId: string, parsed: Array<{
    ifcGuid: string; ifcType: string; name?: string;
    props: any; bbox: {min:any; max:any};
  }>) {
    await this.prisma.bimModel.update({ where: { id: modelId }, data: { status: "PARSED" } });

    for (const o of parsed) {
      await this.prisma.bimObject.upsert({
        where: { modelId_ifcGuid: { modelId, ifcGuid: o.ifcGuid } },
        update: { ifcType: o.ifcType, name: o.name ?? null, props: o.props, bbox: o.bbox },
        create: { modelId, ifcGuid: o.ifcGuid, ifcType: o.ifcType, name: o.name ?? null, props: o.props, bbox: o.bbox },
      });
    }

    await this.prob.append("SYS","SYS","EVT_BIM_MODEL_PARSED",{ modelId, objects: parsed.length });
  }
}

21.4 Clash detection — rules-first (auditable) + logs
// apps/api/src/modules/bim/bim.clash.ts
function bboxOverlap(a: any, b: any): boolean {
  return (
    a.min.x <= b.max.x && a.max.x >= b.min.x &&
    a.min.y <= b.max.y && a.max.y >= b.min.y &&
    a.min.z <= b.max.z && a.max.z >= b.min.z
  );
}

@Injectable()
export class BimClashService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async detectHardClashes(modelId: string) {
    const objs = await this.prisma.bimObject.findMany({ where: { modelId } });

    // MVP: O(n²) -> ensuite index spatial (R-tree/PostGIS/3D grid)
    let clashes = 0;
    for (let i=0;i<objs.length;i++) {
      for (let j=i+1;j<objs.length;j++) {
        const A = objs[i], B = objs[j];

        // filtres simples (ex: ignorer mobilier vs mobilier)
        if (A.ifcType === "IfcFurniture" && B.ifcType === "IfcFurniture") continue;

        if (bboxOverlap(A.bbox, B.bbox)) {
          await this.prisma.bimClash.create({
            data: {
              modelId,
              aGuid: A.ifcGuid,
              bGuid: B.ifcGuid,
              clashType: "HARD",
              severity: "MED",
              evidence: { method: "BBOX_OVERLAP", aBBox: A.bbox, bBBox: B.bbox }
            }
          });
          clashes++;
        }
      }
    }

    await this.prob.append("SYS","SYS","EVT_BIM_CLASH_RUN",{ modelId, hardClashes: clashes });
    return { hardClashes: clashes };
  }
}

21.5 4D/5D/6D mapping (upgrade-only)

4D : phases/planning liées aux GUID (ex: phaseId, start, end)

5D : costRef + quantités + index (sans prix exact si non-entitled)

6D : matériaux/empreinte/performances (données “indicatives”)

// apps/api/src/modules/bim/bim.dimensions.ts
@Injectable()
export class BimDimensionService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async attach4D(modelId: string, items: Array<{ ifcGuid: string; start: string; end: string; phase: string }>) {
    for (const it of items) {
      await this.prisma.bimDimension.create({
        data: {
          modelId,
          ifcGuid: it.ifcGuid,
          dimType: "4D_TIME",
          payload: { start: it.start, end: it.end, phase: it.phase }
        }
      });
    }
    await this.prob.append("SYS","SYS","EVT_BIM_4D_ATTACHED",{ modelId, count: items.length });
  }
}

22) ENTITY INTELLIGENCE ENGINE — entreprises/fournisseurs/BET/artisans (avec statuts)
22.1 Règles doctrinales (Mémo XI + XII + Tome 3 Porte 6 + anti-désintermédiation)

Une entité peut exister sans compte :

intervenant sur projet (upload, PV, DCE, facture)

observée sur le web (PMI) anonymisée → ENTITY_OBSERVED

Statuts canonisés :

UNVERIFIED

PROJECT_LINKED

VERIFIED

ENTITY_OBSERVED

Preuve > réputation : le scoring se base d’abord sur preuves projet (PMS, PV, conformité), ensuite seulement sur signaux externes.

RGPD / minimisation : pas de profiling personnel ; consentement requis pour VERIFIED.

22.2 DB — entities / links / evidence / score
model Entity {
  id        String @id @default(uuid())
  type      String // COMPANY / SUPPLIER / BET / ARTISAN
  status    String @default("UNVERIFIED") // UNVERIFIED/PROJECT_LINKED/VERIFIED/ENTITY_OBSERVED
  name      String
  geoId     String?
  phone     String?
  email     String?
  socials   Json?   // urls/handles (optionnel)
  meta      Json?   // tags, specialties, notes
  createdAt DateTime @default(now())
}

model ProjectEntityLink {
  id        String @id @default(uuid())
  projectId String
  entityId  String
  role      String // CONTRACTOR / SUPPLIER / BET / ...
  createdAt DateTime @default(now())
  @@unique([projectId, entityId, role])
}

model EntityEvidence {
  id        String @id @default(uuid())
  entityId  String
  projectId String?
  evidenceType String // PMS_PROOF / PV / DOC / PAYMENT_EVENT
  refId     String // proofId/docId/logId
  scoreHint Int    @default(0)
  createdAt DateTime @default(now())
}

model EntityScore {
  id        String @id @default(uuid())
  entityId  String
  score     Int // 0..100
  breakdown Json // {pms:..., delays:..., disputes:..., docs:...}
  version   Int @default(1)
  createdAt DateTime @default(now())
}

22.3 “Auto-capture” entité depuis un dossier (sans compte)

Ex: une entreprise apparaît dans un PV, une facture, un doc.

// apps/api/src/modules/entity/entity.service.ts
@Injectable()
export class EntityService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async upsertProjectLinked(projectId: string, input: { name: string; type: string; role: string; phone?: string; email?: string; geoId?: string }) {
    // matching minimal: name+phone/email
    const existing = await this.prisma.entity.findFirst({
      where: {
        OR: [
          { phone: input.phone ?? "__no__", },
          { email: input.email ?? "__no__", },
          { name: input.name },
        ]
      }
    });

    const entity = existing
      ? await this.prisma.entity.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            type: input.type,
            phone: input.phone ?? existing.phone,
            email: input.email ?? existing.email,
            geoId: input.geoId ?? existing.geoId,
            status: existing.status === "ENTITY_OBSERVED" ? "PROJECT_LINKED" : (existing.status ?? "PROJECT_LINKED"),
          }
        })
      : await this.prisma.entity.create({
          data: {
            name: input.name,
            type: input.type,
            phone: input.phone ?? null,
            email: input.email ?? null,
            geoId: input.geoId ?? null,
            status: "PROJECT_LINKED",
          }
        });

    await this.prisma.projectEntityLink.create({
      data: { projectId, entityId: entity.id, role: input.role }
    }).catch(()=>null);

    await this.prob.append("SYS","SYS","EVT_ENTITY_PROJECT_LINKED",{ projectId, entityId: entity.id, role: input.role });

    return entity;
  }
}

22.4 Scoring “preuve > réputation” (v1)
// apps/api/src/modules/entity/entity.scoring.ts
@Injectable()
export class EntityScoringService {
  constructor(private prisma: PrismaService, private prob: ProbativeService) {}

  async recompute(entityId: string) {
    const evidence = await this.prisma.entityEvidence.findMany({ where: { entityId } });

    // heuristiques simples v1 (ensuite tu passes sur modèle + contraintes)
    const pms = evidence.filter(e => e.evidenceType === "PMS_PROOF").length;
    const pv  = evidence.filter(e => e.evidenceType === "PV").length;

    const score = Math.min(100, 30 + pms * 5 + pv * 2);
    const breakdown = { pms, pv, rule: "v1_simple_proof_weighted" };

    const row = await this.prisma.entityScore.create({ data: { entityId, score, breakdown, version: 1 } });
    await this.prob.append("SYS","SYS","EVT_ENTITY_SCORE_UPDATED",{ entityId, score });

    return row;
  }
}

23) Anti-désintermédiation (Airbnb-like) — détection côté backend
23.1 Règle

Les messages passent uniquement par la plateforme.

Tentative d’échange contact externe → log + signal + EC-Dispute si répétition (Tome 3 PARTIE IX + L5)

23.2 Detector minimal
// apps/api/src/modules/messaging/antiLeak.ts
const PHONE = /(\+?\d[\d\s\-().]{7,}\d)/;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const WHATS = /(whatsapp|wa\.me|w\.a)/i;

export function detectLeak(text: string) {
  const hits = [];
  if (PHONE.test(text)) hits.push("PHONE");
  if (EMAIL.test(text)) hits.push("EMAIL");
  if (WHATS.test(text)) hits.push("WHATSAPP");
  return hits;
}

// apps/api/src/modules/messaging/messaging.service.ts
async postMessage(projectId: string, actorId: string, role: string, text: string) {
  const hits = detectLeak(text);
  if (hits.length) {
    await this.prob.append(actorId, role, "EVT_MESSAGE_LEAK_ATTEMPT", { projectId, hits });
    // v1: masquer + avertir ; v2: escalade vers EC-Dispute après seuil
    throw new Error("MESSAGE_BLOCKED_CONTACT_LEAK");
  }
  // store message normally + logs
}

24) Entitlements (upgrade-only) — raccord direct au paiement (Tome 3 L2)
24.1 Règle

Toute feature avancée (COST_INDEX, BIM_VIEWER, BIM_CLASH_REPORT, ENTITY_SHORTLIST, etc.) :

n’existe que si Entitlement.active=true

créé par webhook paiement validé

// apps/api/src/modules/billing/billing.webhook.ts
async onPaymentConfirmed(evt: { projectId: string; sku: string }) {
  const mapSkuToEntitlements: Record<string, string[]> = {
    "UPG_COST_INDEX": ["DP_COST_INDEX"],
    "UPG_BIM_BASIC": ["BIM_VIEWER","BIM_IMPORT"],
    "UPG_BIM_CLASH": ["BIM_CLASH_REPORT"],
    "UPG_ENTITY_INTEL": ["ENTITY_SHORTLIST","ENTITY_SCORE_ACCESS"],
  };

  const ent = mapSkuToEntitlements[evt.sku] ?? [];
  for (const code of ent) {
    await this.prisma.entitlement.create({ data: { projectId: evt.projectId, code, active: true }});
  }

  await this.prob.append("SYS","SYS","EVT_ENTITLEMENTS_GRANTED",{ projectId: evt.projectId, sku: evt.sku, entitlements: ent });
}

Ce que ce bloc clôt (par rapport au mémo)

✅ Cost Intelligence (5D) : collecte + index + data product + disclaimers non-devis + upgrade-only

✅ BIM Engine : IFC → objets → dimensions 4D/5D/6D → clashes rules-first + logs

✅ Entity Intelligence : entités sans compte + statuts + liens projet + scoring preuve>réputation + RGPD minimisation

✅ Anti-désintermédiation : détection backend + logs + escalade possible

✅ Entitlements : activation strictement par paiement
```



---

## SOURCE — TOME 4 — V1.0 (extension) — BLOC SUIVANT security et legal core data seeding matching investisseur foncier monteisation contrxtuelle anti export.txt

```text
TOME 4 — V1.0 (extension) — BLOC FINAL
SECURITY & LEGAL CORE + DATA SEEDING (owner/op) + MATCHING INVESTISSEUR↔FONCIER (signal-only) + MONÉTISATION CONTEXTUELLE (SKU→Entitlements) + Anti-export
31) SECURITY & LEGAL CORE — preuve, souveraineté, continuité (WORM + audit + 3-2-1)
31.1 Règles doctrinales (Tome 0/1/3 + Mémo XVI)

Append-only : aucune suppression d’un élément probatoire (logs, PV, preuves, reçus, versions).

WORM logique : “Write Once Read Many” au niveau applicatif (même si le stockage cloud ne le garantit pas nativement).

3-2-1 renforcé : 3 copies / 2 supports / 1 hors-ligne (cold copy).

Chiffrement :

en transit (TLS),

au repos (S3 SSE + DB encryption si possible),

clé séparée (KMS / Vault).

Souveraineté : backup exportable + migration possible sans dépendance prestataire.

Data minimization sur PMI / entités non vérifiées + opt-out global.

31.2 DB — audit trail immuable + chaîne de hash
-- logs probatoires: append-only + chain hashing (tamper-evident)
CREATE TABLE logs_probatoires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_type TEXT NOT NULL,     -- SYS/IA/OP/CLT/ENT
  actor_id UUID,
  event_type TEXT NOT NULL,     -- EVT_...
  project_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  prev_hash TEXT,
  hash TEXT NOT NULL
);

CREATE INDEX idx_logs_project_ts ON logs_probatoires(project_id, ts);

31.3 Code — ProbativeService (hash chaining + append-only)
// apps/api/src/modules/probative/probative.service.ts
import crypto from "crypto";

type ActorType = "SYS" | "IA" | "OP" | "CLT" | "ENT";

export class ProbativeService {
  constructor(private prisma: any, private secret: string) {}

  private sha(payload: string) {
    return crypto.createHmac("sha256", this.secret).update(payload).digest("hex");
  }

  async append(actorType: ActorType, actorId: string | null, eventType: string, payload: any, projectId?: string | null) {
    const last = await this.prisma.logs_probatoires.findFirst({
      where: projectId ? { project_id: projectId } : undefined,
      orderBy: { ts: "desc" },
      select: { hash: true }
    });

    const prevHash = last?.hash ?? null;
    const body = JSON.stringify({
      ts: new Date().toISOString(),
      actorType,
      actorId,
      eventType,
      projectId: projectId ?? null,
      payload,
      prevHash
    });

    const hash = this.sha(body);

    await this.prisma.logs_probatoires.create({
      data: {
        actor_type: actorType,
        actor_id: actorId,
        event_type: eventType,
        project_id: projectId ?? null,
        payload,
        prev_hash: prevHash,
        hash
      }
    });

    return { ok: true, hash };
  }
}

31.4 Storage — règles WORM logiques (fichiers preuves)

Chaque fichier uploadé devient FileObject avec :

sha256,

version,

owner (projectId ou geoDocId),

statut ACTIVE,

interdiction d’écraser: nouvelle version seulement.

model FileObject {
  id        String @id @default(uuid())
  bucketKey String
  sha256    String
  size      Int
  mime      String
  version   Int @default(1)
  ownerType String // PROJECT / GEODOC / ENTITY / COST / ...
  ownerId   String
  status    String @default("ACTIVE")
  createdAt DateTime @default(now())

  @@index([ownerType, ownerId])
  @@unique([bucketKey, version])
}

32) DATA SEEDING — UI/Workflows opérateurs (sans dossier) + Data Products (jamais livrables bruts)
32.1 Règles (Mémo IV + III + XV)

Seeding autorisé uniquement pour :

OWNER

OP (opérateur mandaté)

Une donnée seedée = actif interne.

Le client n’achète jamais “la base” → il achète un Data Product contextuel (score/rapport/indice).

32.2 Rôles & permissions (RBAC minimal)
model User {
  id        String @id @default(uuid())
  email     String @unique
  role      String // OWNER / OP / AUDITOR / SUPPORT
  status    String @default("ACTIVE")
  createdAt DateTime @default(now())
}

model PermissionGrant {
  id      String @id @default(uuid())
  userId  String
  perm    String // SEED_DATA / PUBLISH_PRODUCT / VIEW_AUDIT / ...
  scope   String // GLOBAL / GEO / MODULE
}

32.3 Data Lake (brut) vs Data Products (exploitable)
model DataLakeItem {
  id          String @id @default(uuid())
  domain      String // LAND_PRICE / MATERIAL_PRICE / SALES_REF / ...
  geoId       String?
  raw         Json
  sourceType  String // SEED / PROJECT / OBSERVED
  confidence  Int @default(50)
  createdBy   String // userId (OWNER/OP) ou SYS
  createdAt   DateTime @default(now())
}

model DataProduct {
  id          String @id @default(uuid())
  productType String // LAND_PRICE_INDEX / MATERIAL_BASKET / INVEST_SCORE / ...
  geoId       String?
  version     Int @default(1)
  payload     Json
  createdAt   DateTime @default(now())
}

32.4 Pipeline de publication (owner/op → produit)
// apps/api/src/modules/data-products/data-products.service.ts
export class DataProductsService {
  constructor(private prisma: any, private prob: ProbativeService) {}

  async publishLandPriceIndex(geoId: string) {
    const items = await this.prisma.dataLakeItem.findMany({
      where: { domain: "LAND_PRICE", geoId }
    });

    // MVP: moyenne pondérée par confidence (pas de stats avancées ici)
    let num = 0, den = 0;
    for (const it of items) {
      const price = Number(it.raw?.price_m2 ?? 0);
      const w = Math.max(1, Number(it.confidence ?? 50));
      num += price * w;
      den += w;
    }
    const index = den ? num / den : null;

    const product = await this.prisma.dataProduct.create({
      data: {
        productType: "LAND_PRICE_INDEX",
        geoId,
        payload: { index, sample: items.length, computedAt: new Date().toISOString() }
      }
    });

    await this.prob.append("SYS", null, "EVT_DATA_PRODUCT_PUBLISHED", { productId: product.id, productType: product.productType, geoId });
    return product;
  }
}

33) COST INTELLIGENCE ENGINE — prix matériaux/produits/services (5D) + disclaimers “non devis”
33.1 Règles (Mémo IX + Tome 3 disclaimers)

Les prix sont des signaux et indices.

Vente uniquement contextuelle : pour une décision (pack), jamais export brut illimité.

Clause obligatoire : “non contractuel / non devis / dépend disponibilité / région / timing”.

33.2 Domaines Data Lake

MATERIAL_PRICE, SERVICE_PRICE, LABOR_RATE, EQUIPMENT_RENTAL, LOGISTICS_COST

33.3 Produit exemple

MATERIAL_BASKET_INDEX (panier “béton/acier/ciment/bois/alu…” par région/province)

34) MATCHING ENGINE — Investisseur ↔ terrain ↔ projets compatibles (SUGGESTION-ONLY)
34.1 Règles (Mémo + Tome 3 P4 exposition maîtrisée)

Le moteur ne met jamais en relation directe hors CITURBAREA.

Le moteur génère :

des candidatures,

des compatibility scores,

des shortlists.

Activation = paiement (upgrade).

Final = validation humaine (OP/OWNER) + disclaimers.

34.2 DB — objets canoniques
model LandAsset {
  id        String @id @default(uuid())
  geoId     String
  ownerType String // LANDOWNER / BROKER / ENTITY
  ownerRef  String // id interne (pas d’email tel exposé)
  surface   Float
  approxLoc Json // zone large (pas adresse)
  docsRef   Json?
  status    String @default("UNVERIFIED") // UNVERIFIED/VERIFIED/EXPOSED
  createdAt DateTime @default(now())
}

model InvestorProfile {
  id        String @id @default(uuid())
  geoFocus  Json // régions/provinces/communes
  ticketMin Float
  ticketMax Float
  riskMode  String // CONSERVATIVE/BALANCED/AGGRESSIVE
  preferences Json // usage, typologie, horizon
  status    String @default("UNVERIFIED")
  createdAt DateTime @default(now())
}

model MatchSuggestion {
  id          String @id @default(uuid())
  landId      String
  investorId  String
  score       Int
  reasons     Json
  status      String @default("SUGGESTED") // SUGGESTED/REQUESTED/PAID/APPROVED/REJECTED
  createdAt   DateTime @default(now())
}

34.3 Scoring “rules-first” (simple, transparent)
// apps/api/src/modules/matching/matching.service.ts
export class MatchingService {
  constructor(private prisma: any, private prob: ProbativeService) {}

  private score(land: any, inv: any) {
    let s = 0;
    // ticket fit
    const est = Number(land?.surface ?? 0) * Number(land?.approxLoc?.priceHint ?? 0);
    if (est && est >= inv.ticketMin && est <= inv.ticketMax) s += 40;

    // geo fit
    const geoOk = (inv.geoFocus?.geoIds ?? []).includes(land.geoId);
    if (geoOk) s += 30;

    // doc readiness
    const docCount = Array.isArray(land.docsRef) ? land.docsRef.length : 0;
    if (docCount >= 2) s += 15;

    // status
    if (land.status === "VERIFIED") s += 15;

    return Math.max(0, Math.min(100, s));
  }

  async buildSuggestions(batchSize = 200) {
    const lands = await this.prisma.landAsset.findMany({ take: batchSize });
    const invs  = await this.prisma.investorProfile.findMany({ take: batchSize });

    for (const land of lands) {
      for (const inv of invs) {
        const score = this.score(land, inv);
        if (score >= 70) {
          await this.prisma.matchSuggestion.create({
            data: { landId: land.id, investorId: inv.id, score, reasons: { geo: true, ticket: true }, status: "SUGGESTED" }
          });
        }
      }
    }

    await this.prob.append("SYS", null, "EVT_MATCH_SUGGESTIONS_BUILT", { lands: lands.length, investors: invs.length });
  }
}

34.4 Activation “Pay-to-Advance” (Tome 3 E4.x→E6.x→E8.x)

SUGGESTED (interne) → REQUESTED (client/landowner demande)

REQUESTED → PAID via SKU “MATCH_REVIEW”

PAID → APPROVED (OP/OWNER) ou rejet

APPROVED déclenche exposition maîtrisée (P4-E10.4) avec messagerie interne

35) MONÉTISATION CONTEXTUELLE — SKU → Entitlements → gates (feature flags)
35.1 Règles (Mémo XV + Tome 3 paiements comme états)

Pas de pricing public obligatoire, mais SKU interne standardisé.

Un paiement crée une capacité (entitlement) attachée à :

un projectId, ou

un geoId, ou

un assetId (terrain), ou

une fenêtre temporelle.

35.2 DB — SKUs + entitlements
model Sku {
  id        String @id @default(uuid())
  code      String @unique // P1_MIN / P3_MOD_BASE / LAND_PRICE_INDEX / MATCH_REVIEW / ...
  name      String
  scopeType String // PROJECT/GEO/ASSET/TIME
  meta      Json
  active    Boolean @default(true)
}

model Entitlement {
  id        String @id @default(uuid())
  skuCode   String
  ownerType String // CLT/ENT/OP/OWNER
  ownerId   String
  scopeType String
  scopeId   String?
  validFrom DateTime @default(now())
  validTo   DateTime?
  status    String @default("ACTIVE")
}

35.3 Guard d’accès (backend uniquement)
// apps/api/src/modules/billing/entitlement.guard.ts
export class EntitlementGuard {
  constructor(private prisma: any) {}

  async requireEntitlement(ownerType: string, ownerId: string, skuCode: string, scopeType?: string, scopeId?: string) {
    const now = new Date();
    const ent = await this.prisma.entitlement.findFirst({
      where: {
        ownerType, ownerId, skuCode, status: "ACTIVE",
        ...(scopeType ? { scopeType } : {}),
        ...(scopeId ? { scopeId } : {}),
        OR: [{ validTo: null }, { validTo: { gt: now } }]
      }
    });
    if (!ent) throw new Error("ENTITLEMENT_REQUIRED");
    return ent;
  }
}

36) ANTI-EXPORT / Anti-capture — rate limiting + agrégation minimale + watermark
36.1 Règles (Mémo X + XVI)

Interdiction d’export brut massif (API & UI).

Toute donnée “vendable” est agrégée, limitée, contextualisée.

Watermark sur rapports/PDF/exports autorisés.

Query limiter : plafond par jour, par SKU, par scope.

36.2 DB — quotas + usage
model UsageMeter {
  id        String @id @default(uuid())
  ownerType String
  ownerId   String
  skuCode   String
  scopeId   String?
  day       String // YYYY-MM-DD
  count     Int @default(0)

  @@unique([ownerType, ownerId, skuCode, scopeId, day])
}

36.3 Middleware quota (exemple)
// apps/api/src/modules/rate/usage.service.ts
export class UsageService {
  constructor(private prisma: any) {}

  private dayKey(d = new Date()) {
    return d.toISOString().slice(0,10);
  }

  async bump(ownerType: string, ownerId: string, skuCode: string, scopeId: string | null, limit: number) {
    const day = this.dayKey();
    const row = await this.prisma.usageMeter.upsert({
      where: { ownerType_ownerId_skuCode_scopeId_day: { ownerType, ownerId, skuCode, scopeId, day } },
      update: { count: { increment: 1 } },
      create: { ownerType, ownerId, skuCode, scopeId, day, count: 1 }
    });
    if (row.count > limit) throw new Error("RATE_LIMIT_EXCEEDED");
  }
}

37) LIVRABLES CONCRETS — où “on voit le projet” (alignement Tomes 1→4)

Tome 3 : définit les livrables par porte (plans, rapports, PV, exposition maîtrisée, etc.) en états E8/E10/E11.

Tome 4 : rend ces livrables codables :

formats (PDF/IFC/images),

stockage/versioning,

watermark,

entitlements,

états + preuves.

👉 Donc : le “projet concret” apparaît dans :

Tome 3 (définition normative et tunnel),

Tome 4 (implémentation exécutable + génération/archivage).

CHECK FINAL — couverture du mémo (ce qui manquait est maintenant “implémentable”)

✅ Sécurité/continuité probatoire (append-only + hash chain + 3-2-1)
✅ Data seeding owner/op + Data Lake vs Data Products
✅ Cost intelligence (5D) + disclaimers non-devis
✅ Matching investisseur/terrain : suggestion-only + activation payée + validation humaine
✅ Monetization contextuelle (SKU→Entitlements)
✅ Anti-export / rate limiting / watermark
```

---

# ANNEXE — PROTOCOLE MULTI‑AGENTS IA (Claude/GPT/etc.) — INTÉGRATION PROJET

> Objectif: permettre à plusieurs IA de développer **par fragments**, sans casser la doctrine ni introduire du “code intuitif”.

## 1) Règle d’or (déjà en doctrine)
- **Aucun agent IA ne modifie l’état DB directement.**
- Toute proposition IA est un **artefact** (JSON/texte/code) qui passe par:
  - validation backend
  - tests
  - logs probatoires
  - incident si violation

## 2) Contrat d’entrée unique pour les IA
Chaque IA doit recevoir un paquet “ContextPack” minimal :

```json
{
  "tome": "T0|T1|T2|T3|T4|T@",
  "scope": "module précis (ex: EntitlementGuard, PMS, GeoCompleteness)",
  "rule_ids": ["..."],
  "db_models": ["..."],
  "endpoints": ["..."],
  "constraints": [
    "Upgrade-only",
    "Front zero business logic",
    "State machine first",
    "No raw data exposure"
  ],
  "acceptance_tests": ["..."]
}
```

## 3) Sortie attendue d’un agent IA
- **Patch** (code) + **tests** + **notes d’opération**.
- Toute sortie doit contenir:
  - `rule_id` ciblés
  - fichiers modifiés
  - migration Prisma si besoin
  - tests Jest/e2e
  - “rollback plan”

## 4) Assemblage (humain/OPS)
- 1 agent = 1 PR (ou 1 patch isolé).
- Merge uniquement si:
  - tests passent
  - aucune fuite doctrine (redaction OK)
  - registry.yml mis à jour (rule_id → enforcement → tests)

## 5) Rythme de travail recommandé
- Paralleliser par **modules isolables** :
  - Kernel incidents/redaction
  - Stripe webhooks idempotents
  - State machine + guards
  - Geo core + completeness
  - Storage hashing/versioning
- Ne pas paralleliser ce qui touche:
  - transitions d’état (table unique)
  - entitlements (source de vérité économique)

## 6) “Definition of Done” (DoD) pour un fragment
- Code + tests
- Registry à jour
- Incident/redaction couverts
- Logs probatoires append-only
- Front inchangé (state-driven)

---

