import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { EmailService } from "../../../modules/email/email.service";
import { TwilioService } from "../../../modules/twilio/twilio.service";

/**
 * PasswordResetService — mot de passe oublié (users Cercles / pros).
 *
 * Flow :
 *  1. request(email)            → génère 1 code 6 chiffres, envoie par EMAIL (Resend)
 *                                 ET par SMS (Twilio) si téléphone présent.
 *  2. confirm(email,code,newPw) → vérifie le code, applique le nouveau mot de passe.
 *
 * Un seul code, valable pour les deux canaux (email OU sms — l'un suffit).
 * Stockage : table OtpChallenge réutilisée (contextKey = "pwreset:<userId>").
 *
 * Sécurité :
 *  - anti-énumération : request() retourne toujours ok, même email inconnu
 *  - cooldown 60s entre 2 demandes, max 3 demandes / heure
 *  - code hashé SHA-256 + salt, TTL 10 min, max 5 tentatives
 */
@Injectable()
export class PasswordResetService {
  private readonly log = new Logger("PasswordResetService");
  private readonly ttlMs = 10 * 60 * 1000;
  private readonly maxAttempts = 5;
  private readonly cooldownMs = 60 * 1000;
  private readonly maxPerHour = 3;

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
  private maskPhone(p: string): string {
    const t = (p || "").trim();
    if (t.length < 6) return "•••";
    return t.slice(0, 4) + "••••" + t.slice(-2);
  }
  private maskEmail(e: string): string {
    const [u, d] = e.split("@");
    if (!d) return "•••";
    const head = u.length <= 2 ? u[0] : u.slice(0, 2);
    return `${head}•••@${d}`;
  }

