import { Injectable, Logger } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require("nodemailer");

/**
 * EmailService — wrapper centralisé pour l'envoi d'emails.
 *
 * Stratégie en cascade (premier provider configuré gagne) :
 *  1. **Resend** (RESEND_API_KEY) — API HTTP, marche depuis Railway, recommandé
 *  2. **SMTP** (SMTP_HOST + SMTP_USER + SMTP_PASS) — fallback si Resend absent
 *  3. **Log dev** — affiche l'email dans les logs si rien n'est configuré
 *
 * Railway bloque le port SMTP sortant (25/465/587) sur les plans hobby —
 * d'où la priorité à Resend (API HTTPS classique).
 *
 * Utilisé par : admin-auth (OTP login), admin-notify (alertes), client-notify
 * (emails transactionnels), cercle-invitations (invitations).
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string; // si absent : SMTP_FROM ou RESEND_FROM ou "no-reply@citurbarea.com"
  replyTo?: string;
};

export type SendEmailResult = {
  ok: boolean;
  provider?: "resend" | "smtp" | "dev-log";
  messageId?: string;
  error?: string;
};

@Injectable()
export class EmailService {
  private readonly log = new Logger("EmailService");

  hasResend(): boolean {
    return !!process.env.RESEND_API_KEY;
  }
  hasSmtp(): boolean {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }
  isConfigured(): boolean {
    return this.hasResend() || this.hasSmtp();
  }

  private defaultFrom(): string {
    return (
      process.env.RESEND_FROM ||
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      "CITURBAREA <onboarding@resend.dev>"
    );
  }

  /**
   * Envoie un email via le premier provider disponible.
   * Jamais bloquant — retourne ok=false si tous les providers échouent.
   */
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const from = input.from || this.defaultFrom();

    // 1. Resend prioritaire (Railway-compatible)
    if (this.hasResend()) {
      const r = await this.sendViaResend({ ...input, from });
      if (r.ok) return r;
      this.log.warn(`[Email] Resend failed (${r.error}) — fallback SMTP si configuré`);
    }

    // 2. SMTP fallback
    if (this.hasSmtp()) {
      const r = await this.sendViaSmtp({ ...input, from });
      if (r.ok) return r;
      this.log.warn(`[Email] SMTP failed (${r.error}) — fallback log`);
    }

    // 3. Mode dev : log uniquement
    this.log.warn(`[Email DEV] aucun provider configuré — email non envoyé`);
    this.log.warn(`[Email DEV] to=${input.to} subject="${input.subject}"`);
    this.log.warn(`[Email DEV] text=${input.text || "(html only)"}`);
    return { ok: false, provider: "dev-log", error: "Aucun provider email configuré" };
  }

  // ── Provider 1 : Resend API ─────────────────────────────────────

  private async sendViaResend(input: SendEmailInput & { from: string }): Promise<SendEmailResult> {
    const key = process.env.RESEND_API_KEY!;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: input.from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
          ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        return { ok: false, provider: "resend", error: `Resend ${res.status}: ${txt.slice(0, 200)}` };
      }
      const data = await res.json().catch(() => ({}));
      this.log.log(`[Email] Resend OK to=${input.to} id=${(data as any)?.id}`);
      return { ok: true, provider: "resend", messageId: (data as any)?.id };
    } catch (e: any) {
      return { ok: false, provider: "resend", error: e?.message || "network error" };
    }
  }

  // ── Provider 2 : SMTP (fallback) ───────────────────────────────

  private async sendViaSmtp(input: SendEmailInput & { from: string }): Promise<SendEmailResult> {
    const host = process.env.SMTP_HOST!;
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;
    const user = process.env.SMTP_USER!;
    const pass = process.env.SMTP_PASS!;
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: 10_000,
        socketTimeout: 15_000,
      });
      const info = await transporter.sendMail({
        from: input.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
      });
      this.log.log(`[Email] SMTP OK to=${input.to} id=${info?.messageId}`);
      return { ok: true, provider: "smtp", messageId: info?.messageId };
    } catch (e: any) {
      return { ok: false, provider: "smtp", error: e?.message || "smtp error" };
    }
  }
}
