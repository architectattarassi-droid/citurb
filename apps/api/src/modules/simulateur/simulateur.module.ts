import { Module } from "@nestjs/common";
import { PrismaModule } from "../../tomes/tome-at";
import { MonitoringModule } from "../monitoring/monitoring.module";
import { EstimationPubliqueService } from "./estimation-publique.service";
import { LeadService } from "./lead.service";
import { LeadNotifyListener } from "./lead-notify.listener";
import { SimulateurController } from "./simulateur.controller";

/**
 * SimulateurModule — Tome 0 (capture amont). Simulateur public de coût de
 * construction + capture lead + notification owner.
 *
 * Réutilise :
 *  - BAREME_CNOA_2021 (tome-2/p2) via EstimationPubliqueService — moteur de coût.
 *  - EmailService (module global) + TelegramService (MonitoringModule) — notif owner.
 *  - EventEmitterModule (app.module) — event `lead.created`.
 *  - PrismaService — persistance du modèle Lead.
 *
 * MutationGate allow-list : `/api/simulateur`
 * (cf. apps/api/src/common/guards/mutation-gate.guard.ts).
 *
 * NB : le moteur de nurturing (NurtureService + cron) est ajouté dans une
 * seconde vague (après validation), conformément au plan du sprint.
 */
@Module({
  imports: [PrismaModule, MonitoringModule],
  controllers: [SimulateurController],
  providers: [EstimationPubliqueService, LeadService, LeadNotifyListener],
  exports: [EstimationPubliqueService, LeadService],
})
export class SimulateurModule {}
