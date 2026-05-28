import { Module } from "@nestjs/common";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";
import { AnalyticsHubController } from "./analytics-hub.controller";
import { AnalyticsHubService } from "./analytics-hub.service";

/**
 * AnalyticsHubModule — instrumentation des 6 portes (Tome 0).
 * "Laissons le marché décider" : on mesure conversion + GMV + NPS par porte.
 */
@Module({
  imports: [Tome5AuthModule],
  controllers: [AnalyticsHubController],
  providers: [AnalyticsHubService],
  exports: [AnalyticsHubService],
})
export class AnalyticsHubModule {}
