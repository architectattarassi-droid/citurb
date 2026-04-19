"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var P1PacksSmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.P1PacksSmsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
// In-memory cache is OK for local/dev.
// In prod, this should move to Redis (Tome-@ infra).
const SMS_OTP_CACHE = new Map();
let P1PacksSmsService = P1PacksSmsService_1 = class P1PacksSmsService {
    log = new common_1.Logger(P1PacksSmsService_1.name);
    now() {
        return Date.now();
    }
    normalizePhone(phone) {
        return (phone || "").trim();
    }
    isDev() {
        return (process.env.NODE_ENV || "development") !== "production";
    }
    genCode() {
        return String((0, crypto_1.randomInt)(100000, 999999));
    }
    ttlMs() {
        return 10 * 60 * 1000; // 10 min
    }
    cooldownMs() {
        return 60 * 1000; // 60 sec
    }
    async requestCode(key, phone) {
        const p = this.normalizePhone(phone);
        if (!p)
            return { ok: false, message: "Téléphone requis." };
        if (!key)
            return { ok: false, message: "Action impossible." };
        const now = this.now();
        const existing = SMS_OTP_CACHE.get(key);
        if (existing && now - existing.lastSentAt < this.cooldownMs()) {
            return { ok: false, message: "Veuillez patienter avant de renvoyer un code." };
        }
        const code = this.genCode();
        const expiresAt = now + this.ttlMs();
        SMS_OTP_CACHE.set(key, { code, expiresAt, lastSentAt: now, phone: p });
        // Send SMS if Twilio config exists, otherwise dev fallback to console.
        const twSid = process.env.TWILIO_ACCOUNT_SID;
        const twToken = process.env.TWILIO_AUTH_TOKEN;
        const twFrom = process.env.TWILIO_FROM;
        const msg = `CITURBAREA: votre code est ${code}. Valable 10 min.`;
        try {
            if (twSid && twToken && twFrom) {
                const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twSid)}/Messages.json`;
                const body = new URLSearchParams({ From: twFrom, To: p, Body: msg });
                const auth = Buffer.from(`${twSid}:${twToken}`).toString("base64");
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        Authorization: `Basic ${auth}`,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body,
                });
                if (!res.ok) {
                    const txt = await res.text().catch(() => "");
                    this.log.warn(`Twilio SMS failed: ${res.status} ${txt}`);
                    // Do not leak provider details to the client.
                    if (!this.isDev())
                        return { ok: false, message: "Envoi SMS impossible. Réessayez." };
                }
            }
            else {
                this.log.log(`[DEV] SMS OTP to ${p}: ${msg}`);
            }
        }
        catch (e) {
            this.log.warn(`SMS send error: ${e?.message || e}`);
            if (!this.isDev())
                return { ok: false, message: "Envoi SMS impossible. Réessayez." };
        }
        return { ok: true, expiresInSec: Math.floor(this.ttlMs() / 1000), devCode: this.isDev() ? code : undefined };
    }
    async verifyCode(key, code) {
        if (!key)
            return { ok: false, message: "Action impossible." };
        const entry = SMS_OTP_CACHE.get(key);
        if (!entry)
            return { ok: false, message: "Code incorrect." };
        const now = this.now();
        if (now > entry.expiresAt) {
            SMS_OTP_CACHE.delete(key);
            return { ok: false, message: "Code expiré." };
        }
        if ((code || "").trim() !== entry.code)
            return { ok: false, message: "Code incorrect." };
        // Keep the entry for a short time? For now delete on success.
        SMS_OTP_CACHE.delete(key);
        return { ok: true };
    }
};
exports.P1PacksSmsService = P1PacksSmsService;
exports.P1PacksSmsService = P1PacksSmsService = P1PacksSmsService_1 = __decorate([
    (0, common_1.Injectable)()
], P1PacksSmsService);
