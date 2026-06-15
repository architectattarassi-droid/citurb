import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { AnalyticsService, CASABLANCA_TZ, UmamiMetricItem } from "./analytics.service";
import { TelegramService } from "./telegram.service";
import { EmailService } from "../email/email.service";
import { casablancaDayWindow } from "./date-windows";

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
