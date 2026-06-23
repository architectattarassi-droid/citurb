import { Injectable, Logger } from "@nestjs/common";

/**
 * TwilioService — wrapper centralisé pour SMS + Verify.
 *
 * Une seule config (`TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM` + `TWILIO_VERIFY_SID`)
 * utilisée partout : admin-auth (login OTP), admin-notify (alertes), otp.service (P1/dossiers).
 *
 * 3 méthodes :
 *   - sendSms(to, body)              → Programmable Messaging (notre code, notre challenge)
 *   - sendVerification(to)           → Twilio Verify (Twilio génère + envoie code, anti-fraude built-in)
 *   - checkVerification(to, code)    → Twilio Verify (vérification côté Twilio)
 *
 * Fallback : si Twilio non configuré, log warn et return { ok: false }.
 * Le code appelant doit gérer ce cas (mode dev).
 */

type SmsResult = { ok: boolean; messageId?: string; error?: string; devCode?: string };

@Injectable()
export class TwilioService {
  private readonly log = new Logger("TwilioService");

  isConfigured(): boolean {
    return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  }

  hasMessaging(): boolean {
    return this.isConfigured() && !!process.env.TWILIO_FROM;
  }

  hasVerify(): boolean {
    return this.isConfigured() && !!process.env.TWILIO_VERIFY_SID;
  }

  /**
   * Normalise un numéro en E.164 (défaut Maroc). Twilio rejette les formats
   * locaux type "0666293811" (code 60200). Ex : 0666293811 → +212666293811.
   */
  toE164(raw: string): string {
    const s = String(raw ?? "").replace(/[\s\-().]/g, "");
    if (!s) return s;
    if (s.startsWith("+")) return s;
    if (s.startsWith("00")) return "+" + s.slice(2);
    if (s.startsWith("212")) return "+" + s;
    if (s.startsWith("0")) return "+212" + s.slice(1);
    return "+212" + s;
  }

  // ── Programmable Messaging (envoi SMS générique) ───────────────

  async sendSms(rawTo: string, body: string): Promise<SmsResult> {
    const toE164 = this.toE164(rawTo);
    if (!this.hasMessaging()) {
      this.log.warn(`[Twilio] Pas configuré pour Messaging — SMS à ${toE164} non envoyé (body: ${body.slice(0, 60)}…)`);
      return { ok: false, error: "Twilio non configuré" };
    }
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const token = process.env.TWILIO_AUTH_TOKEN!;
    const from = process.env.TWILIO_FROM!;
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
      return { ok: true, messageId: (data as any)?.sid };
    } catch (e: any) {
      this.log.error(`[Twilio] sendSms network fail: ${e?.message}`);
      return { ok: false, error: e?.message };
    }
  }

  // ── Twilio Verify (anti-fraude built-in, code géré par Twilio) ─

  async sendVerification(rawTo: string, channel: "sms" | "call" | "email" = "sms"): Promise<SmsResult> {
    const toE164 = this.toE164(rawTo);
    if (!this.hasVerify()) {
      // Fallback dev : génère un code local et le log
      const devCode = String(Math.floor(100000 + Math.random() * 900000));
      this.log.warn(`[Twilio Verify] Pas configuré — code dev ${devCode} pour ${toE164}`);
      return { ok: false, error: "Twilio Verify non configuré", devCode };
    }
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const token = process.env.TWILIO_AUTH_TOKEN!;
    const verifySid = process.env.TWILIO_VERIFY_SID!;
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
    } catch (e: any) {
      this.log.error(`[Twilio Verify] sendVerification network fail: ${e?.message}`);
      return { ok: false, error: e?.message };
    }
  }

  async checkVerification(rawTo: string, code: string): Promise<{ ok: boolean; approved: boolean; error?: string }> {
    const toE164 = this.toE164(rawTo);
    if (!this.hasVerify()) {
      return { ok: false, approved: false, error: "Twilio Verify non configuré" };
    }
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const token = process.env.TWILIO_AUTH_TOKEN!;
    const verifySid = process.env.TWILIO_VERIFY_SID!;
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
      const approved = (data as any)?.status === "approved";
      return { ok: true, approved };
    } catch (e: any) {
      this.log.error(`[Twilio Verify] checkVerification network fail: ${e?.message}`);
      return { ok: false, approved: false, error: e?.message };
    }
  }
}
