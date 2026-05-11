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
var OtpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const kernel_1 = require("../kernel");
const twilio_service_1 = require("../twilio/twilio.service");
let OtpService = OtpService_1 = class OtpService {
    prisma;
    twilio;
    log = new common_1.Logger(OtpService_1.name);
    // Defaults (can be externalized later)
    ttlMs = 10 * 60 * 1000;
    cooldownMs = 60 * 1000;
    maxAttempts = 5;
    constructor(prisma, twilio) {
        this.prisma = prisma;
        this.twilio = twilio;
    }
    isProd() {
        return (process.env.NODE_ENV || "development") === "production";
    }
    normalizeEmail(email) {
        return (email || "").trim().toLowerCase();
    }
    normalizePhone(phone) {
        return (phone || "").trim();
    }
    genCode() {
        const n = crypto.randomInt(0, 1000000);
        return String(n).padStart(6, "0");
    }
    sha256(s) {
        return crypto.createHash("sha256").update(s).digest("hex");
    }
    ensureProvidersOrThrow(channel) {
        if (!this.isProd())
            return;
        if (channel === "EMAIL") {
            const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
            if (!(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS)) {
                throw new Error("SMTP non configuré (production). ");
            }
            return;
        }
        // SMS
        const smsEnabled = String(process.env.SMS_ENABLED || "false") === "true";
        if (!smsEnabled)
            return;
        const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;
        if (!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM)) {
            throw new Error("Provider SMS non configuré (production). ");
        }
    }
    async requestEmailOtp(contextKey, email, meta) {
        const destination = this.normalizeEmail(email);
        if (!contextKey)
            return { ok: false, message: "Action impossible." };
        if (!destination)
            return { ok: false, message: "Email requis." };
        return this.requestOtp("EMAIL", contextKey, destination, meta);
    }
    async requestSmsOtp(contextKey, phone, meta) {
        const destination = this.normalizePhone(phone);
        if (!contextKey)
            return { ok: false, message: "Action impossible." };
        if (!destination)
            return { ok: false, message: "Téléphone requis." };
        return this.requestOtp("SMS", contextKey, destination, meta);
    }
    async requestOtp(channel, contextKey, destination, meta) {
        try {
            this.ensureProvidersOrThrow(channel);
            const now = new Date();
            const latest = await this.prisma.otpChallenge.findFirst({
                where: { channel, destination },
                orderBy: { lastSentAt: "desc" },
            });
            if (latest) {
                const delta = now.getTime() - new Date(latest.lastSentAt).getTime();
                if (delta < this.cooldownMs) {
                    return { ok: false, message: "Veuillez patienter avant de renvoyer un code." };
                }
            }
            const code = this.genCode();
            const salt = crypto.randomBytes(16).toString("hex");
            const codeHash = this.sha256(`${salt}:${code}`);
            const expiresAt = new Date(Date.now() + this.ttlMs);
            // Invalidate previous pending challenges for this contextKey+channel (clean semantics)
            await this.prisma.otpChallenge.updateMany({
                where: { contextKey, channel, status: "PENDING" },
                data: { status: "EXPIRED" },
            });
            await this.prisma.otpChallenge.create({
                data: {
                    channel,
                    status: "PENDING",
                    contextKey,
                    destination,
                    salt,
                    codeHash,
                    expiresAt,
                    maxAttempts: this.maxAttempts,
                    attempts: 0,
                    lastSentAt: now,
                    meta: meta ?? {},
                },
            });
            if (channel === "EMAIL") {
                await this.sendEmail(destination, code, meta);
            }
            else {
                await this.sendSms(destination, code);
            }
            return { ok: true, expiresInSec: Math.round(this.ttlMs / 1000), devCode: this.isProd() ? undefined : code };
        }
        catch (e) {
            const msg = e?.message || String(e);
            this.log.warn(`[OTP] request failed: ${msg}`);
            return { ok: false, message: this.isProd() ? "Action impossible." : msg };
        }
    }
    async verifyEmailOtp(contextKey, code) {
        return this.verifyOtp("EMAIL", contextKey, code);
    }
    async verifySmsOtp(contextKey, code) {
        return this.verifyOtp("SMS", contextKey, code);
    }
    async verifyOtp(channel, contextKey, code) {
        try {
            const c = String(code || "").trim();
            if (!contextKey)
                return { ok: false, message: "Action impossible." };
            if (!c)
                return { ok: false, message: "Code manquant." };
            // Latest pending challenge for contextKey+channel
            const challenge = await this.prisma.otpChallenge.findFirst({
                where: { contextKey, channel, status: "PENDING" },
                orderBy: { createdAt: "desc" },
            });
            if (!challenge)
                return { ok: false, message: "Code incorrect ou expiré." };
            const now = new Date();
            if (now.getTime() > new Date(challenge.expiresAt).getTime()) {
                await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { status: "EXPIRED" } });
                return { ok: false, message: "Code expiré." };
            }
            if (challenge.attempts >= challenge.maxAttempts) {
                await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { status: "LOCKED", lockedAt: now } });
                return { ok: false, message: "Trop de tentatives. Veuillez relancer un code." };
            }
            const expected = this.sha256(`${challenge.salt}:${c}`);
            if (expected !== challenge.codeHash) {
                await this.prisma.otpChallenge.update({
                    where: { id: challenge.id },
                    data: { attempts: { increment: 1 } },
                });
                return { ok: false, message: "Code incorrect." };
            }
            await this.prisma.otpChallenge.update({
                where: { id: challenge.id },
                data: { status: "VERIFIED", verifiedAt: now },
            });
            return { ok: true };
        }
        catch (e) {
            const msg = e?.message || String(e);
            this.log.warn(`[OTP] verify failed: ${msg}`);
            return { ok: false, message: this.isProd() ? "Action impossible." : msg };
        }
    }
    async sendEmail(to, code, meta) {
        const subject = "CITURBAREA — Code de confirmation";
        const who = meta?.requester || meta?.who || {};
        const name = who?.displayName ? ` ${who.displayName}` : "";
        const text = [
            `Bonjour${name},`,
            "",
            "Voici votre code de confirmation :",
            "",
            `CODE: ${code}`,
            "",
            "Valable 10 minutes.",
            "",
            "— CITURBAREA",
        ].join("\n");
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const from = process.env.SMTP_FROM || "no-reply@citurbarea.local";
        const smtpSecure = String(process.env.SMTP_SECURE || "") === "true" ? true : smtpPort === 465;
        if (smtpHost && smtpPort && smtpUser && smtpPass) {
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpSecure,
                auth: { user: smtpUser, pass: smtpPass },
            });
            await transporter.sendMail({ from, to, subject, text });
            if (!this.isProd())
                this.log.log(`[DEV][EMAIL] sent via SMTP to=${to} host=${smtpHost}:${smtpPort}`);
            return;
        }
        if (this.isProd()) {
            throw new Error("SMTP non configuré.");
        }
        // DEV fallback
        // eslint-disable-next-line no-console
        console.log(`\n[CITURBAREA EMAIL DEV] TO: ${to}\nSUBJECT: ${subject}\n\n${text}\n`);
    }
    async sendVerification(phone) {
        const r = await this.twilio.sendVerification(phone, "sms");
        if (!r.ok) {
            this.log.warn(`[OTP] Twilio Verify ${r.error || "fail"} pour ${phone}${r.devCode ? ` — code dev ${r.devCode}` : ""}`);
        }
        else {
            this.log.log(`[OTP] Twilio Verify SMS envoyé à ${phone}`);
        }
    }
    async checkVerification(phone, code) {
        const r = await this.twilio.checkVerification(phone, code);
        return r.approved;
    }
    async sendSms(to, code) {
        const msg = `CITURBAREA: votre code est ${code}. Valable 10 min.`;
        const smsEnabled = String(process.env.SMS_ENABLED || "false") === "true";
        if (!smsEnabled) {
            if (!this.isProd())
                this.log.log(`[DEV][SMS disabled] to=${to} msg=${msg}`);
            return;
        }
        const r = await this.twilio.sendSms(to, msg);
        if (!r.ok) {
            this.log.warn(`Twilio SMS failed: ${r.error}`);
            if (this.isProd())
                throw new Error("Envoi SMS impossible.");
        }
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = OtpService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [kernel_1.PrismaService,
        twilio_service_1.TwilioService])
], OtpService);
