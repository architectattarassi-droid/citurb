import { Module } from "@nestjs/common";
import { PvChantierModule } from "../../tome-2/pv-chantier/pv-chantier.module";
import { ProjectCalendarController } from "./project-calendar.controller";
import { ProjectCalendarService } from "./project-calendar.service";

/**
 * ProjectCalendarModule — calendrier projet (Gantt + CPM + tâches) par dossier.
 *
 * Tome 6 — workflows dossiers.
 * PrismaService est exposé en global via PrismaModule (@Global) chargé au
 * niveau du kernel : aucune import explicite nécessaire ici.
 *
 * Import PvChantierModule (tome 2) pour fusionner les PV chantier + cadence
 * dans la timeline unifiée (`getUnifiedTimeline`). Direction descendante
 * (tome 6 → tome 2) conforme à `npm run tome:check`.
 */
@Module({
  imports: [PvChantierModule],
  controllers: [ProjectCalendarController],
  providers: [ProjectCalendarService],
  exports: [ProjectCalendarService],
})
export class ProjectCalendarModule {}
