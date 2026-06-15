import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { AnalyticsService, CASABLANCA_TZ, UmamiMetricItem } from "./analytics.service";
import { TelegramService } from "./telegram.service";
import { EmailService } from "../email/email.service";
import { CrawlHealthService, CrawlHealthReport } from "./crawl-health.service";
import { SearchConsoleService, GscResult } from "./search-console.service";
import { casablancaDayWindow, weekWindows } from "./date-windows";

/**
 * ReportsService — rapports périodiques envoyés sur Email + Telegram.
 *
 * B3 : rapport QUOTIDIEN des visites de la veille.
 *   - Cron REPORT_DAILY_CRON (défaut "0 8 * * *", TZ Africa/Casablanca).
 *   - Désactivable via REPORT_DAILY_ENABLED=false.
 * B4 (à venir) : rapport hebdomadaire SEO/GEO.
 *
 * Les canaux respectent les flags NOTIFY_EMAIL_ENABLED / NOTIFY_TELEGRAM_ENABLED.
 * Chaque canal est isolé (un échec n'impacte pas l'autre, jamais bloquant).
 *
 * NB : le cron est déclaré statiquement avec process.env.REPORT_DAILY_CRON lu au
 * démarrage (limitation @Cron). Le garde REPORT_DAILY_ENABLED est vérifié à
 * l'exécution pour permettre l'activation/désactivation sans toucher au code.
 */
@Injectable()
export class ReportsService {
  private readonly log = new Logger("ReportsService");

  constructor(
    private readonly analytics: AnalyticsService,
    private readonly telegram: TelegramService,
    private readonly email: EmailService,
    private readonly crawl: CrawlHealthService,
    private readonly gsc: SearchConsoleService,
  ) {}

  // ── Flags ─────────────────────────────────────────────────────

  private flag(name: string, defaultOn = true): boolean {
    const raw = process.env[name];
    if (raw == null || raw.trim() === "") return defaultOn;
    return !["false", "0", "no", "off"].includes(raw.trim().toLowerCase());
  }

  // ── Cron quotidien ────────────────────────────────────────────

  @Cron(process.env.REPORT_DAILY_CRON || "0 8 * * *", {
    name: "monitoring-daily-report",
    timeZone: CASABLANCA_TZ,
  })
  async dailyCron(): Promise<void> {
    if (!this.flag("REPORT_DAILY_ENABLED")) {
      this.log.debug("[Daily] REPORT_DAILY_ENABLED=false — skip");
      return;
    }
    this.log.log("[Daily] déclenchement cron rapport quotidien");
    await this.runDaily().catch((e) => this.log.error(`[Daily] échec: ${e?.message}`));
  }

  // ── Rapport quotidien (veille) ────────────────────────────────

  /** Construit + envoie le rapport de la veille. Retourne un résumé pour l'endpoint test. */
  async runDaily(): Promise<{ ok: boolean; configured: boolean; sent?: { email: boolean; telegram: boolean }; error?: string }> {
    if (!this.analytics.isConfigured()) {
      this.log.warn("[Daily] Umami non configuré — rapport non généré");
      return { ok: false, configured: false, error: "Umami non configuré" };
    }
    const { startMs, endMs } = casablancaDayWindow(new Date(), -1); // la veille
    const dayLabel = new Date(startMs).toLocaleDateString("fr-MA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: CASABLANCA_TZ,
    });

