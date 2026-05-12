import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { TwilioService } from "../../modules/twilio/twilio.service";
import { EmailService } from "../../modules/email/email.service";

/**
 * AdminNotifyService — Sprint H couche 9 (alertes temps réel).
 *
 * Envoie email + SMS aux admins sur événements critiques :
 *   - login depuis IP nouvelle
 *   - 3 échecs de mot de passe consécutifs (= lock)
 *   - kill switch sur user/cercle/contenu
 *   - export RGPD lancé
 *   - WebAuthn ajouté/supprimé
 *   - sub-admin créé
 *
 * Toutes les alertes sont aussi persistées dans AdminAlert pour l'historique.
 *
 * Fallback : si SMTP/Twilio absent, log warn et continue (jamais bloquant).
 */

type AlertInput = {
  adminUserId?: string;
  severity: "INFO" | "WARN" | "CRITICAL";
  category: string; // "LOGIN_NEW_IP" | "FAILED_ATTEMPTS" | "KILL_SWITCH" | "EXPORT_RGPD" | "WEBAUTHN_ADDED" | "SUB_ADMIN_CREATED"
  title: string;
  message: string;
  emailTo?: string;
  smsTo?: string;
};

@Injectable()
export class AdminNotifyService {
  private readonly log = new Logger("AdminNotifyService");
  constructor(
    private readonly prisma: PrismaService,
    private readonly twilio: TwilioService,
    private readonly email: EmailService,
  ) {}

  async alert(input: AlertInput) {
    const channelEmail = !!input.emailTo;
    const channelSms = !!input.smsTo;

    const alert = await this.prisma.adminAlert.create({
      data: {
        adminUserId: input.adminUserId ?? null,
        severity: input.severity,
        category: input.category,
        title: input.title,
        message: input.message,
        channelEmail,
        channelSms,
      },
    });

    let emailDeliveredAt: Date | null = null;
    let smsDeliveredAt: Date | null = null;

    if (channelEmail && input.emailTo) {
      const ok = await this.sendEmail(input.emailTo, input.title, input.message, input.severity);
      if (ok) emailDeliveredAt = new Date();
    }
    if (channelSms && input.smsTo) {
      const ok = await this.sendSms(input.smsTo, `${input.title} — ${input.message}`);
      if (ok) smsDeliveredAt = new Date();
    }

    if (emailDeliveredAt || smsDeliveredAt) {
      await this.prisma.adminAlert.update({
        where: { id: alert.id },
        data: { emailDeliveredAt, smsDeliveredAt },
      });
    }

    return alert;
  }

  // ── Email via SMTP ──────────────────────────────────────────────

  private async sendEmail(to: string, title: string, message: string, severity: string): Promise<boolean> {
    if (!this.email.isConfigured()) {
      this.log.warn(`[AdminNotify] Aucun provider email configuré — alerte à ${to} non envoyée`);
      return false;
    }

    const sevColor = severity === "CRITICAL" ? "#94292B" : severity === "WARN" ? "#B8633F" : "#3D5A80";
    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 24px auto; padding: 0 16px; color: #1A1F2E;">
  <div style="background: #0F2A4A; color: #FAF7F2; padding: 20px 28px; border-radius: 8px 8px 0 0;">
    <div style="font-size: 11px; letter-spacing: 0.22em; color: #B08D57;">CITURBAREA · ADMIN · ${severity}</div>
    <h1 style="font-family: Georgia, serif; font-size: 22px; margin: 8px 0 0; font-weight: 600;">${this.esc(title)}</h1>
  </div>
  <div style="background: white; padding: 28px; border: 1px solid #E8E2D5; border-top: 0; border-radius: 0 0 8px 8px;">
    <div style="background: ${sevColor}10; border-left: 3px solid ${sevColor}; padding: 14px; margin-bottom: 16px; font-size: 14px; line-height: 1.5;">
      ${this.esc(message)}
    </div>
    <p style="font-size: 12px; color: #5C6373; margin-top: 18px;">
      Cette alerte a été générée automatiquement par l'app admin CITURBAREA.
      Si tu n'es pas à l'origine de cette action, connecte-toi immédiatement à <strong>admin.citurbarea.com</strong> et change ton mot de passe.
    </p>
  </div>
</body></html>`;

    try {
      const r = await this.email.send({
        to,
        subject: `[${severity}] ${title}`,
        html,
        text: `${title}\n\n${message}\n\nSi tu n'es pas à l'origine de cette action, change ton mot de passe sur admin.citurbarea.com.`,
        from: process.env.ADMIN_EMAIL_FROM || process.env.RESEND_FROM || "CITURBAREA Admin <onboarding@resend.dev>",
      });
      if (r.ok) return true;
      this.log.error(`[AdminNotify] Email send fail: ${r.error}`);
      return false;
    } catch (e: any) {
      this.log.error(`[AdminNotify] SMTP fail to=${to}: ${e?.message}`);
      return false;
    }
  }

  // ── SMS via TwilioService centralisé ────────────────────────────

  private async sendSms(to: string, message: string): Promise<boolean> {
    const r = await this.twilio.sendSms(to, message);
    return r.ok;
  }

  private esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
}
