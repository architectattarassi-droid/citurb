import { Injectable, Logger } from "@nestjs/common";
import { appendFile, mkdir, readdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type {
  AnalyticsEvent, AnalyticsEventType, PorteId,
  AnalyticsDashboard, PorteKpi, PorteFunnel,
  VisitorsReport, VisitorSession, VisitorDay, PageStat,
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
  // Stocké sur le volume persistant (UPLOADS_DIR) pour survivre aux redéploiements.
  private readonly dir = join(process.env.UPLOADS_DIR || join(process.cwd(), "uploads"), "analytics");

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

  /** Normalise un path : retire query/hash, IDs numériques/UUID → :id (regroupement). */
  private normPath(p?: string): string {
    if (!p) return "(inconnu)";
    let s = p.split("?")[0].split("#")[0];
    if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
    s = s.replace(/\/[0-9a-f]{8}-[0-9a-f-]{20,}/gi, "/:id").replace(/\/\d+/g, "/:id");
    return s || "/";
  }

  /**
   * Suivi des visites : sessions, pages vues, durée, sortie — même sans lead.
   * Reconstruit les sessions à partir des events (view / page_leave / activité).
   */
  async visitors(period: "7d" | "30d" | "90d"): Promise<VisitorsReport> {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const events = await this.loadEvents(days);

    // 1) Regroupe par session
    const bySession = new Map<string, AnalyticsEvent[]>();
    for (const e of events) {
      if (!e.sessionId) continue;
      const arr = bySession.get(e.sessionId);
      if (arr) arr.push(e); else bySession.set(e.sessionId, [e]);
    }

    const sessions: VisitorSession[] = [];
    for (const [sid, evs] of bySession) {
      evs.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
      const views = evs.filter((e) => e.type === "view");
      const first = evs[0].ts;
      const last = evs[evs.length - 1].ts;
      // Durée : somme des temps "page_leave" si dispo, sinon amplitude des events.
      const leaveDur = evs
        .filter((e) => e.type === "page_leave")
        .reduce((s, e) => s + (Number(e.meta?.durationMs) || 0), 0);
      const spanMs = new Date(last).getTime() - new Date(first).getTime();
      const durationSec = Math.round((leaveDur > 0 ? leaveDur : spanMs) / 1000);
      const paths = views.map((e) => this.normPath(e.path));
      sessions.push({
        sessionId: sid,
        userId: evs.find((e) => e.userId)?.userId,
        firstSeen: first,
        lastSeen: last,
        durationSec,
        pageviews: views.length,
        entryPath: paths[0],
        exitPath: paths.length ? paths[paths.length - 1] : this.normPath(evs[evs.length - 1].path),
        paths,
        isLead: evs.some((e) => e.type === "intake_submit"),
      });
    }

    // 2) Daily : visiteurs/pages par jour d'activité ; durée/bounce par jour de début.
    const actByDay = new Map<string, { visitors: Set<string>; pageviews: number }>();
    for (const e of events) {
      const day = e.ts.slice(0, 10);
      const d = actByDay.get(day) || { visitors: new Set<string>(), pageviews: 0 };
      if (e.sessionId) d.visitors.add(e.sessionId);
      if (e.type === "view") d.pageviews++;
      actByDay.set(day, d);
    }
    const startByDay = new Map<string, { durations: number[]; bounces: number; total: number }>();
    for (const s of sessions) {
      const day = s.firstSeen.slice(0, 10);
      const d = startByDay.get(day) || { durations: [], bounces: 0, total: 0 };
      d.durations.push(s.durationSec);
      d.total++;
      if (s.pageviews <= 1) d.bounces++;
      startByDay.set(day, d);
    }
    const allDays = new Set<string>([...actByDay.keys(), ...startByDay.keys()]);
    const daily: VisitorDay[] = [...allDays].sort().map((date) => {
      const a = actByDay.get(date);
      const s = startByDay.get(date);
      const avg = s && s.durations.length ? Math.round(s.durations.reduce((x, y) => x + y, 0) / s.durations.length) : 0;
      return {
        date,
        visitors: a ? a.visitors.size : 0,
        pageviews: a ? a.pageviews : 0,
        avgDurationSec: avg,
        bounceRate: s && s.total ? Math.round((s.bounces / s.total) * 100) : 0,
      };
    });

    // 3) Top pages + uniques
    const pageMap = new Map<string, { views: number; uniq: Set<string> }>();
    for (const e of events) {
      if (e.type !== "view") continue;
      const p = this.normPath(e.path);
      const m = pageMap.get(p) || { views: 0, uniq: new Set<string>() };
      m.views++;
      if (e.sessionId) m.uniq.add(e.sessionId);
      pageMap.set(p, m);
    }
    const topPages: PageStat[] = [...pageMap.entries()]
      .map(([path, m]) => ({ path, views: m.views, uniques: m.uniq.size }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 30);

    // 4) Pages de sortie
    const exitMap = new Map<string, number>();
    for (const s of sessions) {
      if (!s.exitPath) continue;
      exitMap.set(s.exitPath, (exitMap.get(s.exitPath) || 0) + 1);
    }
    const topExitPages: PageStat[] = [...exitMap.entries()]
      .map(([path, count]) => ({ path, views: count, uniques: count }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 15);

    // 5) Sessions récentes (parcours + sortie + quand)
    const recentSessions = [...sessions]
      .sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1))
      .slice(0, 60);

    const totalPv = sessions.reduce((s, x) => s + x.pageviews, 0);
    const durs = sessions.map((s) => s.durationSec);
    const bounces = sessions.filter((s) => s.pageviews <= 1).length;
    const leads = sessions.filter((s) => s.isLead).length;

    return {
      period,
      generatedAt: new Date().toISOString(),
      totals: {
        visitors: bySession.size,
        sessions: sessions.length,
        pageviews: totalPv,
        avgDurationSec: durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : 0,
        bounceRate: sessions.length ? Math.round((bounces / sessions.length) * 100) : 0,
        leads,
      },
      daily,
      topPages,
      topExitPages,
      recentSessions,
    };
  }
}
