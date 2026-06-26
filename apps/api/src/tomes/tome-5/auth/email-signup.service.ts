import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { EmailService } from "../../../modules/email/email.service";
import { AuthService } from "./auth.service";

/**
 * EmailSignupService — inscription par LIEN de confirmation email (magic link),
 * sans SMS (Twilio mis en instance). Flux :
 *   1. requestLink(email, password, username) → crée le compte (emailVerifiedAt=null)
 *      + envoie un email avec un lien de confirmation.
 *   2. confirmLink(email, token) → marque l'email vérifié et connecte l'utilisateur
 *      (retourne un access_token).
 */
@Injectable()
export class EmailSignupService {
  private readonly log = new Logger("EmailSignupService");
  private readonly ttlMs = 24 * 60 * 60 * 1000; // lien valable 24 h

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly auth: AuthService,
  ) {}

  private sha256(s: string) {
    return createHash("sha256").update(s).digest("hex");
  }
  private maskEmail(e: string) {
    const [u, d] = e.split("@");
    return `${(u || "").slice(0, 2)}•••@${d || ""}`;
  }

  async requestLink(rawEmail: string, password: string, username?: string, phone?: string) {
    const email = (rawEmail || "").trim().toLowerCase();
    if (!email.includes("@")) throw new BadRequestException("Adresse email invalide.");
    if (!password || password.length < 6) throw new BadRequestException("Mot de passe trop court (6 caractères min).");

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.emailVerifiedAt) {
      throw new BadRequestException("Un compte confirmé existe déjà avec cet email. Connectez-vous.");
    }
    if (!user) {
      // Crée le compte (non vérifié). register() pose isActive + entitlements.
      const reg = await this.auth.register(email, password, username, phone);
      user = await this.prisma.user.findUnique({ where: { id: reg.user.id } });
    }
    if (!user) throw new BadRequestException("Échec de création du compte.");

    // Jeton de confirmation à usage unique.
    const token = randomBytes(24).toString("hex");
    const salt = randomBytes(8).toString("hex");
    const ctx = `email-confirm:${email}`;
    await this.prisma.otpChallenge.updateMany({ where: { contextKey: ctx, status: "PENDING" }, data: { status: "EXPIRED" } });
    await this.prisma.otpChallenge.create({
      data: {
        channel: "EMAIL",
        contextKey: ctx,
        destination: email,
        salt,
        codeHash: this.sha256(`${salt}:${token}`),
        expiresAt: new Date(Date.now() + this.ttlMs),
        meta: { userId: user.id },
      },
    });

    const base = (process.env.PUBLIC_WEB_URL || "https://citurbarea.com").replace(/\/$/, "");
    const link = `${base}/confirmer-email?token=${token}&email=${encodeURIComponent(email)}`;

    const er = await this.email.send({
      to: email,
      subject: "CITURBAREA — Confirmez votre compte",
      html: confirmEmailHtml(link),
      text: `Bienvenue sur CITURBAREA.\nConfirmez votre compte en cliquant sur ce lien (valable 24 h) :\n${link}`,
    });
    if (!er.ok) this.log.warn(`[email-signup] envoi email échoué pour ${email} : ${er.error}`);

    return {
      ok: true,
      maskedEmail: this.maskEmail(email),
      emailSent: er.ok,
      // En dev/diagnostic : lien renvoyé pour tester sans boîte mail.
      devLink: process.env.NODE_ENV !== "production" ? link : undefined,
    };
  }

  async confirmLink(rawEmail: string, token: string): Promise<{ ok: true; access_token: string; user: any }> {
    const email = (rawEmail || "").trim().toLowerCase();
    const code = (token || "").trim();
    if (!email || !code) throw new BadRequestException("Lien de confirmation invalide.");

    const ch = await this.prisma.otpChallenge.findFirst({
      where: { contextKey: `email-confirm:${email}`, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    if (!ch) throw new BadRequestException("Lien invalide ou déjà utilisé.");
    if (Date.now() > new Date(ch.expiresAt).getTime()) {
      await this.prisma.otpChallenge.update({ where: { id: ch.id }, data: { status: "EXPIRED" } });
      throw new BadRequestException("Lien de confirmation expiré. Recommencez l'inscription.");
    }
    if (this.sha256(`${ch.salt}:${code}`) !== ch.codeHash) {
      throw new BadRequestException("Lien de confirmation invalide.");
    }

    await this.prisma.otpChallenge.update({ where: { id: ch.id }, data: { status: "VERIFIED", verifiedAt: new Date() } });
    const userId = (ch.meta as any)?.userId as string;
    await this.prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });

    const tok = await this.auth.issueTokenForUser(userId);
    return { ok: true, access_token: tok.access_token, user: tok.user };
  }
}

function confirmEmailHtml(link: string): string {
  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;background:#FAF7F2;font-family:Inter,Segoe UI,sans-serif;color:#1A1F2E;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #E8E2D5;border-radius:12px;padding:32px">
    <div style="font-size:11px;letter-spacing:.22em;color:#B08D57;text-transform:uppercase;font-weight:600">CITURBAREA</div>
    <h1 style="font-family:Georgia,serif;font-size:22px;color:#0F2A4A;margin:10px 0 6px">Confirmez votre compte</h1>
    <p style="font-size:14px;color:#5C6373;line-height:1.6">Cliquez sur le bouton ci-dessous pour activer votre compte CITURBAREA. Vous serez connecté automatiquement.</p>
    <a href="${link}" style="display:inline-block;margin:18px 0;background:#0F2A4A;color:#FAF7F2;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:600;font-size:14px">Activer mon compte</a>
    <p style="font-size:12px;color:#8B91A1;line-height:1.55">Lien valable 24 heures. Si le bouton ne fonctionne pas, copiez ce lien :<br/><span style="color:#5C6373;word-break:break-all">${link}</span></p>
    <p style="font-size:12px;color:#8B91A1">Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.</p>
  </div></body></html>`;
}
