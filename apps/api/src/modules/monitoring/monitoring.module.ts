import { Module } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { TelegramService } from "./telegram.service";
import { NotificationsService } from "./notifications.service";
import { ReportsService } from "./reports.service";
import { MonitoringController } from "./monitoring.controller";

/**
 * MonitoringModule — supervision & rapports (Sprint monitoring-notifications).
 *
 * B1 : analytics visites via Umami (AnalyticsService + endpoint lecture OPS).
 * B2 : notifications instantanées dossier (TelegramService + NotificationsService,
 *      listener event-driven `owner.DOSSIER_CREATED`).
 * B3 : rapport QUOTIDIEN visites (ReportsService, cron + endpoint test).
 * B4 (à venir) : rapport hebdo SEO/GEO.
 *
 * Module transverse (non-tome), enregistré dans app.module.ts. EmailModule est
 * global (EmailService injectable directement). EventEmitterModule.forRoot() et
 * ScheduleModule.forRoot() sont enregistrés dans app.module.ts → @OnEvent / @Cron OK.
 */
@Module({
  controllers: [MonitoringController],
  providers: [AnalyticsService, TelegramService, NotificationsService, ReportsService],
  exports: [AnalyticsService, TelegramService],
})
export class MonitoringModule {}
