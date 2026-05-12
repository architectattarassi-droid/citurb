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
exports.AdminWebAuthnService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const admin_audit_service_1 = require("./admin-audit.service");
const admin_auth_service_1 = require("./admin-auth.service");
const admin_notify_service_1 = require("./admin-notify.service");
const server_1 = require("@simplewebauthn/server");
/**
 * AdminWebAuthnService — Sprint H couche 4.
 *
 * 2 flows :
 *  - REGISTRATION : un admin enregistre un nouveau passkey (Windows Hello, YubiKey…)
 *  - AUTHENTICATION : un admin connecté à l'étape SMS_OTP_OK termine son login
 *
 * Stockage clés publiques en base64 dans WebAuthnCredential.
 * Les challenges sont stockés brièvement dans AdminSession (champ ad-hoc) pour
 * ne pas créer de table éphémère supplémentaire.
 */
function rpName() {
    return "CITURBAREA Admin";
}
/**
 * Extrait rpId + origin depuis l'Origin du navigateur (passé par le controller).
 * Fallback : ADMIN_WEBAUTHN_ORIGIN env, sinon admin.citurbarea.com.
 *
 * WebAuthn impose que rpId soit un suffixe direct du hostname courant
 * (ex: page sur foo.bar.com → rpId peut être "foo.bar.com" ou "bar.com").
 * On utilise le hostname complet pour maximum compat.
 */
