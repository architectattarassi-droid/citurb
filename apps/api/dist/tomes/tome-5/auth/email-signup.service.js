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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailSignupService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const email_service_1 = require("../../../modules/email/email.service");
const auth_service_1 = require("./auth.service");
/**
 * EmailSignupService — inscription par LIEN de confirmation email (magic link),
 * sans SMS (Twilio mis en instance). Flux :
 *   1. requestLink(email, password, username) → crée le compte (emailVerifiedAt=null)
 *      + envoie un email avec un lien de confirmation.
 *   2. confirmLink(email, token) → marque l'email vérifié et connecte l'utilisateur
 *      (retourne un access_token).
 */
let EmailSignupService = class EmailSignupService {
    prisma;
    email;
    auth;
    log = new common_1.Logger("EmailSignupService");
    ttlMs = 24 * 60 * 60 * 1000; // lien valable 24 h
    constructor(prisma, email, auth) {
        this.prisma = prisma;
        this.email = email;
        this.auth = auth;
    }
    sha256(s) {
        return (0, crypto_1.createHash)("sha256").update(s).digest("hex");
    }
    maskEmail(e) {
        const [u, d] = e.split("@");
        return `${(u || "").slice(0, 2)}•••@${d || ""}`;
    }
    async requestLink(rawEmail, password, username, phone) {
        const email = (rawEmail || "").trim().toLowerCase();
        if (!email.includes("@"))
            throw new common_1.BadRequestException("Adresse email invalide.");
        if (!password || password.length < 6)
            throw new common_1.BadRequestException("Mot de passe trop court (6 caractères min).");
        let user = await this.prisma.user.findUnique({ where: { email } });
        if (user && user.emailVerifiedAt) {
            throw new common_1.BadRequestException("Un compte confirmé existe déjà avec cet email. Connectez-vous.");
        }
        if (!user) {
            // Crée le compte (non vérifié). register() pose isActive + entitlements.
            const reg = await this.auth.register(email, password, username, phone);
            user = await this.prisma.user.findUnique({ where: { id: reg.user.id } });
        }
        if (!user)
            throw new common_1.BadRequestException("Échec de création du compte.");
        // Jeton de confirmation à usage unique.
        const token = (0, crypto_1.randomBytes)(24).toString("hex");
        const salt = (0, crypto_1.randomBytes)(8).toString("hex");
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
        if (!er.ok)
            this.log.warn(`[email-signup] envoi email échoué pour ${email} : ${er.error}`);
        return {
            ok: true,
            maskedEmail: this.maskEmail(email),
            emailSent: er.ok,
            // En dev/diagnostic : lien renvoyé pour tester sans boîte mail.
            devLink: process.env.NODE_ENV !== "production" ? link : undefined,
        };
    }
    async confirmLink(rawEmail, token) {
        const email = (rawEmail || "").trim().toLowerCase();
        const code = (token || "").trim();
        if (!email || !code)
            throw new common_1.BadRequestException("Lien de confirmation invalide.");
        const ch = await this.prisma.otpChallenge.findFirst({
            where: { contextKey: `email-confirm:${email}`, status: "PENDING" },
            orderBy: { createdAt: "desc" },
        });
        if (!ch)
            throw new common_1.BadRequestException("Lien invalide ou déjà utilisé.");
        if (Date.now() > new Date(ch.expiresAt).getTime()) {
            await this.prisma.otpChallenge.update({ where: { id: ch.id }, data: { status: "EXPIRED" } });
            throw new common_1.BadRequestException("Lien de confirmation expiré. Recommencez l'inscription.");
        }
        if (this.sha256(`${ch.salt}:${code}`) !== ch.codeHash) {
            throw new common_1.BadRequestException("Lien de confirmation invalide.");
        }
        await this.prisma.otpChallenge.update({ where: { id: ch.id }, data: { status: "VERIFIED", verifiedAt: new Date() } });
        const userId = ch.meta?.userId;
        await this.prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
        const tok = await this.auth.issueTokenForUser(userId);
        return { ok: true, access_token: tok.access_token, user: tok.user };
    }
};
exports.EmailSignupService = EmailSignupService;
exports.EmailSignupService = EmailSignupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService,
        auth_service_1.AuthService])
], EmailSignupService);
function confirmEmailHtml(link) {
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
