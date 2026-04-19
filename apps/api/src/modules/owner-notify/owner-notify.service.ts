import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export type OwnerEvent =
  | 'DOSSIER_CREATED'
  | 'DOCUMENT_UPLOADED'
  | 'DOSSIER_SUBMITTED'
  | 'NEW_USER_REGISTERED'
  | 'DOSSIER_APPROVED';

@Injectable()
export class OwnerNotifyService {
  private readonly logger = new Logger(OwnerNotifyService.name);

  async notify(event: OwnerEvent, meta: Record<string, any> = {}) {
    const msg = this.buildMessage(event, meta);
    this.logger.log(`[OwnerNotify] ${event} → ${msg}`);
    await Promise.allSettled([
      this.sendSms(msg),
      this.sendEmail(event, msg, meta),
    ]);
  }

  private buildMessage(event: OwnerEvent, meta: Record<string, any>): string {
    const now = new Date().toLocaleTimeString('fr-MA', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Casablanca',
    });
    switch (event) {
      case 'NEW_USER_REGISTERED':
        return `🆕 [${now}] Nouveau client : ${meta.email || '?'} (${meta.username || '-'})`;
      case 'DOSSIER_CREATED':
        return `📁 [${now}] Dossier créé : "${meta.title || '-'}" — ${meta.commune || '?'} — Pack: ${meta.packSelected || '?'}`;
      case 'DOCUMENT_UPLOADED':
        return `📎 [${now}] Doc reçu : ${meta.docType || '?'} — ${meta.originalName || '?'} (dossier ${String(meta.dossierId || '').slice(0, 8)}...)`;
      case 'DOSSIER_SUBMITTED':
        return `🚀 [${now}] Dossier soumis : "${meta.title || '?'}" — ${meta.commune || '?'}`;
      case 'DOSSIER_APPROVED':
        return `✅ [${now}] Dossier APPROUVÉ : "${meta.title || '?'}" → Project ${String(meta.projectId || '').slice(0, 8)}...`;
      default:
        return `📬 [${now}] Event CITURBAREA : ${event}`;
    }
  }

  private async sendSms(message: string) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_PHONE;
    const to = process.env.OWNER_PHONE;
    if (!sid || !token || !from || !to) {
      this.logger.warn('[OwnerNotify] SMS skipped — TWILIO_FROM_PHONE ou OWNER_PHONE manquant');
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const twilio = require('twilio')(sid, token);
      await twilio.messages.create({ body: message, from, to });
      this.logger.log('[OwnerNotify] SMS owner envoyé');
    } catch (e: any) {
      this.logger.error(`[OwnerNotify] SMS failed: ${e.message}`);
    }
  }

  private async sendEmail(event: OwnerEvent, message: string, meta: Record<string, any>) {
    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail || !process.env.SMTP_HOST) return;
    const labels: Record<OwnerEvent, string> = {
      DOSSIER_CREATED: 'Nouveau dossier',
      DOCUMENT_UPLOADED: 'Document reçu',
      DOSSIER_SUBMITTED: 'Dossier soumis',
      NEW_USER_REGISTERED: 'Nouveau client',
      DOSSIER_APPROVED: 'Dossier approuvé',
    };
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: `"CITURBAREA Alertes" <${process.env.SMTP_USER}>`,
        to: ownerEmail,
        subject: `🔔 CITURBAREA — ${labels[event] || event}`,
        html: `
          <div style="font-family:monospace;background:#0f172a;color:#e2e8f0;
            padding:24px;border-radius:8px;max-width:500px;">
            <div style="color:#38bdf8;font-size:18px;font-weight:bold;margin-bottom:16px;">
              📡 CITURBAREA OWNER ALERT
            </div>
            <div style="background:#1e293b;padding:16px;border-radius:6px;
              border-left:3px solid #38bdf8;font-size:14px;line-height:1.6;">
              ${message}
            </div>
            <div style="margin-top:16px;color:#94a3b8;font-size:12px;">
              <pre style="background:#1e293b;padding:12px;border-radius:4px;
                overflow-x:auto;">${JSON.stringify(meta, null, 2)}</pre>
            </div>
          </div>
        `,
      });
      this.logger.log('[OwnerNotify] Email owner envoyé');
    } catch (e: any) {
      this.logger.error(`[OwnerNotify] Email failed: ${e.message}`);
    }
  }
}
