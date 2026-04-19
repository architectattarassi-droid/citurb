import { Injectable, Logger } from "@nestjs/common";
import { randomInt } from "crypto";

type CacheEntry = {
  code: string;
  expiresAt: number;
  lastSentAt: number;
  phone: string;
};

// In-memory cache is OK for local/dev.
// In prod, this should move to Redis (Tome-@ infra).
const SMS_OTP_CACHE = new Map<string, CacheEntry>();

@Injectable()
export class P1PacksSmsService {
  private readonly log = new Logger(P1PacksSmsService.name);

  private now() {
    return Date.now();
  }

  private normalizePhone(phone: string) {
    return (phone || "").trim();
  }

  private isDev() {
    return (process.env.NODE_ENV || "development") !== "production";
  }

  private genCode() {
    return String(randomInt(100000, 999999));
  }

  private ttlMs() {
    return 10 * 60 * 1000; // 10 min
  }

  private cooldownMs() {
    return 60 * 1000; // 60 sec
  }

  async requestCode(key: string, phone: string): Promise<{ ok: true; expiresInSec: number; devCode?: string } | { ok: false; message: string }> {
    const p = this.normalizePhone(phone);
    if (!p) return { ok: false, message: "Téléphone requis." };
    if (!key) return { ok: false, message: "Action impossible." };

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
          if (!this.isDev()) return { ok: false, message: "Envoi SMS impossible. Réessayez." };
        }
      } else {
        this.log.log(`[DEV] SMS OTP to ${p}: ${msg}`);
      }
    } catch (e: any) {
      this.log.warn(`SMS send error: ${e?.message || e}`);
      if (!this.isDev()) return { ok: false, message: "Envoi SMS impossible. Réessayez." };
    }

    return { ok: true, expiresInSec: Math.floor(this.ttlMs() / 1000), devCode: this.isDev() ? code : undefined };
  }

  async verifyCode(key: string, code: string): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!key) return { ok: false, message: "Action impossible." };
    const entry = SMS_OTP_CACHE.get(key);
    if (!entry) return { ok: false, message: "Code incorrect." };
    const now = this.now();
    if (now > entry.expiresAt) {
      SMS_OTP_CACHE.delete(key);
      return { ok: false, message: "Code expiré." };
    }
    if ((code || "").trim() !== entry.code) return { ok: false, message: "Code incorrect." };
    // Keep the entry for a short time? For now delete on success.
    SMS_OTP_CACHE.delete(key);
    return { ok: true };
  }
}
