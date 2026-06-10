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
exports.SignupVerificationService = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const email_service_1 = require("../../../modules/email/email.service");
const twilio_service_1 = require("../../../modules/twilio/twilio.service");
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
let SignupVerificationService = class SignupVerificationService {
    prisma;
    email;
    twilio;
    log = new common_1.Logger("SignupVerificationService");
    ttlMs = 10 * 60 * 1000;
    maxAttempts = 5;
    cooldownMs = 60 * 1000;
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
    maskEmail(e) {
        const [u, d] = e.split("@");
        if (!d)
            return "•••";
        const head = u.length <= 2 ? u[0] : u.slice(0, 2);
        return `${head}•••@${d}`;
    }
    maskPhone(p) {
        const t = (p || "").trim();
        if (t.length < 6)
            return "•••";
        return t.slice(0, 4) + "••••" + t.slice(-2);
    }
    async issueChallenge(channel, contextKey, destination) {
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
    /**
     * Variante SMS via Twilio Verify : le code est généré et stocké par Twilio,
     * pas côté CITURBAREA. On ne crée qu'un challenge "shell" en DB pour :
     *   - tracer la demande (cooldown, expiresAt, maxAttempts, status),
     *   - retrouver la destination depuis le contextKey au moment du confirm.
     *
     * Avantage : pas besoin de TWILIO_FROM (Verify gère son propre pool de
     * numéros émetteurs), anti-fraude built-in côté Twilio.
     *
     * codeHash = "TWILIO_VERIFY" (sentinel — la vérification réelle se fait via
     * twilio.checkVerification au confirm, pas par comparaison de hash local).
     */
    async issueSmsChallengeViaVerify(contextKey, phone) {
        await this.prisma.otpChallenge.updateMany({
            where: { contextKey, status: "PENDING" },
            data: { status: "EXPIRED" },
        });
        const r = await this.twilio.sendVerification(phone, "sms");
        if (!r.ok) {
            this.log.warn(`[signup] twilio.sendVerification échoué pour ${phone} : ${r.error}`);
            return { ok: false, error: r.error };
        }
        this.log.log(`[signup] Twilio Verify SMS envoyé à ${phone}`);
        await this.prisma.otpChallenge.create({
            data: {
                channel: "SMS",
                status: "PENDING",
                contextKey,
                destination: phone,
                salt: "verify-external",
                codeHash: "TWILIO_VERIFY", // sentinel : indique que la vérif passe par Twilio Verify, pas par hash local
                expiresAt: new Date(Date.now() + this.ttlMs),
                maxAttempts: this.maxAttempts,
                attempts: 0,
                lastSentAt: new Date(),
                meta: { provider: "twilio-verify" },
            },
        });
        return { ok: true };
    }
    /** Étape 1 — envoie un code par email ET un code par SMS. */
    async request(rawEmail, rawPhone) {
        const email = (rawEmail || "").trim().toLowerCase();
        const phone = (rawPhone || "").trim();
        if (!email || !email.includes("@"))
            throw new common_1.BadRequestException("Adresse email invalide.");
        if (phone.replace(/[^0-9+]/g, "").length < 8)
            throw new common_1.BadRequestException("Numéro de téléphone invalide.");
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing)
            throw new common_1.BadRequestException("Un compte existe déjà avec cet email.");
        const emailCtx = `signup-email:${email}`;
        const phoneCtx = `signup-phone:${email}`;
        // Cooldown : 60 s entre deux envois
        const recent = await this.prisma.otpChallenge.findFirst({
            where: { contextKey: emailCtx },
            orderBy: { lastSentAt: "desc" },
        });
        if (recent && Date.now() - new Date(recent.lastSentAt).getTime() < this.cooldownMs) {
            throw new common_1.BadRequestException("Veuillez patienter une minute avant de redemander des codes.");
        }
        const isProd = process.env.NODE_ENV === "production";
        // ── Canal 1 — email (challenge local hashé + envoi Resend) ────────────────
        const emailCode = await this.issueChallenge("EMAIL", emailCtx, email);
        let devEmailCode;
        const er = await this.email.send({
            to: email,
            subject: "CITURBAREA — Code de confirmation de votre email",
            html: signupEmailHtml(emailCode),
            text: `Votre code de confirmation email CITURBAREA : ${emailCode}\nValable 10 minutes.`,
        });
        if (!er.ok) {
            this.log.warn(`[signup] envoi email échoué pour ${email} : ${er.error}`);
            // Le code en clair n'est exposé qu'en DEV (sinon : fuite de sécurité —
            // un attaquant qui force un échec email pourrait récupérer le code).
            if (!isProd)
                devEmailCode = emailCode;
        }
        // ── Canal 2 — SMS via Twilio Verify (pas besoin de TWILIO_FROM) ──────────
        // Le code est généré et envoyé par Twilio. Côté CITURBAREA on ne stocke
        // qu'un challenge "shell" (pas de hash car la vérif passe par checkVerification).
        const sr = await this.issueSmsChallengeViaVerify(phoneCtx, phone);
        if (!sr.ok) {
            this.log.warn(`[signup] Twilio Verify échoué pour ${phone} : ${sr.error}`);
            // En PROD : faire échouer l'inscription (sinon le user n'a aucun moyen
            // de recevoir le code SMS et reste bloqué silencieusement).
            // En DEV : laisser passer mais signaler par devPhoneCode placeholder.
            if (isProd) {
                throw new common_1.BadRequestException("Envoi du code SMS impossible. Réessayez plus tard.");
            }
        }
        return {
            ok: true,
            maskedEmail: this.maskEmail(email),
            maskedPhone: this.maskPhone(phone),
            devEmailCode,
            // devPhoneCode : Twilio Verify ne nous communique pas le code (généré chez
            // eux). Pas de fuite possible côté API. Toujours undefined.
            devPhoneCode: undefined,
        };
    }
    async verifyOne(contextKey, rawCode, label) {
        const code = (rawCode || "").trim();
        if (!code)
            throw new common_1.BadRequestException(`Code ${label} requis.`);
        const challenge = await this.prisma.otpChallenge.findFirst({
            where: { contextKey, status: "PENDING" },
            orderBy: { createdAt: "desc" },
        });
        if (!challenge)
            throw new common_1.BadRequestException(`Code ${label} incorrect ou expiré.`);
        if (Date.now() > new Date(challenge.expiresAt).getTime()) {
            await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { status: "EXPIRED" } });
            throw new common_1.BadRequestException(`Code ${label} expiré. Redemandez de nouveaux codes.`);
        }
        if (challenge.attempts >= challenge.maxAttempts) {
            await this.prisma.otpChallenge.update({
                where: { id: challenge.id },
                data: { status: "LOCKED", lockedAt: new Date() },
            });
            throw new common_1.BadRequestException(`Trop de tentatives sur le code ${label}. Redemandez de nouveaux codes.`);
        }
        if (this.sha256(`${challenge.salt}:${code}`) !== challenge.codeHash) {
            await this.prisma.otpChallenge.update({
                where: { id: challenge.id },
                data: { attempts: { increment: 1 } },
            });
            const left = challenge.maxAttempts - challenge.attempts - 1;
            throw new common_1.BadRequestException(`Code ${label} incorrect.${left > 0 ? ` ${left} tentative(s) restante(s).` : ""}`);
        }
        await this.prisma.otpChallenge.update({
            where: { id: challenge.id },
            data: { status: "VERIFIED", verifiedAt: new Date() },
        });
    }
    /**
     * Vérification SMS via Twilio Verify : on appelle checkVerification côté
     * Twilio plutôt que de comparer un hash local. Le challenge en DB sert
     * uniquement à tracer cooldown / maxAttempts / expiresAt.
     */
    async verifyOneViaTwilioVerify(contextKey, rawCode, label) {
        const code = (rawCode || "").trim();
        if (!code)
            throw new common_1.BadRequestException(`Code ${label} requis.`);
        const challenge = await this.prisma.otpChallenge.findFirst({
            where: { contextKey, status: "PENDING" },
            orderBy: { createdAt: "desc" },
        });
        if (!challenge)
            throw new common_1.BadRequestException(`Code ${label} incorrect ou expiré.`);
        const now = new Date();
        if (now.getTime() > new Date(challenge.expiresAt).getTime()) {
            await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { status: "EXPIRED" } });
            throw new common_1.BadRequestException(`Code ${label} expiré. Redemandez de nouveaux codes.`);
        }
        if (challenge.attempts >= challenge.maxAttempts) {
            await this.prisma.otpChallenge.update({
                where: { id: challenge.id },
                data: { status: "LOCKED", lockedAt: now },
            });
            throw new common_1.BadRequestException(`Trop de tentatives sur le code ${label}. Redemandez de nouveaux codes.`);
        }
        const r = await this.twilio.checkVerification(challenge.destination, code);
        if (!r.ok || !r.approved) {
            await this.prisma.otpChallenge.update({
                where: { id: challenge.id },
                data: { attempts: { increment: 1 } },
            });
            const left = challenge.maxAttempts - challenge.attempts - 1;
            throw new common_1.BadRequestException(`Code ${label} incorrect.${left > 0 ? ` ${left} tentative(s) restante(s).` : ""}`);
        }
        await this.prisma.otpChallenge.update({
            where: { id: challenge.id },
            data: { status: "VERIFIED", verifiedAt: now },
        });
    }
    /** Étape 2 — vérifie les DEUX codes ; les deux doivent être valides. */
    async confirm(rawEmail, emailCode, phoneCode) {
        const email = (rawEmail || "").trim().toLowerCase();
        // Email : challenge local, comparaison hash sha256.
        await this.verifyOne(`signup-email:${email}`, emailCode, "email");
        // SMS : challenge externalisé Twilio Verify, comparaison côté Twilio.
        await this.verifyOneViaTwilioVerify(`signup-phone:${email}`, phoneCode, "SMS");
        return { ok: true };
    }
};
exports.SignupVerificationService = SignupVerificationService;
exports.SignupVerificationService = SignupVerificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService,
        twilio_service_1.TwilioService])
], SignupVerificationService);
function signupEmailHtml(code) {
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
