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
exports.EmailChannel = void 0;
const common_1 = require("@nestjs/common");
const email_service_1 = require("../../email/email.service");
/**
 * EmailChannel — wrap `EmailService` (Resend prioritaire, SMTP fallback).
 *
 * Le hub appelle `send(to, rendered)` ; on construit subject + html à partir
 * du template rendu. Si pas de `bodyHtml`, on en compose un autour de
 * `bodyText` pour rester lisible.
 */
let EmailChannel = class EmailChannel {
    email;
    log = new common_1.Logger("HubEmailChannel");
    constructor(email) {
        this.email = email;
    }
    async send(to, rendered) {
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
    fallbackHtml(r) {
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
};
exports.EmailChannel = EmailChannel;
exports.EmailChannel = EmailChannel = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [email_service_1.EmailService])
], EmailChannel);