    try {
      const [stats, topPages, topSources, topCountries] = await Promise.all([
        this.analytics.getStats(startMs, endMs),
        this.analytics.getMetrics("url", startMs, endMs, 5),
        this.analytics.getMetrics("referrer", startMs, endMs, 5),
        this.analytics.getMetrics("country", startMs, endMs, 3),
      ]);

      const data = { dayLabel, stats, topPages, topSources, topCountries };
      const text = this.dailyText(data);
      const html = this.dailyHtml(data);
      const sent = await this.dispatch(`📊 Visites CITURBAREA — ${dayLabel}`, text, html);
      return { ok: true, configured: true, sent };
    } catch (e: any) {
      this.log.error(`[Daily] erreur Umami: ${e?.message}`);
      return { ok: false, configured: true, error: e?.message };
    }
  }

  // ── Mise en forme ─────────────────────────────────────────────

  private dailyText(d: {
    dayLabel: string;
    stats: { visitors: number; pageviews: number; visits: number };
    topPages: UmamiMetricItem[];
    topSources: UmamiMetricItem[];
    topCountries: UmamiMetricItem[];
  }): string {
    const list = (items: UmamiMetricItem[]) =>
      items.length
        ? items.map((it, i) => `  ${i + 1}. ${it.key} — ${it.count}`).join("\n")
        : "  (aucune donnée)";
    return [
      `📊 <b>Rapport visites — ${escTg(d.dayLabel)}</b>`,
      "",
      `👤 Visiteurs uniques : <b>${d.stats.visitors}</b>`,
      `📄 Pages vues : <b>${d.stats.pageviews}</b>`,
      `🔁 Sessions : <b>${d.stats.visits}</b>`,
      "",
      "🔝 <b>Top pages</b>",
      escTg(list(d.topPages)),
      "",
      "🌐 <b>Top sources</b>",
      escTg(list(d.topSources)),
      "",
      "🗺️ <b>Pays</b>",
      escTg(list(d.topCountries)),
    ].join("\n");
  }

  private dailyHtml(d: {
    dayLabel: string;
    stats: { visitors: number; pageviews: number; visits: number };
    topPages: UmamiMetricItem[];
    topSources: UmamiMetricItem[];
    topCountries: UmamiMetricItem[];
  }): string {
    return `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:600px;margin:0 auto;color:#0f172a;">
        <h2 style="color:#0B1B3A;margin:0 0 4px;">📊 Rapport visites</h2>
        <p style="color:#64748b;margin:0 0 20px;text-transform:capitalize;">${escHtml(d.dayLabel)}</p>
        <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
          ${kpi("Visiteurs uniques", d.stats.visitors)}
          ${kpi("Pages vues", d.stats.pageviews)}
          ${kpi("Sessions", d.stats.visits)}
        </div>
        ${rankBlock("🔝 Top pages", d.topPages)}
        ${rankBlock("🌐 Top sources", d.topSources)}
        ${rankBlock("🗺️ Pays", d.topCountries)}
      </div>`;
  }

  // ── Cron hebdomadaire ─────────────────────────────────────────

  @Cron(process.env.REPORT_WEEKLY_CRON || "0 8 * * 1", {
    name: "monitoring-weekly-report",
    timeZone: CASABLANCA_TZ,
  })
  async weeklyCron(): Promise<void> {
    if (!this.flag("REPORT_WEEKLY_ENABLED")) {
      this.log.debug("[Weekly] REPORT_WEEKLY_ENABLED=false — skip");
      return;
    }
    this.log.log("[Weekly] déclenchement cron rapport hebdo SEO/GEO");
    await this.runWeekly().catch((e) => this.log.error(`[Weekly] échec: ${e?.message}`));
  }

  // ── Rapport hebdo SEO/GEO ─────────────────────────────────────

  /**
   * Rapport hebdomadaire :
   *  - VISITES : semaine écoulée (J-7→J-1) vs semaine précédente (variation %),
   *    top pages, top sources.
   *  - CRAWLABILITÉ : audit serveur des URLs prioritaires (garde-fou rendu).
   *  - SEO GSC (optionnel) : impressions/clics/position/top requêtes si activé.
   */
  async runWeekly(): Promise<{
    ok: boolean;
    visitsConfigured: boolean;
    crawlScore: number;
    sent?: { email: boolean; telegram: boolean };
    error?: string;
  }> {
    const now = new Date();
    const { current, previous } = weekWindows(now);

    // Volet VISITES (dégrade si Umami absent) ----------------------
    let visits: {
      configured: boolean;
      cur?: { visitors: number; pageviews: number; visits: number };
      prev?: { visitors: number; pageviews: number; visits: number };
      topPages?: UmamiMetricItem[];
      topSources?: UmamiMetricItem[];
    } = { configured: false };
    if (this.analytics.isConfigured()) {
      try {
        const [cur, prev, topPages, topSources] = await Promise.all([
          this.analytics.getStats(current.startMs, current.endMs),
          this.analytics.getStats(previous.startMs, previous.endMs),
          this.analytics.getMetrics("url", current.startMs, current.endMs, 5),
          this.analytics.getMetrics("referrer", current.startMs, current.endMs, 5),
        ]);
        visits = { configured: true, cur, prev, topPages, topSources };
      } catch (e: any) {
        this.log.error(`[Weekly] Umami: ${e?.message}`);
      }
    }

    // Volet CRAWLABILITÉ -------------------------------------------
    const crawl = await this.crawl.run();

    // Volet GSC (optionnel) ----------------------------------------
    const fromDate = isoDate(current.startMs);
    const toDate = isoDate(current.endMs);
    const gsc = await this.gsc.fetch(fromDate, toDate, 10);

    const weekLabel = `${new Date(current.startMs).toLocaleDateString("fr-MA", {
      day: "numeric",
      month: "short",
      timeZone: CASABLANCA_TZ,
    })} → ${new Date(current.endMs).toLocaleDateString("fr-MA", {
      day: "numeric",
      month: "short",
      timeZone: CASABLANCA_TZ,
    })}`;

    const data = { weekLabel, visits, crawl, gsc };
    const text = this.weeklyText(data);
    const html = this.weeklyHtml(data);
    const sent = await this.dispatch(`📈 Hebdo SEO/GEO CITURBAREA — ${weekLabel}`, text, html);
    return {
      ok: true,
      visitsConfigured: visits.configured,
      crawlScore: crawl.score,
      sent,
    };
  }

  // ── Mise en forme hebdo ───────────────────────────────────────

  private weeklyText(d: WeeklyData): string {
    const lines: string[] = [`📈 <b>Hebdo SEO/GEO — ${escTg(d.weekLabel)}</b>`, ""];

    // Visites
    if (d.visits.configured && d.visits.cur && d.visits.prev) {
      const v = d.visits;
      lines.push(
        "👥 <b>Visites (vs semaine préc.)</b>",
        `  Visiteurs : <b>${v.cur!.visitors}</b> (${variation(v.cur!.visitors, v.prev!.visitors)})`,
        `  Pages vues : <b>${v.cur!.pageviews}</b> (${variation(v.cur!.pageviews, v.prev!.pageviews)})`,
        `  Sessions : <b>${v.cur!.visits}</b> (${variation(v.cur!.visits, v.prev!.visits)})`,
        "",
        "🔝 <b>Top pages</b>",
        escTg(rankText(v.topPages || [])),
        "",
        "🌐 <b>Top sources</b>",
        escTg(rankText(v.topSources || [])),
        "",
      );
    } else {
      lines.push("👥 Visites : Umami non configuré", "");
    }

    // Crawlabilité
    lines.push(
      `🩺 <b>Santé crawlabilité : ${d.crawl.score}/100</b> (${d.crawl.passed}/${d.crawl.total} OK)`,
    );
    if (d.crawl.failing.length) {
      lines.push("  ⚠️ <b>URLs en échec :</b>");
      for (const f of d.crawl.failing.slice(0, 8)) {
        lines.push(escTg(`  • ${shortUrl(f.url)} — ${f.failedChecks.join(", ")}`));
      }
    } else if (d.crawl.configured) {
      lines.push("  ✅ Toutes les URLs prioritaires sont saines.");
    }
    lines.push("");

    // GSC
    if (d.gsc.enabled) {
      lines.push(
        "🔍 <b>Search Console</b>",
        `  Impressions : <b>${d.gsc.impressions}</b> · Clics : <b>${d.gsc.clicks}</b>`,
        `  CTR : ${d.gsc.ctr}% · Position moy. : ${d.gsc.position}`,
        "  Top requêtes :",
        escTg(
          d.gsc.topQueries
            .slice(0, 5)
            .map((q, i) => `  ${i + 1}. ${q.query} — ${q.clicks} clics / ${q.impressions} impr.`)
            .join("\n") || "  (aucune)",
        ),
      );
    } else {
      lines.push(`🔍 Search Console : désactivé (${escTg(d.gsc.reason)})`);
    }
    return lines.join("\n");
  }

  private weeklyHtml(d: WeeklyData): string {
    const visitsBlock =
      d.visits.configured && d.visits.cur && d.visits.prev
        ? `<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
            ${kpiDelta("Visiteurs", d.visits.cur!.visitors, d.visits.prev!.visitors)}
            ${kpiDelta("Pages vues", d.visits.cur!.pageviews, d.visits.prev!.pageviews)}
            ${kpiDelta("Sessions", d.visits.cur!.visits, d.visits.prev!.visits)}
          </div>
          ${rankBlock("🔝 Top pages", d.visits.topPages || [])}
          ${rankBlock("🌐 Top sources", d.visits.topSources || [])}`
        : `<p style="color:#94a3b8;">Visites : Umami non configuré.</p>`;

    const crawlColor = d.crawl.score >= 90 ? "#16a34a" : d.crawl.score >= 70 ? "#d97706" : "#dc2626";
    const failingRows = d.crawl.failing.length
      ? `<ul style="margin:6px 0;padding-left:18px;color:#dc2626;font-size:13px;">${d.crawl.failing
          .slice(0, 12)
          .map((f) => `<li>${escHtml(shortUrl(f.url))} — ${escHtml(f.failedChecks.join(", "))}</li>`)
          .join("")}</ul>`
      : d.crawl.configured
        ? `<p style="color:#16a34a;font-size:13px;">✅ Toutes les URLs prioritaires sont saines.</p>`
        : `<p style="color:#94a3b8;font-size:13px;">Aucune URL prioritaire configurée.</p>`;

    const gscBlock = d.gsc.enabled
      ? `<div style="display:flex;gap:12px;margin:8px 0 12px;flex-wrap:wrap;">
          ${kpi("Impressions", d.gsc.impressions)}
          ${kpi("Clics", d.gsc.clicks)}
          ${kpi("CTR %", d.gsc.ctr)}
          ${kpi("Position moy.", d.gsc.position)}
        </div>
        <ul style="list-style:none;padding:0;margin:0;font-size:13px;">
          ${d.gsc.topQueries
            .slice(0, 10)
            .map(
              (q) =>
                `<li style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #f1f5f9;"><span>${escHtml(
                  q.query,
                )}</span><strong>${q.clicks} clics · pos ${q.position}</strong></li>`,
            )
            .join("")}
        </ul>`
      : `<p style="color:#94a3b8;font-size:13px;">Search Console désactivé (${escHtml(d.gsc.reason)}).</p>`;

    return `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:640px;margin:0 auto;color:#0f172a;">
        <h2 style="color:#0B1B3A;margin:0 0 4px;">📈 Rapport hebdomadaire SEO/GEO</h2>
        <p style="color:#64748b;margin:0 0 20px;">${escHtml(d.weekLabel)}</p>
        <h3 style="margin:16px 0 8px;">👥 Visites (semaine vs précédente)</h3>
        ${visitsBlock}
        <h3 style="margin:22px 0 6px;">🩺 Santé crawlabilité —
          <span style="color:${crawlColor};">${d.crawl.score}/100</span>
          <span style="font-weight:400;color:#64748b;font-size:13px;">(${d.crawl.passed}/${d.crawl.total} OK)</span>
        </h3>
        ${failingRows}
        <h3 style="margin:22px 0 6px;">🔍 Search Console</h3>
        ${gscBlock}
      </div>`;
  }

  // ── Dispatch multi-canal (réutilisé par B4) ───────────────────

  /** Envoie un rapport sur Email + Telegram selon les flags. Jamais bloquant. */
  async dispatch(
    subject: string,
    telegramText: string,
    emailHtml: string,
  ): Promise<{ email: boolean; telegram: boolean }> {
    const result = { email: false, telegram: false };
    await Promise.allSettled([
      (async () => {
        if (!this.flag("NOTIFY_TELEGRAM_ENABLED")) return;
        const r = await this.telegram.sendMessage(telegramText, "HTML");
        result.telegram = r.ok;
        if (!r.ok && !r.skipped) this.log.warn(`[Report] Telegram échec: ${r.error}`);
      })(),
      (async () => {
        if (!this.flag("NOTIFY_EMAIL_ENABLED")) return;
        const to =
          process.env.NOTIFY_EMAIL_TO ||
          process.env.OWNER_EMAIL ||
          process.env.LEAD_NOTIFY_TO ||
          process.env.ALERT_EMAIL_TO ||
          "";
        if (!to) {
          this.log.warn("[Report] Email skip — aucun destinataire");
          return;
        }
        const r = await this.email.send({ to, subject, html: emailHtml });
        result.email = r.ok;
        if (!r.ok) this.log.warn(`[Report] Email échec: ${r.error}`);
      })(),
    ]);
    return result;
  }
}

