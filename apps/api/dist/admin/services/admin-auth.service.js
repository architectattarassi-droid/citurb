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
exports.AdminAuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const admin_audit_service_1 = require("./admin-audit.service");
const admin_rate_limit_service_1 = require("./admin-rate-limit.service");
const admin_notify_service_1 = require("./admin-notify.service");
const twilio_service_1 = require("../../modules/twilio/twilio.service");
const device_fingerprint_1 = require("../utils/device-fingerprint");
const crypto_1 = require("crypto");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcryptjs");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require("nodemailer");
const OTP_TTL_MS = 5 * 60_000; // 5 min
const SESSION_TTL_MS = 30 * 60_000; // 30 min pour finir tout le flow
const JWT_TTL_MS = 15 * 60_000; // 15 min après FULLY_AUTH
let AdminAuthService = class AdminAuthService {
    prisma;
    jwt;
    audit;
    rateLimit;
    notify;
    twilio;
    log = new common_1.Logger("AdminAuthService");
    constructor(prisma, jwt, audit, rateLimit, notify, twilio) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.audit = audit;
        this.rateLimit = rateLimit;
        this.notify = notify;
        this.twilio = twilio;
    }
    // ── Étape 1 : Password ───────────────────────────────────────────
    async loginPassword(email, password, ctx) {
        if (!email || !password)
            throw new common_1.BadRequestException("Email + password requis");
        const cleanEmail = email.trim().toLowerCase();
        // Rate limit par email ET par IP
        const rlEmail = await this.rateLimit.check("LOGIN", `email:${cleanEmail}`);
        if (rlEmail.locked)
            throw new common_1.ForbiddenException(`Trop de tentatives. Réessaie dans ${rlEmail.retryAfterSec}s.`);
        const rlIp = await this.rateLimit.check("LOGIN", `ip:${ctx.ipAddress}`);
        if (rlIp.locked)
            throw new common_1.ForbiddenException(`Trop de tentatives depuis cette IP. Réessaie dans ${rlIp.retryAfterSec}s.`);
        const admin = await this.prisma.adminUser.findUnique({ where: { email: cleanEmail } });
        if (!admin) {
            await this.rateLimit.increment("LOGIN", `email:${cleanEmail}`);
            await this.rateLimit.increment("LOGIN", `ip:${ctx.ipAddress}`);
            await this.audit.record({
                action: "ADMIN_LOGIN_FAIL", category: "AUTH", severity: "WARN",
                payload: { reason: "unknown_email", emailAttempt: cleanEmail },
                ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, deviceFingerprint: ctx.deviceFingerprint,
            });
            throw new common_1.UnauthorizedException("Identifiants invalides");
        }
        if (!admin.isActive || admin.suspendedAt) {
            throw new common_1.ForbiddenException("Compte admin suspendu");
        }
        if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
            throw new common_1.ForbiddenException(`Compte verrouillé jusqu'à ${admin.lockedUntil.toISOString()}`);
        }
        const passwordOk = await bcrypt.compare(password, admin.passwordHash);
        if (!passwordOk) {
            // Failed attempt counter
            const newFailedAttempts = admin.failedAttempts + 1;
            const lockedUntil = newFailedAttempts >= 5 ? new Date(Date.now() + 60 * 60_000) : null;
            await this.prisma.adminUser.update({
                where: { id: admin.id },
                data: { failedAttempts: newFailedAttempts, lockedUntil },
            });
            await this.rateLimit.increment("LOGIN", `email:${cleanEmail}`);
            await this.rateLimit.increment("LOGIN", `ip:${ctx.ipAddress}`);
            await this.audit.record({
                adminUserId: admin.id,
                action: "ADMIN_LOGIN_FAIL", category: "AUTH", severity: "WARN",
                payload: { reason: "wrong_password", failedAttempts: newFailedAttempts, locked: !!lockedUntil },
                ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, deviceFingerprint: ctx.deviceFingerprint,
            });
            if (lockedUntil) {
                await this.notify.alert({
                    adminUserId: admin.id,
                    severity: "CRITICAL", category: "ACCOUNT_LOCKED",
                    title: "Compte admin verrouillé (5 échecs)",
                    message: `Compte ${cleanEmail} verrouillé 1h après 5 tentatives de password échouées depuis IP ${ctx.ipAddress}.`,
                    emailTo: admin.email,
                    smsTo: admin.phoneE164 || undefined,
                });
            }
            throw new common_1.UnauthorizedException("Identifiants invalides");
        }
        // Password OK → créer session étape 1, reset failed counter
        await this.prisma.adminUser.update({
            where: { id: admin.id },
            data: { failedAttempts: 0, lockedUntil: null },
        });
        const sessionToken = (0, device_fingerprint_1.generateSessionToken)();
        const session = await this.prisma.adminSession.create({
            data: {
                adminUserId: admin.id,
                step: "PASSWORD_OK",
                sessionToken,
                ipAddress: ctx.ipAddress,
                userAgent: ctx.userAgent,
                deviceFingerprint: ctx.deviceFingerprint,
                passwordOkAt: new Date(),
                expiresAt: new Date(Date.now() + SESSION_TTL_MS),
            },
        });
        // Vérification nouvelle IP : alerte (mais on continue)
        const knownIps = await this.prisma.adminAllowedIp.findMany({
            where: { adminUserId: admin.id, revokedAt: null },
            select: { cidr: true },
        });
        const ipIsKnown = knownIps.some((k) => (0, device_fingerprint_1.ipInCidr)(ctx.ipAddress, k.cidr));
        if (!ipIsKnown && knownIps.length > 0) {
            await this.notify.alert({
                adminUserId: admin.id,
                severity: "WARN", category: "LOGIN_NEW_IP",
                title: "Connexion admin depuis nouvelle IP",
                message: `Étape password validée depuis ${ctx.ipAddress} (${ctx.userAgent.slice(0, 80)}). Si ce n'est pas toi, change ton password.`,
                emailTo: admin.email,
                smsTo: admin.phoneE164 || undefined,
            });
        }
        // Génère et envoie OTP email
        const emailOtp = this.genOtpCode();
        await this.storeOtp(session.id, "EMAIL", emailOtp);
        await this.sendEmailOtp(admin.email, emailOtp, admin.displayName);
        await this.audit.record({
            adminUserId: admin.id,
            action: "ADMIN_LOGIN_STEP1_PASSWORD_OK", category: "AUTH", severity: "INFO",
            payload: { sessionId: session.id, newIp: !ipIsKnown },
            ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, deviceFingerprint: ctx.deviceFingerprint,
            sessionId: session.id,
        });
        return {
            sessionToken,
            step: "PASSWORD_OK",
            nextStep: "EMAIL_OTP",
            message: `Code envoyé par email à ${this.maskEmail(admin.email)}`,
        };
    }
    // ── Étape 2 : OTP Email ─────────────────────────────────────────
    async verifyEmailOtp(sessionToken, code, ctx) {
        const session = await this.loadSession(sessionToken);
        if (session.step !== "PASSWORD_OK")
            throw new common_1.BadRequestException("Étape invalide");
        await this.assertOtp(session.id, "EMAIL", code);
        await this.prisma.adminSession.update({
            where: { id: session.id },
            data: { step: "EMAIL_OTP_OK", emailOtpOkAt: new Date() },
        });
        // Envoie OTP SMS via Twilio Verify (Twilio gère la génération + envoi du code)
        const admin = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: session.adminUserId } });
        if (!admin.phoneE164) {
            throw new common_1.BadRequestException("Téléphone non configuré pour ce compte admin");
        }
        const verifyResult = await this.twilio.sendVerification(admin.phoneE164, "sms");
        if (!verifyResult.ok && !verifyResult.devCode) {
            this.log.error(`[ADMIN] Twilio Verify fail pour ${admin.phoneE164}: ${verifyResult.error}`);
        }
        if (verifyResult.devCode) {
            // Mode dev : on stocke le code local pour permettre verify offline
            await this.storeOtp(session.id, "SMS", verifyResult.devCode);
            this.log.warn(`[ADMIN OTP SMS] code dev ${verifyResult.devCode} pour ${admin.phoneE164}`);
        }
        await this.audit.record({
            adminUserId: session.adminUserId,
            action: "ADMIN_LOGIN_STEP2_EMAIL_OK", category: "AUTH", severity: "INFO",
            ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, deviceFingerprint: ctx.deviceFingerprint,
            sessionId: session.id,
        });
        return { step: "EMAIL_OTP_OK", nextStep: "SMS_OTP", message: `Code envoyé par SMS à ${this.maskPhone(admin.phoneE164)}` };
    }
    // ── Étape 3 : OTP SMS via Twilio Verify ──────────────────────────
    async verifySmsOtp(sessionToken, code, ctx) {
        const session = await this.loadSession(sessionToken);
        if (session.step !== "EMAIL_OTP_OK")
            throw new common_1.BadRequestException("Étape invalide");
        const admin = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: session.adminUserId } });
        if (!admin.phoneE164)
            throw new common_1.BadRequestException("Téléphone non configuré");
        // Si Twilio Verify dispo → check via Twilio. Sinon fallback DB locale (mode dev).
        if (this.twilio.hasVerify()) {
            const check = await this.twilio.checkVerification(admin.phoneE164, code);
            if (!check.approved) {
                await this.audit.record({
                    adminUserId: session.adminUserId,
                    action: "ADMIN_LOGIN_SMS_FAIL", category: "AUTH", severity: "WARN",
                    payload: { reason: "twilio_verify_not_approved" },
                    sessionId: session.id,
                });
                throw new common_1.UnauthorizedException("Code SMS incorrect ou expiré");
            }
        }
        else {
            // Fallback dev : utilise OtpChallenge DB
            await this.assertOtp(session.id, "SMS", code);
        }
        await this.prisma.adminSession.update({
            where: { id: session.id },
            data: { step: "SMS_OTP_OK", smsOtpOkAt: new Date() },
        });
        await this.audit.record({
            adminUserId: session.adminUserId,
            action: "ADMIN_LOGIN_STEP3_SMS_OK", category: "AUTH", severity: "INFO",
            ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, deviceFingerprint: ctx.deviceFingerprint,
            sessionId: session.id,
        });
        // Check si admin a au moins 1 WebAuthn credential
        const credCount = await this.prisma.webAuthnCredential.count({
            where: { adminUserId: session.adminUserId, revokedAt: null },
        });
        return {
            step: "SMS_OTP_OK",
            nextStep: credCount > 0 ? "WEBAUTHN" : "WEBAUTHN_REGISTER",
            message: credCount > 0
                ? "Validation par empreinte / clé requise"
                : "Aucun passkey enregistré — enregistre Windows Hello ou YubiKey maintenant",
        };
    }
    // ── Étape 4 : WebAuthn — délégué à AdminWebAuthnService ────────
    // (cf admin-webauthn.service.ts dans H4)
    // ── Helpers ─────────────────────────────────────────────────────
    async loadSession(sessionToken) {
        if (!sessionToken)
            throw new common_1.UnauthorizedException("Session token manquant");
        const session = await this.prisma.adminSession.findUnique({ where: { sessionToken } });
        if (!session)
            throw new common_1.UnauthorizedException("Session introuvable");
        if (session.revokedAt)
            throw new common_1.UnauthorizedException("Session révoquée");
        if (session.expiresAt.getTime() < Date.now())
            throw new common_1.UnauthorizedException("Session expirée");
        return session;
    }
    /**
     * Stocke un OTP dans le payload de la session (en clair pour cette session uniquement
     * — l'OTP est éphémère et le sessionToken est secret).
     * Alternative possible : table dédiée. Ici simplifié pour Sprint H.
     */
    async storeOtp(sessionId, channel, code) {
        const expiresAt = new Date(Date.now() + OTP_TTL_MS);
        // On utilise OtpChallenge (table déjà existante) avec contextKey = "admin-session:<id>:<channel>"
        await this.prisma.otpChallenge.updateMany({
            where: { contextKey: `admin-session:${sessionId}:${channel}`, status: "PENDING" },
            data: { status: "EXPIRED" },
        });
        const salt = (0, crypto_1.randomBytes)(16).toString("hex");
        const { createHash } = await Promise.resolve().then(() => require("crypto"));
        const codeHash = createHash("sha256").update(`${salt}:${code}`).digest("hex");
        await this.prisma.otpChallenge.create({
            data: {
                channel,
                status: "PENDING",
                contextKey: `admin-session:${sessionId}:${channel}`,
                destination: `session:${sessionId}`,
                salt,
                codeHash,
                expiresAt,
                maxAttempts: 5,
                attempts: 0,
                lastSentAt: new Date(),
            },
        });
    }
    async assertOtp(sessionId, channel, code) {
        const trimmed = (code || "").trim();
        if (!/^\d{6}$/.test(trimmed))
            throw new common_1.BadRequestException("Code OTP invalide");
        const challenge = await this.prisma.otpChallenge.findFirst({
            where: { contextKey: `admin-session:${sessionId}:${channel}`, status: "PENDING" },
            orderBy: { createdAt: "desc" },
        });
        if (!challenge)
            throw new common_1.UnauthorizedException("Code expiré ou inexistant");
        if (challenge.expiresAt.getTime() < Date.now()) {
            await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { status: "EXPIRED" } });
            throw new common_1.UnauthorizedException("Code expiré");
        }
        if (challenge.attempts >= challenge.maxAttempts) {
            await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { status: "LOCKED" } });
            throw new common_1.ForbiddenException("Trop de tentatives. Relance le flow.");
        }
        const { createHash } = await Promise.resolve().then(() => require("crypto"));
        const expected = createHash("sha256").update(`${challenge.salt}:${trimmed}`).digest("hex");
        if (expected !== challenge.codeHash) {
            await this.prisma.otpChallenge.update({
                where: { id: challenge.id },
                data: { attempts: { increment: 1 } },
            });
            throw new common_1.UnauthorizedException("Code incorrect");
        }
        await this.prisma.otpChallenge.update({
            where: { id: challenge.id },
            data: { status: "VERIFIED", verifiedAt: new Date() },
        });
    }
    genOtpCode() {
        return String((0, crypto_1.randomInt)(0, 1_000_000)).padStart(6, "0");
    }
    maskEmail(email) {
        const [user, domain] = email.split("@");
        if (!domain)
            return email;
        return `${user.slice(0, 2)}***@${domain}`;
    }
    maskPhone(phone) {
        return phone.replace(/^(\+\d{3})\d+(\d{2})$/, "$1•••••$2");
    }
    // ── Envoi OTP ──────────────────────────────────────────────────
    async sendEmailOtp(to, code, name) {
        const subject = `CITURBAREA Admin — Code de connexion : ${code}`;
        const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 24px auto; padding: 0 16px; color: #1A1F2E;">
  <div style="background: #0F2A4A; color: #FAF7F2; padding: 24px 28px; border-radius: 8px 8px 0 0;">
    <div style="font-size: 11px; letter-spacing: 0.22em; color: #B08D57;">CITURBAREA · ADMIN · CONNEXION</div>
    <h1 style="font-family: Georgia, serif; font-size: 22px; margin: 8px 0 0; font-weight: 600;">Code de vérification</h1>
  </div>
  <div style="background: white; padding: 28px; border: 1px solid #E8E2D5; border-top: 0; border-radius: 0 0 8px 8px;">
    <p style="font-size: 15px;">Bonjour ${name},</p>
    <p style="font-size: 15px;">Voici ton code de connexion à <strong>admin.citurbarea.com</strong> :</p>
    <div style="font-family: 'JetBrains Mono', monospace; font-size: 38px; letter-spacing: 0.4em; text-align: center; padding: 20px; background: #F2EDE3; border-radius: 6px; margin: 18px 0; font-weight: 700; color: #0F2A4A;">${code}</div>
    <p style="font-size: 13px; color: #5C6373;">Valable 5 minutes. À ne partager avec personne.</p>
    <p style="font-size: 12px; color: #94292B; background: #F2DEDE; padding: 10px; border-left: 3px solid #94292B; border-radius: 3px;">
      ⚠ Si tu n'es pas à l'origine de cette connexion, ignore ce mail et change ton mot de passe immédiatement.
    </p>
  </div>
</body></html>`;
        const host = process.env.SMTP_HOST;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        if (!host || !user || !pass) {
            this.log.warn(`[ADMIN OTP EMAIL] SMTP non configuré — code ${code} pour ${to} (mode dev, ne pas utiliser en prod)`);
            return;
        }
        try {
            const transporter = nodemailer.createTransport({
                host, port: Number(process.env.SMTP_PORT) || 587, secure: false,
                auth: { user, pass },
            });
            await transporter.sendMail({
                from: `"CITURBAREA Admin" <${user}>`, to, subject, html,
            });
        }
        catch (e) {
            this.log.error(`[ADMIN OTP EMAIL] fail to=${to}: ${e?.message}`);
        }
    }
    async sendSmsOtp(toE164, code) {
        const result = await this.twilio.sendSms(toE164, `CITURBAREA Admin: ${code}. Valable 5min. Ne partage jamais ce code.`);
        if (!result.ok) {
            // Mode dev : le code est déjà loggé par TwilioService.sendSms
            this.log.warn(`[ADMIN OTP SMS] code ${code} pour ${toE164} (Twilio non configuré, mode dev)`);
        }
    }
    // ── Génération JWT final (appelé après WebAuthn OK) ────────────
    async finalizeSession(sessionId) {
        const session = await this.prisma.adminSession.findUniqueOrThrow({
            where: { id: sessionId },
            include: { adminUser: true },
        });
        if (session.step !== "WEBAUTHN_OK")
            throw new common_1.BadRequestException("Étapes incomplètes");
        const jti = (0, crypto_1.randomBytes)(16).toString("base64url");
        const exp = new Date(Date.now() + JWT_TTL_MS);
        const token = await this.jwt.signAsync({
            sub: session.adminUserId,
            role: session.adminUser.role,
            email: session.adminUser.email,
        }, {
            jwtid: jti,
            audience: "admin",
            issuer: "citurbarea-admin",
            expiresIn: "15m",
        });
        await this.prisma.adminSession.update({
            where: { id: sessionId },
            data: {
                step: "FULLY_AUTH",
                fullyAuthAt: new Date(),
                jwtJti: jti,
                jwtIssuedAt: new Date(),
                jwtExpiresAt: exp,
            },
        });
        await this.prisma.adminUser.update({
            where: { id: session.adminUserId },
            data: {
                lastLoginAt: new Date(),
                lastLoginIp: session.ipAddress,
                lastLoginFingerprint: session.deviceFingerprint,
                loginCount: { increment: 1 },
            },
        });
        await this.rateLimit.reset("LOGIN", `email:${session.adminUser.email}`);
        await this.audit.record({
            adminUserId: session.adminUserId,
            action: "ADMIN_LOGIN_FULL_SUCCESS", category: "AUTH", severity: "INFO",
            payload: { sessionId },
            ipAddress: session.ipAddress, userAgent: session.userAgent, deviceFingerprint: session.deviceFingerprint,
            sessionId,
        });
        // Notif de succès si IP nouvelle
        const knownIps = await this.prisma.adminAllowedIp.findMany({
            where: { adminUserId: session.adminUserId, revokedAt: null },
            select: { cidr: true },
        });
        const ipIsKnown = knownIps.some((k) => (0, device_fingerprint_1.ipInCidr)(session.ipAddress, k.cidr));
        if (!ipIsKnown) {
            await this.notify.alert({
                adminUserId: session.adminUserId,
                severity: "INFO", category: "LOGIN_SUCCESS_NEW_IP",
                title: "Connexion admin réussie depuis nouvelle IP",
                message: `Connexion validée à 4 facteurs depuis IP ${session.ipAddress}. Si ce n'est pas toi, change ton password.`,
                emailTo: session.adminUser.email,
                smsTo: session.adminUser.phoneE164 || undefined,
            });
        }
        return {
            access_token: token,
            expiresAt: exp.toISOString(),
            admin: {
                id: session.adminUser.id,
                email: session.adminUser.email,
                displayName: session.adminUser.displayName,
                role: session.adminUser.role,
            },
        };
    }
};
exports.AdminAuthService = AdminAuthService;
exports.AdminAuthService = AdminAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        admin_audit_service_1.AdminAuditService,
        admin_rate_limit_service_1.AdminRateLimitService,
        admin_notify_service_1.AdminNotifyService,
        twilio_service_1.TwilioService])
], AdminAuthService);
