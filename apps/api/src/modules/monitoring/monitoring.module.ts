import { Module } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { TelegramService } from "./telegram.service";
import { NotificationsService } from "./notifications.service";
import { ReportsService } from "./reports.service";
import { CrawlHealthService } from "./crawl-health.service";
import { SearchConsoleService } from "./search-console.service";
import { MonitoringController } from "./monitoring.controller";

/**
 * MonitoringModule — supervision & rapports (Sprint monitoring-notifications).
 *
 * B1 : analytics visites via Umami (AnalyticsService + endpoint lecture OPS).
 * B2 : notifications instantanées dossier (TelegramService + NotificationsService,
 *      listener event-driven `owner.DOSSIER_CREATED`).
 * B3 : rapport QUOTIDIEN visites (ReportsService, cron + endpoint test).
 * B4 : rapport HEBDO SEO/GEO (visites S vs S-1, crawlabilité, GSC optionnel).
 *
 * Module transverse (non-tome), enregistré dans app.module.ts. EmailModule est
 * global (EmailService injectable directement). EventEmitterModule.forRoot() et
 * ScheduleModule.forRoot() sont enregistrés dans app.module.ts → @OnEvent / @Cron OK.
 */
@Module({
  controllers: [MonitoringController],
  providers: [
    AnalyticsService,
    TelegramService,
    NotificationsService,
    ReportsService,
    CrawlHealthService,
    SearchConsoleService,
  ],
  exports: [AnalyticsService, TelegramService],
})
export class MonitoringModule {}
