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
exports.AdminNotifyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const twilio_service_1 = require("../../modules/twilio/twilio.service");
const email_service_1 = require("../../modules/email/email.service");
let AdminNotifyService = class AdminNotifyService {
    prisma;
    twilio;
    email;
    log = new common_1.Logger("AdminNotifyService");
    constructor(prisma, twilio, email) {
        this.prisma = prisma;
        this.twilio = twilio;
        this.email = email;
    }
    async alert(input) {
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
        let emailDeliveredAt = null;
        let smsDeliveredAt = null;
        if (channelEmail && input.emailTo) {
            const ok = await this.sendEmail(input.emailTo, input.title, input.message, input.severity);
            if (ok)
                emailDeliveredAt = new Date();
        }
        if (channelSms && input.smsTo) {
            const ok = await this.sendSms(input.smsTo, `${input.title} — ${input.message}`);
            if (ok)
                smsDeliveredAt = new Date();
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
    async sendEmail(to, title, message, severity) {
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
            if (r.ok)
                return true;
            this.log.error(`[AdminNotify] Email send fail: ${r.error}`);
            return false;
        }
        catch (e) {
            this.log.error(`[AdminNotify] SMTP fail to=${to}: ${e?.message}`);
            return false;
        }
    }
    // ── SMS via TwilioService centralisé ────────────────────────────
    async sendSms(to, message) {
        const r = await this.twilio.sendSms(to, message);
        return r.ok;
    }
    esc(s) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
};
exports.AdminNotifyService = AdminNotifyService;
exports.AdminNotifyService = AdminNotifyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        twilio_service_1.TwilioService,
        email_service_1.EmailService])
], AdminNotifyService);
