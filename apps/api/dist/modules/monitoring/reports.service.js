"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const analytics_service_1 = require("./analytics.service");
const telegram_service_1 = require("./telegram.service");
const email_service_1 = require("../email/email.service");
const date_windows_1 = require("./date-windows");
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
let ReportsService = class ReportsService {
    analytics;
    telegram;
    email;
    log = new common_1.Logger("ReportsService");
    constructor(analytics, telegram, email) {
        this.analytics = analytics;
        this.telegram = telegram;
        this.email = email;
    }
    // ── Flags ─────────────────────────────────────────────────────
    flag(name, defaultOn = true) {
        const raw = process.env[name];
        if (raw == null || raw.trim() === "")
            return defaultOn;
        return !["false", "0", "no", "off"].includes(raw.trim().toLowerCase());
    }
    // ── Cron quotidien ────────────────────────────────────────────
    async dailyCron() {
        if (!this.flag("REPORT_DAILY_ENABLED")) {
            this.log.debug("[Daily] REPORT_DAILY_ENABLED=false — skip");
            return;
        }
        this.log.log("[Daily] déclenchement cron rapport quotidien");
        await this.runDaily().catch((e) => this.log.error(`[Daily] échec: ${e?.message}`));
    }
    // ── Rapport quotidien (veille) ────────────────────────────────
    /** Construit + envoie le rapport de la veille. Retourne un résumé pour l'endpoint test. */
    async runDaily() {
        if (!this.analytics.isConfigured()) {
            this.log.warn("[Daily] Umami non configuré — rapport non généré");
            return { ok: false, configured: false, error: "Umami non configuré" };
        }
        const { startMs, endMs } = (0, date_windows_1.casablancaDayWindow)(new Date(), -1); // la veille
        const dayLabel = new Date(startMs).toLocaleDateString("fr-MA", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: analytics_service_1.CASABLANCA_TZ,
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
        }
        catch (e) {
            this.log.error(`[Daily] erreur Umami: ${e?.message}`);
            return { ok: false, configured: true, error: e?.message };
        }
    }
    // ── Mise en forme ─────────────────────────────────────────────
    dailyText(d) {
        const list = (items) => items.length
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
    dailyHtml(d) {
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
    async dispatch(subject, telegramText, emailHtml) {
        const result = { email: false, telegram: false };
        await Promise.allSettled([
            (async () => {
                if (!this.flag("NOTIFY_TELEGRAM_ENABLED"))
                    return;
                const r = await this.telegram.sendMessage(telegramText, "HTML");
                result.telegram = r.ok;
                if (!r.ok && !r.skipped)
                    this.log.warn(`[Report] Telegram échec: ${r.error}`);
            })(),
            (async () => {
                if (!this.flag("NOTIFY_EMAIL_ENABLED"))
                    return;
                const to = process.env.NOTIFY_EMAIL_TO ||
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
                if (!r.ok)
                    this.log.warn(`[Report] Email échec: ${r.error}`);
            })(),
        ]);
        return result;
    }
};
exports.ReportsService = ReportsService;
__decorate([
    (0, schedule_1.Cron)(process.env.REPORT_DAILY_CRON || "0 8 * * *", {
        name: "monitoring-daily-report",
        timeZone: analytics_service_1.CASABLANCA_TZ,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReportsService.prototype, "dailyCron", null);
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService,
        telegram_service_1.TelegramService,
        email_service_1.EmailService])
], ReportsService);
// ── Helpers de rendu ────────────────────────────────────────────
function kpi(label, value) {
    return `<div style="flex:1;min-width:140px;background:#f1f5f9;border-radius:10px;padding:14px 16px;">
    <div style="font-size:26px;font-weight:800;color:#0B1B3A;">${value}</div>
    <div style="font-size:12px;color:#64748b;">${escHtml(label)}</div>
  </div>`;
}
function rankBlock(title, items) {
    const rows = items.length
        ? items
            .map((it) => `<li style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;">
              <span style="color:#334155;overflow:hidden;text-overflow:ellipsis;">${escHtml(it.key)}</span>
              <strong style="color:#0B1B3A;">${it.count}</strong>
            </li>`)
            .join("")
        : `<li style="color:#94a3b8;padding:4px 0;">(aucune donnée)</li>`;
    return `<h3 style="margin:18px 0 6px;font-size:15px;">${escHtml(title)}</h3>
    <ul style="list-style:none;padding:0;margin:0;font-size:14px;">${rows}</ul>`;
}
function escHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
/** Échappe pour Telegram HTML (les retours ligne et la structure sont déjà posés). */
function escTg(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
