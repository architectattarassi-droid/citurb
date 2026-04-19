import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";
import { PrismaService } from "../kernel";

type Channel = "EMAIL" | "SMS";

type RequestOtpResult =
  | { ok: true; expiresInSec: number; devCode?: string }
  | { ok: false; message: string };

type VerifyOtpResult =
  | { ok: true }
  | { ok: false; message: string };

@Injectable()
export class OtpService {
  private readonly log = new Logger(OtpService.name);

  // Defaults (can be externalized later)
  private readonly ttlMs = 10 * 60 * 1000;
  private readonly cooldownMs = 60 * 1000;
  private readonly maxAttempts = 5;

  constructor(private readonly prisma: PrismaService) {}

  private isProd() {
    return (process.env.NODE_ENV || "development") === "production";
  }

  private normalizeEmail(email: string) {
    return (email || "").trim().toLowerCase();
  }

  private normalizePhone(phone: string) {
    return (phone || "").trim();
  }

  private genCode() {
    const n = crypto.randomInt(0, 1000000);
    return String(n).padStart(6, "0");
  }

  private sha256(s: string) {
    return crypto.createHash("sha256").update(s).digest("hex");
  }

  private ensureProvidersOrThrow(channel: Channel) {
    if (!this.isProd()) return;

    if (channel === "EMAIL") {
      const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
      if (!(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS)) {
        throw new Error("SMTP non configuré (production). ");
      }
      return;
    }

    // SMS
    const smsEnabled = String(process.env.SMS_ENABLED || "false") === "true";
    if (!smsEnabled) return;
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;
    if (!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM)) {
      throw new Error("Provider SMS non configuré (production). ");
    }
  }

  async requestEmailOtp(contextKey: string, email: string, meta: any): Promise<RequestOtpResult> {
    const destination = this.normalizeEmail(email);
    if (!contextKey) return { ok: false, message: "Action impossible." };
    if (!destination) return { ok: false, message: "Email requis." };
    return this.requestOtp("EMAIL", contextKey, destination, meta);
  }

  async requestSmsOtp(contextKey: string, phone: string, meta: any): Promise<RequestOtpResult> {
    const destination = this.normalizePhone(phone);
    if (!contextKey) return { ok: false, message: "Action impossible." };
    if (!destination) return { ok: false, message: "Téléphone requis." };
    return this.requestOtp("SMS", contextKey, destination, meta);
  }

  private async requestOtp(channel: Channel, contextKey: string, destination: string, meta: any): Promise<RequestOtpResult> {
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
      } else {
        await this.sendSms(destination, code);
      }

      return { ok: true, expiresInSec: Math.round(this.ttlMs / 1000), devCode: this.isProd() ? undefined : code };
    } catch (e: any) {
      const msg = e?.message || String(e);
      this.log.warn(`[OTP] request failed: ${msg}`);
      return { ok: false, message: this.isProd() ? "Action impossible." : msg };
    }
  }

  async verifyEmailOtp(contextKey: string, code: string): Promise<VerifyOtpResult> {
    return this.verifyOtp("EMAIL", contextKey, code);
  }

  async verifySmsOtp(contextKey: string, code: string): Promise<VerifyOtpResult> {
    return this.verifyOtp("SMS", contextKey, code);
  }

  private async verifyOtp(channel: Channel, contextKey: string, code: string): Promise<VerifyOtpResult> {
    try {
      const c = String(code || "").trim();
      if (!contextKey) return { ok: false, message: "Action impossible." };
      if (!c) return { ok: false, message: "Code manquant." };

      // Latest pending challenge for contextKey+channel
      const challenge = await this.prisma.otpChallenge.findFirst({
        where: { contextKey, channel, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      });

      if (!challenge) return { ok: false, message: "Code incorrect ou expiré." };

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
    } catch (e: any) {
      const msg = e?.message || String(e);
      this.log.warn(`[OTP] verify failed: ${msg}`);
      return { ok: false, message: this.isProd() ? "Action impossible." : msg };
    }
  }

  private async sendEmail(to: string, code: string, meta: any) {
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
      if (!this.isProd()) this.log.log(`[DEV][EMAIL] sent via SMTP to=${to} host=${smtpHost}:${smtpPort}`);
      return;
    }

    if (this.isProd()) {
      throw new Error("SMTP non configuré.");
    }

    // DEV fallback
    // eslint-disable-next-line no-console
    console.log(`\n[CITURBAREA EMAIL DEV] TO: ${to}\nSUBJECT: ${subject}\n\n${text}\n`);
  }

  async sendVerification(phone: string): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const verifySid = process.env.TWILIO_VERIFY_SID!;
    const twilio = require('twilio')(accountSid, authToken);
    const result = await twilio.verify.v2.services(verifySid)
      .verifications.create({ to: phone, channel: 'sms' });
    console.log(`[OTP] Twilio Verify sent to ${phone} — status: ${result.status}`);
  }

  async checkVerification(phone: string, code: string): Promise<boolean> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const verifySid = process.env.TWILIO_VERIFY_SID!;
    const twilio = require('twilio')(accountSid, authToken);
    const result = await twilio.verify.v2.services(verifySid)
      .verificationChecks.create({ to: phone, code });
    console.log(`[OTP] Twilio Verify check ${phone} — status: ${result.status}`);
    return result.status === 'approved';
  }

  private async sendSms(to: string, code: string) {
    const msg = `CITURBAREA: votre code est ${code}. Valable 10 min.`;
    const twSid = process.env.TWILIO_ACCOUNT_SID;
    const twToken = process.env.TWILIO_AUTH_TOKEN;
    const twFrom = process.env.TWILIO_FROM;

    const smsEnabled = String(process.env.SMS_ENABLED || "false") === "true";
    if (!smsEnabled) {
      if (!this.isProd()) this.log.log(`[DEV][SMS disabled] to=${to} msg=${msg}`);
      return;
    }

    if (twSid && twToken && twFrom) {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twSid)}/Messages.json`;
      const body = new URLSearchParams({ From: twFrom, To: to, Body: msg });
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
        if (this.isProd()) throw new Error("Envoi SMS impossible.");
      }
      return;
    }

    if (this.isProd()) {
      throw new Error("Provider SMS non configuré.");
    }

    this.log.log(`[DEV][SMS] to=${to}: ${msg}`);
  }
}
