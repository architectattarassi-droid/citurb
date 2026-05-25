import { Module } from "@nestjs/common";
import { ProjectCalendarController } from "./project-calendar.controller";
import { ProjectCalendarService } from "./project-calendar.service";

/**
 * ProjectCalendarModule — calendrier projet (Gantt + CPM + tâches) par dossier.
 *
 * Tome 6 — workflows dossiers.
 * PrismaService est exposé en global via PrismaModule (@Global) chargé au
 * niveau du kernel : aucune import explicite nécessaire ici.
 */
@Module({
  controllers: [ProjectCalendarController],
  providers: [ProjectCalendarService],
  exports: [ProjectCalendarService],
})
export class ProjectCalendarModule {}
