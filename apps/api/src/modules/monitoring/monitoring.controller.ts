import { BadRequestException, Controller, Get, HttpCode, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, Tome } from "../../tomes/tome-at";
import { Roles } from "../../tomes/tome-5/auth/roles.decorator";
import { RolesGuard } from "../../tomes/tome-5/auth/roles.guard";
import { AnalyticsService, UmamiError } from "./analytics.service";
import { ReportsService } from "./reports.service";
import { lastNDaysWindow, parseBoundMs } from "./date-windows";

/**
 * MonitoringController — endpoints internes (OPS/OWNER/ADMIN) de supervision.
 *
 * Monté sous /api/* pour bypasser le fallback SPA (cf. main.ts) et la mutation-gate
 * (allow-list /api/monitoring). B1 n'expose que de la lecture analytics ; les
 * déclencheurs manuels de rapports arrivent en B3/B4.
 */
@Tome("tome9")
@Controller("api/monitoring")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("OPS", "OWNER", "ADMIN")
export class MonitoringController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly reports: ReportsService,
  ) {}

  /**
   * GET /api/monitoring/analytics?from&to
   * Fenêtre par défaut : 7 derniers jours pleins (Casablanca).
   * `from`/`to` acceptent `YYYY-MM-DD`, ISO datetime ou epoch ms.
   */
  @Get("analytics")
  async getAnalytics(@Query("from") from?: string, @Query("to") to?: string) {
    if (!this.analytics.isConfigured()) {
      return {
        ok: false,
        configured: false,
        message:
          "Umami non configuré (UMAMI_BASE_URL / UMAMI_WEBSITE_ID / auth manquants).",
      };
    }

    const now = new Date();
    let startMs = parseBoundMs(from, false);
    let endMs = parseBoundMs(to, true);
    if (from && startMs === null) throw new BadRequestException("`from` invalide");
    if (to && endMs === null) throw new BadRequestException("`to` invalide");
    if (startMs === null || endMs === null) {
      const w = lastNDaysWindow(now, 7);
      startMs = startMs ?? w.startMs;
      endMs = endMs ?? w.endMs;
    }
    if (startMs > endMs) throw new BadRequestException("`from` postérieur à `to`");

    try {
      const [stats, series, topPages, topSources, topCountries] = await Promise.all([
        this.analytics.getStats(startMs, endMs),
        this.analytics.getPageviews(startMs, endMs),
        this.analytics.getMetrics("url", startMs, endMs, 10),
        this.analytics.getMetrics("referrer", startMs, endMs, 10),
        this.analytics.getMetrics("country", startMs, endMs, 10),
      ]);
      return {
        ok: true,
        configured: true,
        window: { from: new Date(startMs).toISOString(), to: new Date(endMs).toISOString() },
        stats,
        series,
        topPages,
        topSources,
        topCountries,
      };
    } catch (e) {
      if (e instanceof UmamiError) {
        return { ok: false, configured: true, error: e.message };
      }
      throw e;
    }
  }

  /**
   * POST /api/monitoring/reports/daily/run
   * Déclenche manuellement le rapport quotidien (visites de la veille) et l'envoie
   * sur Email + Telegram. Utile pour tester sans attendre le cron.
   */
  @Post("reports/daily/run")
  @HttpCode(200)
  async runDailyReport() {
    return this.reports.runDaily();
  }

  /**
   * POST /api/monitoring/reports/weekly/run
   * Déclenche manuellement le rapport hebdo SEO/GEO (visites S vs S-1, santé
   * crawlabilité, Search Console si activé) et l'envoie sur Email + Telegram.
   */
  @Post("reports/weekly/run")
  @HttpCode(200)
  async runWeeklyReport() {
    return this.reports.runWeekly();
  }
}
