import { Module } from "@nestjs/common";
import { KernelModule } from "../kernel/kernel.module";
import { SousTraitantsController } from "./sous-traitants.controller";
import { SousTraitantsService } from "./sous-traitants.service";
import { EvaluationService } from "./evaluation.service";

/**
 * Sous-Traitants — Module (Tome 3 / P3 — MOD délégué).
 *
 * Voir INTEGRATION.md (routes, MutationGate, i18n keys, import dans tome-3).
 */
@Module({
  imports: [KernelModule], // PrismaService + ProbativeLogService
  controllers: [SousTraitantsController],
  providers: [SousTraitantsService, EvaluationService],
  exports: [SousTraitantsService, EvaluationService],
})
export class SousTraitantsModule {}