// ── Helpers de rendu ────────────────────────────────────────────

function kpi(label: string, value: number): string {
  return `<div style="flex:1;min-width:140px;background:#f1f5f9;border-radius:10px;padding:14px 16px;">
    <div style="font-size:26px;font-weight:800;color:#0B1B3A;">${value}</div>
    <div style="font-size:12px;color:#64748b;">${escHtml(label)}</div>
  </div>`;
}

function rankBlock(title: string, items: UmamiMetricItem[]): string {
  const rows = items.length
    ? items
        .map(
          (it) =>
            `<li style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;">
              <span style="color:#334155;overflow:hidden;text-overflow:ellipsis;">${escHtml(it.key)}</span>
              <strong style="color:#0B1B3A;">${it.count}</strong>
            </li>`,
        )
        .join("")
    : `<li style="color:#94a3b8;padding:4px 0;">(aucune donnée)</li>`;
  return `<h3 style="margin:18px 0 6px;font-size:15px;">${escHtml(title)}</h3>
    <ul style="list-style:none;padding:0;margin:0;font-size:14px;">${rows}</ul>`;
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
/** Échappe pour Telegram HTML (les retours ligne et la structure sont déjà posés). */
function escTg(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Helpers hebdo ───────────────────────────────────────────────

type WeeklyData = {
  weekLabel: string;
  visits: {
    configured: boolean;
    cur?: { visitors: number; pageviews: number; visits: number };
    prev?: { visitors: number; pageviews: number; visits: number };
    topPages?: UmamiMetricItem[];
    topSources?: UmamiMetricItem[];
  };
  crawl: CrawlHealthReport;
  gsc: GscResult;
};

/** Variation % lisible entre deux valeurs (gère le 0 → ∞). */
function variation(cur: number, prev: number): string {
  if (prev === 0) return cur === 0 ? "—" : "🆕";
  const pct = Math.round(((cur - prev) / prev) * 100);
  const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "▬";
  return `${arrow} ${pct > 0 ? "+" : ""}${pct}%`;
}

/** Date YYYY-MM-DD (UTC) à partir d'un timestamp ms — format attendu par GSC. */
function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Raccourcit une URL pour l'affichage (retire le protocole + host si long). */
function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search || "/";
  } catch {
    return url;
  }
}

/** Classement en texte brut (Telegram), avant échappement par l'appelant. */
function rankText(items: UmamiMetricItem[]): string {
  return items.length
    ? items.map((it, i) => `  ${i + 1}. ${it.key} — ${it.count}`).join("\n")
    : "  (aucune donnée)";
}

/** KPI avec variation vs semaine précédente (email HTML). */
function kpiDelta(label: string, cur: number, prev: number): string {
  const pct = prev === 0 ? null : Math.round(((cur - prev) / prev) * 100);
  const color = pct == null ? "#64748b" : pct > 0 ? "#16a34a" : pct < 0 ? "#dc2626" : "#64748b";
  const delta = pct == null ? (cur === 0 ? "—" : "🆕") : `${pct > 0 ? "+" : ""}${pct}%`;
  return `<div style="flex:1;min-width:120px;background:#f1f5f9;border-radius:10px;padding:14px 16px;">
    <div style="font-size:24px;font-weight:800;color:#0B1B3A;">${cur}</div>
    <div style="font-size:12px;color:#64748b;">${escHtml(label)}</div>
    <div style="font-size:12px;font-weight:700;color:${color};">${delta}</div>
  </div>`;
}
