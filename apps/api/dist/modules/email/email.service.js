"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require("nodemailer");
let EmailService = class EmailService {
    log = new common_1.Logger("EmailService");
    hasResend() {
        return !!process.env.RESEND_API_KEY;
    }
    hasSmtp() {
        return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    }
    isConfigured() {
        return this.hasResend() || this.hasSmtp();
    }
    defaultFrom() {
        return (process.env.RESEND_FROM ||
            process.env.SMTP_FROM ||
            process.env.SMTP_USER ||
            "CITURBAREA <onboarding@resend.dev>");
    }
    /**
     * Envoie un email via le premier provider disponible.
     * Jamais bloquant — retourne ok=false si tous les providers échouent.
     */
    async send(input) {
        const from = input.from || this.defaultFrom();
        // 1. Resend prioritaire (Railway-compatible)
        if (this.hasResend()) {
            const r = await this.sendViaResend({ ...input, from });
            if (r.ok)
                return r;
            this.log.warn(`[Email] Resend failed (${r.error}) — fallback SMTP si configuré`);
        }
        // 2. SMTP fallback
        if (this.hasSmtp()) {
            const r = await this.sendViaSmtp({ ...input, from });
            if (r.ok)
                return r;
            this.log.warn(`[Email] SMTP failed (${r.error}) — fallback log`);
        }
        // 3. Mode dev : log uniquement
        this.log.warn(`[Email DEV] aucun provider configuré — email non envoyé`);
        this.log.warn(`[Email DEV] to=${input.to} subject="${input.subject}"`);
        this.log.warn(`[Email DEV] text=${input.text || "(html only)"}`);
        return { ok: false, provider: "dev-log", error: "Aucun provider email configuré" };
    }
    // ── Provider 1 : Resend API ─────────────────────────────────────
    async sendViaResend(input) {
        const key = process.env.RESEND_API_KEY;
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
            this.log.log(`[Email] Resend OK to=${input.to} id=${data?.id}`);
            return { ok: true, provider: "resend", messageId: data?.id };
        }
        catch (e) {
            return { ok: false, provider: "resend", error: e?.message || "network error" };
        }
    }
    // ── Provider 2 : SMTP (fallback) ───────────────────────────────
    async sendViaSmtp(input) {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT) || 587;
        const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
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
        }
        catch (e) {
            return { ok: false, provider: "smtp", error: e?.message || "smtp error" };
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)()
], EmailService);
