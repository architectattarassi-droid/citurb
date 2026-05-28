import { Injectable, Logger } from "@nestjs/common";
import { appendFile, mkdir, readdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type {
  AnalyticsEvent, AnalyticsEventType, PorteId,
  AnalyticsDashboard, PorteKpi, PorteFunnel,
} from "./analytics-hub.types";

const PORTES: PorteId[] = ["P1", "P2", "P3", "P4", "P5", "P6"];

/**
 * AnalyticsHubService — ingestion d'événements en JSONL append-only
 * (rotation quotidienne) + agrégation KPI à la demande.
 *
 * Pas de Prisma (volume potentiellement élevé, append fichier = O(1)).
 * RGPD/Loi 09-08 : sessionId anonyme par défaut, pas d'IP, pas de fingerprint.
 */
@Injectable()
export class AnalyticsHubService {
  private readonly logger = new Logger(AnalyticsHubService.name);
  private readonly dir = join(process.cwd(), "storage", "analytics");

  private fileForToday(): string {
    const day = new Date().toISOString().slice(0, 10);
    return join(this.dir, `events-${day}.jsonl`);
  }

  /** Ingestion fire-and-forget d'un événement. Ne lève jamais. */
  async track(ev: Omit<AnalyticsEvent, "ts">): Promise<void> {
    try {
      if (!existsSync(this.dir)) await mkdir(this.dir, { recursive: true });
      const full: AnalyticsEvent = { ...ev, ts: new Date().toISOString() };
      await appendFile(this.fileForToday(), JSON.stringify(full) + "\n", "utf-8");
    } catch (e: any) {
      this.logger.warn(`track failed: ${e?.message}`);
    }
  }

  /** Charge les events des N derniers jours. */
  private async loadEvents(days: number): Promise<AnalyticsEvent[]> {
    if (!existsSync(this.dir)) return [];
    const cutoff = Date.now() - days * 24 * 3600 * 1000;
    const files = (await readdir(this.dir)).filter((f) => f.startsWith("events-") && f.endsWith(".jsonl"));
    const out: AnalyticsEvent[] = [];
    for (const f of files) {
      const dayStr = f.replace("events-", "").replace(".jsonl", "");
      const dayTs = new Date(dayStr).getTime();
      if (isNaN(dayTs) || dayTs < cutoff - 24 * 3600 * 1000) continue;
      try {
        const content = await readFile(join(this.dir, f), "utf-8");
        for (const line of content.split("\n")) {
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line) as AnalyticsEvent;
            if (new Date(ev.ts).getTime() >= cutoff) out.push(ev);
          } catch { /* skip ligne corrompue */ }
        }
      } catch { /* skip fichier */ }
    }
    return out;
  }

  private pct(num: number, den: number): number {
    return den > 0 ? Math.round((num / den) * 1000) / 10 : 0;
  }

  /** Agrège le dashboard complet des 6 portes. */
  async dashboard(period: "7d" | "30d" | "90d"): Promise<AnalyticsDashboard> {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const events = await this.loadEvents(days);

    const portes: PorteKpi[] = PORTES.map((porte) => {
      const pe = events.filter((e) => e.porte === porte);
      const count = (t: AnalyticsEventType) => pe.filter((e) => e.type === t).length;

      const views = count("view");
      const wizardStarts = count("wizard_start");
      const wizardCompletes = count("wizard_complete");
      const intakeSubmits = count("intake_submit");
      const paymentsInitiated = count("payment_initiated");
      const paymentsReceived = count("payment_received");

      const funnel: PorteFunnel = {
        porte, views, wizardStarts, wizardCompletes, intakeSubmits, paymentsInitiated, paymentsReceived,
        rateViewToStart: this.pct(wizardStarts, views),
        rateStartToComplete: this.pct(wizardCompletes, wizardStarts),
        rateCompleteToSubmit: this.pct(intakeSubmits, wizardCompletes),
        rateSubmitToPaid: this.pct(paymentsReceived, intakeSubmits),
        rateGlobalViewToPaid: this.pct(paymentsReceived, views),
      };

      // GMV = somme value des payment_received
      const gmvMad = pe.filter((e) => e.type === "payment_received").reduce((s, e) => s + (e.value || 0), 0);
      const payeurs = new Set(pe.filter((e) => e.type === "payment_received" && e.userId).map((e) => e.userId));

      // NPS
      const npsEvents = pe.filter((e) => e.type === "nps_response" && typeof e.value === "number");
      const promoters = npsEvents.filter((e) => (e.value || 0) >= 9).length;
      const detractors = npsEvents.filter((e) => (e.value || 0) <= 6).length;
      const npsScore = npsEvents.length > 0 ? Math.round(((promoters - detractors) / npsEvents.length) * 100) : 0;

      // DAU/MAU (sessions uniques)
      const todayStr = new Date().toISOString().slice(0, 10);
      const dau = new Set(pe.filter((e) => e.ts.slice(0, 10) === todayStr).map((e) => e.sessionId)).size;
      const mau = new Set(pe.map((e) => e.sessionId)).size;

      return {
        porte, dau, mau, gmvMad, npsScore, npsResponses: npsEvents.length,
        payeursUniques: payeurs.size,
        arpuMad: payeurs.size > 0 ? Math.round(gmvMad / payeurs.size) : 0,
        funnel,
      };
    });

    const topByGmv = [...portes].sort((a, b) => b.gmvMad - a.gmvMad)[0];
    const topByConv = [...portes].sort((a, b) => b.funnel.rateGlobalViewToPaid - a.funnel.rateGlobalViewToPaid)[0];

    return {
      period,
      generatedAt: new Date().toISOString(),
      totalEvents: events.length,
      portes,
      topPorteByGmv: topByGmv?.gmvMad > 0 ? topByGmv.porte : undefined,
      topPorteByConversion: topByConv?.funnel.rateGlobalViewToPaid > 0 ? topByConv.porte : undefined,
    };
  }
}