function resolveRp(clientOrigin) {
    const raw = clientOrigin || process.env.ADMIN_WEBAUTHN_ORIGIN || "https://admin.citurbarea.com";
    try {
        const u = new URL(raw);
        return { rpId: u.hostname, origin: `${u.protocol}//${u.host}` };
    }
    catch {
        return { rpId: "admin.citurbarea.com", origin: "https://admin.citurbarea.com" };
    }
}
let AdminWebAuthnService = class AdminWebAuthnService {
    prisma;
    audit;
    auth;
    notify;
    constructor(prisma, audit, auth, notify) {
        this.prisma = prisma;
        this.audit = audit;
        this.auth = auth;
        this.notify = notify;
    }
    // ── REGISTRATION : Génère les options pour navigator.credentials.create() ──
    async beginRegister(adminUserId, deviceType, clientOrigin) {
        const admin = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: adminUserId } });
        const existing = await this.prisma.webAuthnCredential.findMany({
            where: { adminUserId, revokedAt: null },
            select: { credentialId: true, transports: true },
        });
        const { rpId } = resolveRp(clientOrigin);
        const options = await (0, server_1.generateRegistrationOptions)({
            rpName: rpName(),
            rpID: rpId,
            userID: Buffer.from(admin.id),
            userName: admin.email,
            userDisplayName: admin.displayName,
            attestationType: "none",
            excludeCredentials: existing.map((c) => ({
                id: c.credentialId,
                transports: c.transports,
            })),
            authenticatorSelection: {
                residentKey: "preferred",
                userVerification: "preferred",
            },
        });
        // Stocke le challenge + rpId/origin utilisés (pour validation à finishRegister)
        await this.prisma.adminAlert.create({
            data: {
                adminUserId,
                severity: "INFO",
                category: "WEBAUTHN_CHALLENGE_REGISTER",
                title: "WebAuthn challenge registration",
                message: JSON.stringify({
                    challenge: options.challenge,
                    deviceType,
                    rpId,
                    clientOrigin: clientOrigin || null,
                    expiresAt: Date.now() + 5 * 60_000,
                }),
            },
        });
        return options;
    }
    async finishRegister(adminUserId, body, deviceType, clientOrigin) {
        const challengeRow = await this.prisma.adminAlert.findFirst({
            where: { adminUserId, category: "WEBAUTHN_CHALLENGE_REGISTER", acknowledgedAt: null },
            orderBy: { createdAt: "desc" },
        });
        if (!challengeRow)
            throw new common_1.BadRequestException("Aucun challenge actif");
        let challengeData;
        try {
            challengeData = JSON.parse(challengeRow.message);
        }
        catch {
            throw new common_1.BadRequestException("Challenge corrompu");
        }
        if (challengeData.expiresAt < Date.now()) {
            throw new common_1.BadRequestException("Challenge expiré");
        }
        // On utilise le rpId/origin du challenge (cohérent avec beginRegister)
        const resolved = resolveRp(challengeData.clientOrigin || clientOrigin);
        const rpId = challengeData.rpId || resolved.rpId;
        const origin = resolved.origin;
        let verification;
        try {
            verification = await (0, server_1.verifyRegistrationResponse)({
                response: body,
                expectedChallenge: challengeData.challenge,
                expectedOrigin: origin,
                expectedRPID: rpId,
                requireUserVerification: false,
            });
        }
        catch (e) {
            throw new common_1.BadRequestException(`Verification fail: ${e?.message}`);
        }
        if (!verification.verified || !verification.registrationInfo) {
            throw new common_1.BadRequestException("Registration échouée");
        }
        const info = verification.registrationInfo;
        const cred = info.credential ?? info;
        const credentialId = cred.id ?? cred.credentialID;
        const publicKey = Buffer.from(cred.publicKey ?? cred.credentialPublicKey).toString("base64");
        const counter = cred.counter ?? 0;
        const aaguid = cred.aaguid;
        const transports = body.response?.transports || [];
        const saved = await this.prisma.webAuthnCredential.create({
            data: {
                adminUserId,
                credentialId,
                publicKey,
                counter,
                deviceType: deviceType || challengeData.deviceType || "Authenticator",
                transports,
                aaguid: aaguid || null,
            },
        });
        // Marque le challenge utilisé
        await this.prisma.adminAlert.update({
            where: { id: challengeRow.id },
            data: { acknowledgedAt: new Date() },
        });
        const admin = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: adminUserId } });
        await this.audit.record({
            adminUserId, action: "ADMIN_WEBAUTHN_REGISTERED", category: "AUTH", severity: "INFO",
            payload: { credentialId, deviceType: saved.deviceType, transports },
        });
        await this.notify.alert({
            adminUserId,
            severity: "WARN", category: "WEBAUTHN_ADDED",
            title: "Nouveau passkey enregistré sur ton compte admin",
            message: `${saved.deviceType} (${transports.join(", ") || "internal"}). Si ce n'est pas toi, révoque immédiatement.`,
            emailTo: admin.email,
            smsTo: admin.phoneE164 || undefined,
        });
        return { id: saved.id, deviceType: saved.deviceType, addedAt: saved.addedAt };
    }
    // ── AUTHENTICATION : Étape 4 du login multi-étape ──
    async beginAuthenticate(sessionToken, clientOrigin) {
        const session = await this.prisma.adminSession.findUnique({ where: { sessionToken } });
        if (!session)
            throw new common_1.NotFoundException("Session introuvable");
        if (session.step !== "SMS_OTP_OK")
            throw new common_1.BadRequestException("Étape invalide");
        const creds = await this.prisma.webAuthnCredential.findMany({
            where: { adminUserId: session.adminUserId, revokedAt: null },
            select: { credentialId: true, transports: true },
        });
        if (creds.length === 0)
            throw new common_1.BadRequestException("Aucun passkey enregistré");
        const { rpId } = resolveRp(clientOrigin);
        const options = await (0, server_1.generateAuthenticationOptions)({
            rpID: rpId,
            allowCredentials: creds.map((c) => ({
                id: c.credentialId,
                transports: c.transports,
            })),
            userVerification: "preferred",
        });
        await this.prisma.adminAlert.create({
            data: {
                adminUserId: session.adminUserId,
                severity: "INFO",
                category: "WEBAUTHN_CHALLENGE_AUTH",
                title: "WebAuthn challenge auth",
                message: JSON.stringify({
                    challenge: options.challenge,
                    sessionId: session.id,
                    rpId,
                    clientOrigin: clientOrigin || null,
                    expiresAt: Date.now() + 5 * 60_000,
                }),
            },
        });
        return options;
    }
    async finishAuthenticate(sessionToken, body, clientOrigin) {
        const session = await this.prisma.adminSession.findUnique({ where: { sessionToken } });
        if (!session)
            throw new common_1.NotFoundException("Session introuvable");
        if (session.step !== "SMS_OTP_OK")
            throw new common_1.BadRequestException("Étape invalide");
        const challengeRow = await this.prisma.adminAlert.findFirst({
            where: { adminUserId: session.adminUserId, category: "WEBAUTHN_CHALLENGE_AUTH", acknowledgedAt: null },
            orderBy: { createdAt: "desc" },
        });
        if (!challengeRow)
            throw new common_1.BadRequestException("Aucun challenge actif");
        let challengeData;
        try {
            challengeData = JSON.parse(challengeRow.message);
        }
        catch {
            throw new common_1.BadRequestException("Challenge corrompu");
        }
        if (challengeData.expiresAt < Date.now())
            throw new common_1.BadRequestException("Challenge expiré");
        if (challengeData.sessionId !== session.id)
            throw new common_1.BadRequestException("Challenge mismatch session");
        const cred = await this.prisma.webAuthnCredential.findFirst({
            where: { credentialId: body.id, adminUserId: session.adminUserId, revokedAt: null },
        });
        if (!cred)
            throw new common_1.BadRequestException("Credential inconnu");
        const resolved = resolveRp(challengeData.clientOrigin || clientOrigin);
        const rpId = challengeData.rpId || resolved.rpId;
        const origin = resolved.origin;
        let verification;
        try {
            verification = await (0, server_1.verifyAuthenticationResponse)({
                response: body,
                expectedChallenge: challengeData.challenge,
                expectedOrigin: origin,
                expectedRPID: rpId,
                credential: {
                    id: cred.credentialId,
                    publicKey: Buffer.from(cred.publicKey, "base64"),
                    counter: cred.counter,
                    transports: cred.transports,
                },
                requireUserVerification: false,
            });
        }
        catch (e) {
            throw new common_1.BadRequestException(`Verification fail: ${e?.message}`);
        }
        if (!verification.verified)
            throw new common_1.BadRequestException("Authentication échouée");
        // Update counter (anti-replay)
        await this.prisma.webAuthnCredential.update({
            where: { id: cred.id },
            data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() },
        });
        await this.prisma.adminAlert.update({
            where: { id: challengeRow.id },
            data: { acknowledgedAt: new Date() },
        });
        await this.prisma.adminSession.update({
            where: { id: session.id },
            data: { step: "WEBAUTHN_OK", webauthnOkAt: new Date() },
        });
        await this.audit.record({
            adminUserId: session.adminUserId,
            action: "ADMIN_LOGIN_STEP4_WEBAUTHN_OK", category: "AUTH", severity: "INFO",
            payload: { credentialId: cred.credentialId, deviceType: cred.deviceType },
            sessionId: session.id,
        });
        // Étape finale : génération du JWT
        const final = await this.auth.finalizeSession(session.id);
        return final;
    }
};
exports.AdminWebAuthnService = AdminWebAuthnService;
exports.AdminWebAuthnService = AdminWebAuthnService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        admin_audit_service_1.AdminAuditService,
        admin_auth_service_1.AdminAuthService,
        admin_notify_service_1.AdminNotifyService])
], AdminWebAuthnService);
