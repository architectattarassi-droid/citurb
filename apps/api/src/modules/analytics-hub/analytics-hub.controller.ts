import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { AnalyticsHubService } from "./analytics-hub.service";
import type { AnalyticsEvent } from "./analytics-hub.types";

/**
 * AnalyticsHubController — ingestion events (public, fire-and-forget) +
 * dashboard KPI 6 portes (OPS, JWT-gated).
 */
@Tome("tome0")
@Controller("api/analytics-hub")
export class AnalyticsHubController {
  constructor(private readonly svc: AnalyticsHubService) {}

  /** Ingestion publique d'un événement (sendBeacon depuis le front). */
  @Post("event")
  async event(@Body() body: Omit<AnalyticsEvent, "ts">) {
    if (!body?.type || !body?.sessionId) return { ok: false };
    await this.svc.track(body);
    return { ok: true };
  }

  /** Dashboard KPI des 6 portes (OPS). */
  @Get("dashboard")
  @UseGuards(JwtAuthGuard)
  async dashboard(@Query("period") period?: "7d" | "30d" | "90d") {
    const dashboard = await this.svc.dashboard(period || "30d");
    return { ok: true, dashboard };
  }
}