  async request(rawEmail: string): Promise<{ ok: true; channels: string[]; maskedEmail?: string; maskedPhone?: string }> {
    const email = (rawEmail || "").trim().toLowerCase();
    if (!email || !email.includes("@")) throw new BadRequestException("Email invalide");

    const user = await this.prisma.user.findUnique({ where: { email } });
    // Anti-énumération : toujours ok, même si l'utilisateur n'existe pas
    if (!user || !user.isActive) {
      this.log.warn(`[pwreset] demande pour email inconnu/inactif : ${email}`);
      return { ok: true, channels: [] };
    }

    const ctx = `pwreset:${user.id}`;

    // Throttling : cooldown 60s + max 3/heure
    const recent = await this.prisma.otpChallenge.findFirst({
      where: { contextKey: ctx },
      orderBy: { lastSentAt: "desc" },
    });
    if (recent && Date.now() - new Date(recent.lastSentAt).getTime() < this.cooldownMs) {
      throw new BadRequestException("Veuillez patienter une minute avant de redemander un code.");
    }
    const lastHour = await this.prisma.otpChallenge.count({
      where: { contextKey: ctx, createdAt: { gte: new Date(Date.now() - 3600_000) } },
    });
    if (lastHour >= this.maxPerHour) {
      throw new BadRequestException("Trop de demandes. Réessayez dans une heure.");
    }

    // Un seul code, envoyé aux deux canaux
    const code = this.genCode();
    const salt = crypto.randomBytes(16).toString("hex");
    const codeHash = this.sha256(`${salt}:${code}`);
    const expiresAt = new Date(Date.now() + this.ttlMs);

    await this.prisma.otpChallenge.updateMany({
      where: { contextKey: ctx, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    await this.prisma.otpChallenge.create({
      data: {
        channel: "EMAIL",
        status: "PENDING",
        contextKey: ctx,
        destination: email,
        salt,
        codeHash,
        expiresAt,
        maxAttempts: this.maxAttempts,
        attempts: 0,
        lastSentAt: new Date(),
        meta: {},
      },
    });

    const channels: string[] = [];

    // Canal 1 : email via Resend
    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:24px auto;padding:0 16px;color:#1A1F2E;">
  <div style="background:#0F2A4A;color:#FAF7F2;padding:24px 28px;border-radius:8px 8px 0 0;">
    <div style="font-size:12px;letter-spacing:0.2em;color:#B08D57;">CITURBAREA · CERCLES</div>
    <h1 style="font-family:Georgia,serif;font-size:21px;margin:8px 0 0;font-weight:600;">Réinitialisation du mot de passe</h1>
  </div>
  <div style="background:#fff;padding:28px;border:1px solid #E8E2D5;border-top:0;border-radius:0 0 8px 8px;">
    <p style="font-size:15px;line-height:1.55;">Bonjour,</p>
    <p style="font-size:15px;line-height:1.55;">Voici votre code de réinitialisation :</p>
    <div style="text-align:center;margin:22px 0;">
      <span style="display:inline-block;font-size:34px;font-weight:700;letter-spacing:0.36em;color:#0F2A4A;background:#F2EDE3;padding:14px 26px;border-radius:8px;border:1px solid #E8E2D5;">${code}</span>
    </div>
    <p style="font-size:13px;color:#5C6373;line-height:1.55;">Ce code est valable <strong>10 minutes</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe reste inchangé.</p>
    <p style="font-size:13px;color:#8B91A1;margin-top:24px;">— L'équipe CITURBAREA</p>
  </div>
</body></html>`;
    const er = await this.email.send({
      to: email,
      subject: "CITURBAREA — Code de réinitialisation du mot de passe",
      html,
      text: `Votre code de réinitialisation CITURBAREA : ${code}\nValable 10 minutes.\nSi vous n'avez pas demandé cette réinitialisation, ignorez cet email.`,
    });
    if (er.ok) channels.push("email");
    else this.log.warn(`[pwreset] échec email pour ${email} : ${er.error}`);

    // Canal 2 : SMS via Twilio (si téléphone enregistré)
    let maskedPhone: string | undefined;
    if (user.phone) {
      const sr = await this.twilio.sendSms(
        user.phone,
        `CITURBAREA : votre code de reinitialisation est ${code}. Valable 10 min.`,
      );
      if (sr.ok) {
        channels.push("sms");
        maskedPhone = this.maskPhone(user.phone);
      } else {
        this.log.warn(`[pwreset] échec SMS pour ${user.phone} : ${sr.error}`);
      }
    }

    return { ok: true, channels, maskedEmail: this.maskEmail(email), maskedPhone };
  }

  async confirm(rawEmail: string, code: string, newPassword: string): Promise<{ ok: true }> {
    const email = (rawEmail || "").trim().toLowerCase();
    const c = (code || "").trim();
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException("Le nouveau mot de passe doit faire au moins 8 caractères.");
    }
    if (!c) throw new BadRequestException("Code requis.");

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException("Code incorrect ou expiré.");

    const ctx = `pwreset:${user.id}`;
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { contextKey: ctx, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge) throw new BadRequestException("Code incorrect ou expiré.");

    if (Date.now() > new Date(challenge.expiresAt).getTime()) {
      await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { status: "EXPIRED" } });
      throw new BadRequestException("Code expiré. Redemandez-en un.");
    }
    if (challenge.attempts >= challenge.maxAttempts) {
      await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { status: "LOCKED", lockedAt: new Date() } });
      throw new BadRequestException("Trop de tentatives. Redemandez un nouveau code.");
    }

    const expected = this.sha256(`${challenge.salt}:${c}`);
    if (expected !== challenge.codeHash) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      const left = challenge.maxAttempts - challenge.attempts - 1;
      throw new BadRequestException(`Code incorrect.${left > 0 ? ` ${left} tentative(s) restante(s).` : ""}`);
    }

    // Code valide → applique le nouveau mot de passe
    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { status: "VERIFIED", verifiedAt: new Date() },
    });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    this.log.log(`[pwreset] mot de passe réinitialisé pour ${email}`);
    return { ok: true };
  }
}
