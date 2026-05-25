/**
 * Tome 2 — PV Commission Rokhas — Module
 *
 * Dépendances :
 *  - PrismaModule (lecture/écriture Dossier.payload, à terme PvCommissionRokhas)
 *  - KernelModule (IncidentsService + ProbativeLogService via @Optional dans le workflow)
 *
 * À importer dans `tome-2.module.ts` (cf. INTEGRATION.md).
 */
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../tome-at";
import { KernelModule } from "../../../modules/kernel/kernel.module";
import { Tome5AuthModule } from "../../tome-5/auth/auth.module";
import { PvCommissionController } from "./pv-commission.controller";
import { PvCommissionService } from "./pv-commission.service";
import { PvCommissionParser } from "./pv-commission.parser";
import { PvCommissionWorkflow } from "./pv-commission.workflow";

@Module({
  imports: [PrismaModule, KernelModule, Tome5AuthModule],
  controllers: [PvCommissionController],
  providers: [PvCommissionService, PvCommissionParser, PvCommissionWorkflow],
  exports: [PvCommissionService],
})
export class PvCommissionModule {}
