import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { EmailService } from "../../../modules/email/email.service";
import { TwilioService } from "../../../modules/twilio/twilio.service";

/**
 * SignupVerificationService — double validation (email + SMS) à l'inscription client.
 *
 * Flow :
 *  1. request(email, phone)  → 2 codes DISTINCTS, un envoyé par email, un par SMS.
 *  2. confirm(email, codes)  → vérifie LES DEUX codes ; l'un sans l'autre échoue.
 *
 * Stockage : table OtpChallenge — contextKey "signup-email:<email>" / "signup-phone:<email>".
 * Code 6 chiffres, hashé SHA-256 + sel, TTL 10 min, 5 tentatives max, cooldown 60 s.
 */
@Injectable()
export class SignupVerificationService {
  private readonly log = new Logger("SignupVerificationService");
  private readonly ttlMs = 10 * 60 * 1000;
  private readonly maxAttempts = 5;
  private readonly cooldownMs = 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly twilio: TwilioService,
  ) {}

  private sha256(s: string) {
    return crypto.createHash("sha256").update(s).digest("hex");
  }
  private genCode() {
    return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  }
  private maskEmail(e: string) {
    const [u, d] = e.split("@");
    if (!d) return "•••";
    const head = u.length <= 2 ? u[0] : u.slice(0, 2);
    return `${head}•••@${d}`;
  }
  private maskPhone(p: string) {
    const t = (p || "").trim();
    if (t.length < 6) return "•••";
    return t.slice(0, 4) + "••••" + t.slice(-2);
  }

  private async issueChallenge(channel: "EMAIL" | "SMS", contextKey: string, destination: string): Promise<string> {
    const code = this.genCode();
    const salt = crypto.randomBytes(16).toString("hex");
    await this.prisma.otpChallenge.updateMany({
      where: { contextKey, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    await this.prisma.otpChallenge.create({
      data: {
        channel,
        status: "PENDING",
        contextKey,
        destination,
        salt,
        codeHash: this.sha256(`${salt}:${code}`),
        expiresAt: new Date(Date.now() + this.ttlMs),
        maxAttempts: this.maxAttempts,
        attempts: 0,
        lastSentAt: new Date(),
        meta: {},
      },
    });
    return code;
  }

  /** Étape 1 — envoie un code par email ET un code par SMS. */
  async request(
    rawEmail: string,
    rawPhone: string,
  ): Promise<{ ok: true; maskedEmail: string; maskedPhone: string; devEmailCode?: string; devPhoneCode?: string }> {
    const email = (rawEmail || "").trim().toLowerCase();
    const phone = (rawPhone || "").trim();
    if (!email || !email.includes("@")) throw new BadRequestException("Adresse email invalide.");
    if (phone.replace(/[^0-9+]/g, "").length < 8) throw new BadRequestException("Numéro de téléphone invalide.");

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException("Un compte existe déjà avec cet email.");

    const emailCtx = `signup-email:${email}`;
    const phoneCtx = `signup-phone:${email}`;

    // Cooldown : 60 s entre deux envois
    const recent = await this.prisma.otpChallenge.findFirst({
      where: { contextKey: emailCtx },
      orderBy: { lastSentAt: "desc" },
    });
    if (recent && Date.now() - new Date(recent.lastSentAt).getTime() < this.cooldownMs) {
      throw new BadRequestException("Veuillez patienter une minute avant de redemander des codes.");
    }

    const emailCode = await this.issueChallenge("EMAIL", emailCtx, email);
    const phoneCode = await this.issueChallenge("SMS", phoneCtx, phone);

    // Canal 1 — email (Resend)
    let devEmailCode: string | undefined;
    const er = await this.email.send({
      to: email,
      subject: "CITURBAREA — Code de confirmation de votre email",
      html: signupEmailHtml(emailCode),
      text: `Votre code de confirmation email CITURBAREA : ${emailCode}\nValable 10 minutes.`,
    });
    if (!er.ok) {
      this.log.warn(`[signup] envoi email échoué pour ${email} : ${er.error}`);
      devEmailCode = emailCode;
    }

    // Canal 2 — SMS (Twilio)
    let devPhoneCode: string | undefined;
    const sr = await this.twilio.sendSms(
      phone,
      `CITURBAREA : votre code de confirmation est ${phoneCode}. Valable 10 min.`,
    );
    if (!sr.ok) {
      this.log.warn(`[signup] envoi SMS échoué pour ${phone} : ${sr.error}`);
      devPhoneCode = phoneCode;
    }

    return {
      ok: true,
      maskedEmail: this.maskEmail(email),
      maskedPhone: this.maskPhone(phone),
      devEmailCode,
      devPhoneCode,
    };
  }

  private async verifyOne(contextKey: string, rawCode: string, label: string): Promise<void> {
    const code = (rawCode || "").trim();
    if (!code) throw new BadRequestException(`Code ${label} requis.`);

    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { contextKey, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge) throw new BadRequestException(`Code ${label} incorrect ou expiré.`);

    if (Date.now() > new Date(challenge.expiresAt).getTime()) {
      await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { status: "EXPIRED" } });
      throw new BadRequestException(`Code ${label} expiré. Redemandez de nouveaux codes.`);
    }
    if (challenge.attempts >= challenge.maxAttempts) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { status: "LOCKED", lockedAt: new Date() },
      });
      throw new BadRequestException(`Trop de tentatives sur le code ${label}. Redemandez de nouveaux codes.`);
    }
    if (this.sha256(`${challenge.salt}:${code}`) !== challenge.codeHash) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      const left = challenge.maxAttempts - challenge.attempts - 1;
      throw new BadRequestException(`Code ${label} incorrect.${left > 0 ? ` ${left} tentative(s) restante(s).` : ""}`);
    }
    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { status: "VERIFIED", verifiedAt: new Date() },
    });
  }

  /** Étape 2 — vérifie les DEUX codes ; les deux doivent être valides. */
  async confirm(rawEmail: string, emailCode: string, phoneCode: string): Promise<{ ok: true }> {
    const email = (rawEmail || "").trim().toLowerCase();
    await this.verifyOne(`signup-email:${email}`, emailCode, "email");
    await this.verifyOne(`signup-phone:${email}`, phoneCode, "SMS");
    return { ok: true };
  }
}

function signupEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:24px auto;padding:0 16px;color:#1A1F2E;">
  <div style="background:#0F2A4A;color:#FAF7F2;padding:24px 28px;border-radius:8px 8px 0 0;">
    <div style="font-size:12px;letter-spacing:0.2em;color:#B08D57;">CITURBAREA</div>
    <h1 style="font-family:Georgia,serif;font-size:21px;margin:8px 0 0;font-weight:600;">Confirmation de votre email</h1>
  </div>
  <div style="background:#fff;padding:28px;border:1px solid #E8E2D5;border-top:0;border-radius:0 0 8px 8px;">
    <p style="font-size:15px;line-height:1.55;">Bonjour,</p>
    <p style="font-size:15px;line-height:1.55;">Voici votre code de confirmation pour créer votre espace client :</p>
    <div style="text-align:center;margin:22px 0;">
      <span style="display:inline-block;font-size:34px;font-weight:700;letter-spacing:0.36em;color:#0F2A4A;background:#F2EDE3;padding:14px 26px;border-radius:8px;border:1px solid #E8E2D5;">${code}</span>
    </div>
    <p style="font-size:13px;color:#5C6373;line-height:1.55;">Ce code est valable <strong>10 minutes</strong>. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.</p>
    <p style="font-size:13px;color:#8B91A1;margin-top:24px;">— L'équipe CITURBAREA</p>
  </div>
</body></html>`;
}
