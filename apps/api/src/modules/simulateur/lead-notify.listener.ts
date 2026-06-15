import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EmailService } from "../email/email.service";
import { TelegramService } from "../monitoring/telegram.service";
import type { LeadCreatedEvent } from "./lead.service";

/**
 * LeadNotifyListener — notifie l'owner (Yassine) à chaque nouveau lead du
 * simulateur, sur deux canaux : Telegram + email.
 *
 * Réutilise l'infrastructure existante :
 *  - TelegramService (module monitoring) — envoi Bot Telegram, env-gated.
 *  - EmailService (module global) — cascade Resend → SMTP → log.
 *
 * Event-driven (`lead.created`) : totalement découplé de la capture. Chaque
 * canal est isolé (un échec n'empêche pas l'autre) et jamais bloquant.
 * Flags : NOTIFY_TELEGRAM_ENABLED / NOTIFY_EMAIL_ENABLED (défaut : activés).
 */
@Injectable()
export class LeadNotifyListener {
  private readonly log = new Logger("LeadNotifyListener");

  constructor(
    private readonly email: EmailService,
    private readonly telegram: TelegramService,
  ) {}

  private flag(name: string): boolean {
    const v = (process.env[name] ?? "").trim().toLowerCase();
    return !["false", "0", "no", "off"].includes(v);
  }

  @OnEvent("lead.created", { async: true, promisify: true })
  async onLeadCreated(e: LeadCreatedEvent): Promise<void> {
    await Promise.allSettled([this.notifyTelegram(e), this.notifyEmail(e)]);
  }

  private fourchette(e: LeadCreatedEvent): string {
    if (e.estimationMin == null || e.estimationMax == null) return "—";
    return `${fmt(e.estimationMin)} – ${fmt(e.estimationMax)} MAD`;
  }

  private async notifyTelegram(e: LeadCreatedEvent) {
    if (!this.flag("NOTIFY_TELEGRAM_ENABLED")) return;
    try {
      const lines = [
        "🎯 <b>Nouveau lead — Simulateur coût</b>",
        "",
        `<b>Contact :</b> ${esc(e.nom)} — ${esc(e.telephone)} — ${esc(e.email)}`,
        `<b>Projet :</b> ${esc(e.typeProjet)}`,
        `<b>Ville :</b> ${esc(e.ville)}`,
        `<b>Estimation :</b> ${esc(this.fourchette(e))}`,
        `<b>Paramètres :</b> <code>${esc(JSON.stringify(e.paramsProjet))}</code>`,
      ];
      const r = await this.telegram.sendMessage(lines.join("\n"), "HTML");
      if (!r.ok && !r.skipped) this.log.warn(`[LeadNotify] Telegram échec: ${r.error}`);
    } catch (err: any) {
      this.log.error(`[LeadNotify] Telegram exception: ${err?.message}`);
    }
  }

  private async notifyEmail(e: LeadCreatedEvent) {
    if (!this.flag("NOTIFY_EMAIL_ENABLED")) return;
    const to =
      process.env.NOTIFY_EMAIL_TO ||
      process.env.OWNER_EMAIL ||
      process.env.LEAD_NOTIFY_TO ||
      "";
    if (!to) {
      this.log.warn("[LeadNotify] Email skip — aucun destinataire (NOTIFY_EMAIL_TO/OWNER_EMAIL…)");
      return;
    }
    try {
      const rows: Array<[string, string]> = [
        ["Nom", e.nom],
        ["Téléphone", e.telephone],
        ["Email", e.email],
        ["Projet", e.typeProjet],
        ["Ville", e.ville],
        ["Estimation", this.fourchette(e)],
      ];
      const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;">
          <h2 style="color:#0B1B3A;margin:0 0 16px;">🎯 Nouveau lead — Simulateur coût construction</h2>
          <table style="border-collapse:collapse;width:100%;font-size:14px;">
            ${rows
              .map(
                ([k, v]) =>
                  `<tr><td style="padding:6px 12px;color:#64748b;border-bottom:1px solid #e2e8f0;">${esc(k)}</td><td style="padding:6px 12px;font-weight:600;border-bottom:1px solid #e2e8f0;">${esc(v)}</td></tr>`,
              )
              .join("")}
          </table>
          <pre style="background:#0f172a;color:#e2e8f0;padding:12px;border-radius:6px;margin-top:16px;font-size:12px;overflow-x:auto;">${esc(JSON.stringify(e.paramsProjet, null, 2))}</pre>
        </div>`;
      const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
      const r = await this.email.send({
        to,
        subject: `🎯 Nouveau lead — ${e.typeProjet} à ${e.ville}`,
        html,
        text,
      });
      if (!r.ok) this.log.warn(`[LeadNotify] Email échec: ${r.error}`);
    } catch (err: any) {
      this.log.error(`[LeadNotify] Email exception: ${err?.message}`);
    }
  }
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("fr-MA").replace(/ /g, " ");
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
