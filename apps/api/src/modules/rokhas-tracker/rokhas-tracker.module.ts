/**
 * Rokhas Tracker — Module
 *
 * Dépendances :
 *  - PrismaModule       (lecture/écriture Dossier.payload.rokhasTracker)
 *  - KernelModule       (ProbativeLogService + IncidentsService, optionnels via @Optional)
 *  - Tome5AuthModule    (JwtAuthGuard pour les endpoints authentifiés)
 *
 * À importer dans `app.module.ts` (cf. INTEGRATION.md) — pas dans
 * `tome-2.module.ts` car ce module vit sous `apps/api/src/modules/`
 * pour rester indépendant du cycle de release des tomes.
 */
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../tomes/tome-at/kernel/prisma/prisma.module";
import { KernelModule } from "../kernel/kernel.module";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";
import { RokhasTrackerController } from "./rokhas-tracker.controller";
import { RokhasTrackerService } from "./rokhas-tracker.service";

@Module({
  imports: [PrismaModule, KernelModule, Tome5AuthModule],
  controllers: [RokhasTrackerController],
  providers: [RokhasTrackerService],
  exports: [RokhasTrackerService],
})
export class RokhasTrackerModule {}
