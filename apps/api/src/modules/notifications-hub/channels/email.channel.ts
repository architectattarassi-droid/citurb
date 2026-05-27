import { Injectable, Logger } from "@nestjs/common";
import { EmailService } from "../../email/email.service";
import type { RenderedTemplate } from "../types";

/**
 * EmailChannel — wrap `EmailService` (Resend prioritaire, SMTP fallback).
 *
 * Le hub appelle `send(to, rendered)` ; on construit subject + html à partir
 * du template rendu. Si pas de `bodyHtml`, on en compose un autour de
 * `bodyText` pour rester lisible.
 */
@Injectable()
export class EmailChannel {
  private readonly log = new Logger("HubEmailChannel");

  constructor(private readonly email: EmailService) {}

  async send(to: string, rendered: RenderedTemplate): Promise<{ success: boolean; externalId?: string; error?: string }> {
    if (!to || !to.includes("@")) {
      return { success: false, error: "Adresse email invalide" };
    }
    const subject = rendered.subject || rendered.bodyInAppTitle || "CITURBAREA — Notification";
    const html = rendered.bodyHtml || this.fallbackHtml(rendered);
    const text = rendered.bodyText || rendered.bodyInAppDescription || "";

    const r = await this.email.send({ to, subject, html, text });
    if (!r.ok) {
      this.log.warn(`[HubEmail] échec envoi à ${to}: ${r.error}`);
      return { success: false, error: r.error };
    }
    return { success: true, externalId: r.messageId };
  }

  private fallbackHtml(r: RenderedTemplate): string {
    const title = r.bodyInAppTitle || r.subject || "CITURBAREA";
    const body = r.bodyInAppDescription || r.bodyText || "";
    const cta = r.ctaUrl && r.ctaLabel
      ? `<p style="margin-top:24px"><a href="${r.ctaUrl}" style="background:#1d4ed8;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">${r.ctaLabel}</a></p>`
      : "";
    return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937">
      <h2 style="color:#1e3a8a;margin:0 0 16px">${title}</h2>
      <p style="font-size:15px;line-height:1.6;margin:0">${body}</p>
      ${cta}
      <p style="margin-top:32px;color:#9ca3af;font-size:11px">CITURBAREA — Notification automatique. <a href="https://citurbarea.com/parametres/notifications" style="color:#9ca3af">Gérer mes préférences</a></p>
    </div>`;
  }
}
