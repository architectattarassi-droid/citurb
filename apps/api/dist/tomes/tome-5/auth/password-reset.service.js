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
exports.PasswordResetService = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const email_service_1 = require("../../../modules/email/email.service");
const twilio_service_1 = require("../../../modules/twilio/twilio.service");
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
let PasswordResetService = class PasswordResetService {
    prisma;
    email;
    twilio;
    log = new common_1.Logger("PasswordResetService");
    ttlMs = 10 * 60 * 1000;
    maxAttempts = 5;
    cooldownMs = 60 * 1000;
    maxPerHour = 3;
    constructor(prisma, email, twilio) {
        this.prisma = prisma;
        this.email = email;
        this.twilio = twilio;
    }
    sha256(s) {
        return crypto.createHash("sha256").update(s).digest("hex");
    }
    genCode() {
        return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    }
    maskPhone(p) {
        const t = (p || "").trim();
        if (t.length < 6)
            return "•••";
        return t.slice(0, 4) + "••••" + t.slice(-2);
    }
    maskEmail(e) {
        const [u, d] = e.split("@");
        if (!d)
            return "•••";
        const head = u.length <= 2 ? u[0] : u.slice(0, 2);
        return `${head}•••@${d}`;
    }
    async request(rawEmail) {
        const email = (rawEmail || "").trim().toLowerCase();
        if (!email || !email.includes("@"))
            throw new common_1.BadRequestException("Email invalide");
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
            throw new common_1.BadRequestException("Veuillez patienter une minute avant de redemander un code.");
        }
        const lastHour = await this.prisma.otpChallenge.count({
            where: { contextKey: ctx, createdAt: { gte: new Date(Date.now() - 3600_000) } },
        });
        if (lastHour >= this.maxPerHour) {
            throw new common_1.BadRequestException("Trop de demandes. Réessayez dans une heure.");
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
        const channels = [];
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
        if (er.ok)
            channels.push("email");
        else
            this.log.warn(`[pwreset] échec email pour ${email} : ${er.error}`);
        // Canal 2 : SMS via Twilio (si téléphone enregistré)
        let maskedPhone;
        if (user.phone) {
            const sr = await this.twilio.sendSms(user.phone, `CITURBAREA : votre code de reinitialisation est ${code}. Valable 10 min.`);
            if (sr.ok) {
                channels.push("sms");
                maskedPhone = this.maskPhone(user.phone);
            }
            else {
                this.log.warn(`[pwreset] échec SMS pour ${user.phone} : ${sr.error}`);
            }
        }
        return { ok: true, channels, maskedEmail: this.maskEmail(email), maskedPhone };
    }
    async confirm(rawEmail, code, newPassword) {
        const email = (rawEmail || "").trim().toLowerCase();
        const c = (code || "").trim();
        if (!newPassword || newPassword.length < 8) {
            throw new common_1.BadRequestException("Le nouveau mot de passe doit faire au moins 8 caractères.");
        }
        if (!c)
            throw new common_1.BadRequestException("Code requis.");
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new common_1.BadRequestException("Code incorrect ou expiré.");
        const ctx = `pwreset:${user.id}`;
        const challenge = await this.prisma.otpChallenge.findFirst({
            where: { contextKey: ctx, status: "PENDING" },
            orderBy: { createdAt: "desc" },
        });
        if (!challenge)
            throw new common_1.BadRequestException("Code incorrect ou expiré.");
        if (Date.now() > new Date(challenge.expiresAt).getTime()) {
            await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { status: "EXPIRED" } });
            throw new common_1.BadRequestException("Code expiré. Redemandez-en un.");
        }
        if (challenge.attempts >= challenge.maxAttempts) {
            await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { status: "LOCKED", lockedAt: new Date() } });
            throw new common_1.BadRequestException("Trop de tentatives. Redemandez un nouveau code.");
        }
        const expected = this.sha256(`${challenge.salt}:${c}`);
        if (expected !== challenge.codeHash) {
            await this.prisma.otpChallenge.update({
                where: { id: challenge.id },
                data: { attempts: { increment: 1 } },
            });
            const left = challenge.maxAttempts - challenge.attempts - 1;
            throw new common_1.BadRequestException(`Code incorrect.${left > 0 ? ` ${left} tentative(s) restante(s).` : ""}`);
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
};
exports.PasswordResetService = PasswordResetService;
exports.PasswordResetService = PasswordResetService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService,
        twilio_service_1.TwilioService])
], PasswordResetService);
