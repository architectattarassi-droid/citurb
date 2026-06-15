import { Module } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { TelegramService } from "./telegram.service";
import { NotificationsService } from "./notifications.service";
import { MonitoringController } from "./monitoring.controller";

/**
 * MonitoringModule — supervision & rapports (Sprint monitoring-notifications).
 *
 * B1 : analytics visites via Umami (AnalyticsService + endpoint lecture OPS).
 * B2 : notifications instantanées dossier (TelegramService + NotificationsService,
 *      listener event-driven `owner.DOSSIER_CREATED`).
 * B3..B4 (à venir) : rapport quotidien visites, rapport hebdo SEO/GEO.
 *
 * Module transverse (non-tome), enregistré dans app.module.ts. EmailModule est
 * global (EmailService injectable directement). EventEmitterModule.forRoot() est
 * enregistré dans app.module.ts → EventEmitter2 / @OnEvent disponibles ici.
 */
@Module({
  controllers: [MonitoringController],
  providers: [AnalyticsService, TelegramService, NotificationsService],
  exports: [AnalyticsService, TelegramService],
})
export class MonitoringModule {}
