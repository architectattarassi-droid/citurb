"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwilioService = void 0;
const common_1 = require("@nestjs/common");
let TwilioService = class TwilioService {
    log = new common_1.Logger("TwilioService");
    isConfigured() {
        return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
    }
    hasMessaging() {
        return this.isConfigured() && !!process.env.TWILIO_FROM;
    }
    hasVerify() {
        return this.isConfigured() && !!process.env.TWILIO_VERIFY_SID;
    }
    // ── Programmable Messaging (envoi SMS générique) ───────────────
    async sendSms(toE164, body) {
        if (!this.hasMessaging()) {
            this.log.warn(`[Twilio] Pas configuré pour Messaging — SMS à ${toE164} non envoyé (body: ${body.slice(0, 60)}…)`);
            return { ok: false, error: "Twilio non configuré" };
        }
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_FROM;
        try {
            const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
            const form = new URLSearchParams({ From: from, To: toE164, Body: body.slice(0, 320) });
            const auth = Buffer.from(`${sid}:${token}`).toString("base64");
            const res = await fetch(url, {
                method: "POST",
                headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
                body: form,
            });
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                this.log.error(`[Twilio] sendSms fail ${res.status}: ${txt.slice(0, 200)}`);
                return { ok: false, error: `Twilio ${res.status}: ${txt.slice(0, 100)}` };
            }
            const data = await res.json().catch(() => ({}));
            return { ok: true, messageId: data?.sid };
        }
        catch (e) {
            this.log.error(`[Twilio] sendSms network fail: ${e?.message}`);
            return { ok: false, error: e?.message };
        }
    }
    // ── Twilio Verify (anti-fraude built-in, code géré par Twilio) ─
    async sendVerification(toE164, channel = "sms") {
        if (!this.hasVerify()) {
            // Fallback dev : génère un code local et le log
            const devCode = String(Math.floor(100000 + Math.random() * 900000));
            this.log.warn(`[Twilio Verify] Pas configuré — code dev ${devCode} pour ${toE164}`);
            return { ok: false, error: "Twilio Verify non configuré", devCode };
        }
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        const verifySid = process.env.TWILIO_VERIFY_SID;
        try {
            const url = `https://verify.twilio.com/v2/Services/${encodeURIComponent(verifySid)}/Verifications`;
            const form = new URLSearchParams({ To: toE164, Channel: channel });
            const auth = Buffer.from(`${sid}:${token}`).toString("base64");
            const res = await fetch(url, {
                method: "POST",
                headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
                body: form,
            });
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                this.log.error(`[Twilio Verify] sendVerification fail ${res.status}: ${txt.slice(0, 200)}`);
                return { ok: false, error: `Verify ${res.status}` };
            }
            return { ok: true };
        }
        catch (e) {
            this.log.error(`[Twilio Verify] sendVerification network fail: ${e?.message}`);
            return { ok: false, error: e?.message };
        }
    }
    async checkVerification(toE164, code) {
        if (!this.hasVerify()) {
            return { ok: false, approved: false, error: "Twilio Verify non configuré" };
        }
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        const verifySid = process.env.TWILIO_VERIFY_SID;
        try {
            const url = `https://verify.twilio.com/v2/Services/${encodeURIComponent(verifySid)}/VerificationCheck`;
            const form = new URLSearchParams({ To: toE164, Code: code });
            const auth = Buffer.from(`${sid}:${token}`).toString("base64");
            const res = await fetch(url, {
                method: "POST",
                headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
                body: form,
            });
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                this.log.error(`[Twilio Verify] checkVerification fail ${res.status}: ${txt.slice(0, 200)}`);
                return { ok: false, approved: false, error: `Verify ${res.status}` };
            }
            const data = await res.json().catch(() => ({}));
            const approved = data?.status === "approved";
            return { ok: true, approved };
        }
        catch (e) {
            this.log.error(`[Twilio Verify] checkVerification network fail: ${e?.message}`);
            return { ok: false, approved: false, error: e?.message };
        }
    }
};
exports.TwilioService = TwilioService;
exports.TwilioService = TwilioService = __decorate([
    (0, common_1.Injectable)()
], TwilioService);
