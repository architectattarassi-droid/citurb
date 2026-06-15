import { Module } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { MonitoringController } from "./monitoring.controller";

/**
 * MonitoringModule — supervision & rapports (Sprint monitoring-notifications).
 *
 * B1 : analytics visites via Umami (AnalyticsService + endpoint lecture OPS).
 * B2..B4 (à venir) : notifications dossier, rapport quotidien, rapport hebdo SEO/GEO.
 *
 * Module transverse (non-tome), enregistré dans app.module.ts. EmailModule,
 * TwilioModule et NotificationsHubModule sont globaux et déjà disponibles ici.
 */
@Module({
  controllers: [MonitoringController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class MonitoringModule {}
