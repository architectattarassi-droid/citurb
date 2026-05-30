/**
 * lead-funnel.module.ts
 *
 * Module NestJS — Tome 0 (capture & qualification leads).
 *
 * Dépendances :
 *  - EmailService (module global) — envoi accusé + nurture.
 *  - @nestjs/schedule — cron quotidien (déjà importé au niveau AppModule).
 *
 * À ajouter dans `app.module.ts` :
 *   imports: [ …, LeadFunnelModule ]
 *
 * MutationGate allow-list : `/api/lead-funnel`
 * (cf. apps/api/src/common/guards/mutation-gate.guard.ts).
 */

import { Module } from "@nestjs/common";
import { KernelModule } from "../kernel/kernel.module";
import { LeadFunnelController } from "./lead-funnel.controller";
import { LeadFunnelService } from "./lead-funnel.service";
import { LeadNurtureService } from "./lead-nurture.service";

@Module({
  // KernelModule importé pour ProbativeLogService (audit traçable des notifs leads).
  // L'injection se fait via @Optional() côté service donc dégrade gracieusement
  // si jamais l'ordre d'import change.
  imports: [KernelModule],
  controllers: [LeadFunnelController],
  providers: [LeadFunnelService, LeadNurtureService],
  exports: [LeadFunnelService, LeadNurtureService],
})
export class LeadFunnelModule {}
