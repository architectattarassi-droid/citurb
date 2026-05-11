import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { AdminAuditService } from "./admin-audit.service";
import { AdminAuthService } from "./admin-auth.service";
import { AdminNotifyService } from "./admin-notify.service";
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from "@simplewebauthn/server";

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

function rpId(): string {
  return process.env.ADMIN_WEBAUTHN_RP_ID || "admin.citurbarea.com";
}
function rpName(): string {
  return "CITURBAREA Admin";
}
function origin(): string {
  return process.env.ADMIN_WEBAUTHN_ORIGIN || "https://admin.citurbarea.com";
}

@Injectable()
export class AdminWebAuthnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly auth: AdminAuthService,
    private readonly notify: AdminNotifyService,
  ) {}

  // ── REGISTRATION : Génère les options pour navigator.credentials.create() ──

  async beginRegister(adminUserId: string, deviceType: string) {
    const admin = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: adminUserId } });
    const existing = await this.prisma.webAuthnCredential.findMany({
      where: { adminUserId, revokedAt: null },
      select: { credentialId: true, transports: true },
    });

    const options = await generateRegistrationOptions({
      rpName: rpName(),
      rpID: rpId(),
      userID: Buffer.from(admin.id),
      userName: admin.email,
      userDisplayName: admin.displayName,
      attestationType: "none",
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports: c.transports as any,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    // Persist challenge dans AdminUser.passwordHash ? Non — utilisons un champ
    // dédié dans la session courante. Pour simplifier, on stocke dans Prisma
    // via AdminAlert (categ=WEBAUTHN_CHALLENGE) avec ack=false expirant 5min.
    // Méthode plus propre : table dédiée. Ici via payload Alert.
    await this.prisma.adminAlert.create({
      data: {
        adminUserId,
        severity: "INFO",
        category: "WEBAUTHN_CHALLENGE_REGISTER",
        title: "WebAuthn challenge registration",
        message: JSON.stringify({ challenge: options.challenge, deviceType, expiresAt: Date.now() + 5 * 60_000 }),
      },
    });

    return options;
  }

  async finishRegister(adminUserId: string, body: any, deviceType: string) {
    // Récupère le challenge le plus récent (non acknowledged)
    const challengeRow = await this.prisma.adminAlert.findFirst({
      where: { adminUserId, category: "WEBAUTHN_CHALLENGE_REGISTER", acknowledgedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!challengeRow) throw new BadRequestException("Aucun challenge actif");
    let challengeData: { challenge: string; expiresAt: number; deviceType?: string };
    try {
      challengeData = JSON.parse(challengeRow.message);
    } catch {
      throw new BadRequestException("Challenge corrompu");
    }
    if (challengeData.expiresAt < Date.now()) {
      throw new BadRequestException("Challenge expiré");
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: origin(),
        expectedRPID: rpId(),
        requireUserVerification: false,
      });
    } catch (e: any) {
      throw new BadRequestException(`Verification fail: ${e?.message}`);
    }
    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException("Registration échouée");
    }

    const info = verification.registrationInfo;
    const cred = (info as any).credential ?? info;
    const credentialId: string = cred.id ?? cred.credentialID;
    const publicKey: string = Buffer.from(cred.publicKey ?? cred.credentialPublicKey).toString("base64");
    const counter: number = cred.counter ?? 0;
    const aaguid: string | undefined = cred.aaguid;
    const transports: string[] = body.response?.transports || [];

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

  async beginAuthenticate(sessionToken: string) {
    const session = await this.prisma.adminSession.findUnique({ where: { sessionToken } });
    if (!session) throw new NotFoundException("Session introuvable");
    if (session.step !== "SMS_OTP_OK") throw new BadRequestException("Étape invalide");

    const creds = await this.prisma.webAuthnCredential.findMany({
      where: { adminUserId: session.adminUserId, revokedAt: null },
      select: { credentialId: true, transports: true },
    });
    if (creds.length === 0) throw new BadRequestException("Aucun passkey enregistré");

    const options = await generateAuthenticationOptions({
      rpID: rpId(),
      allowCredentials: creds.map((c) => ({
        id: c.credentialId,
        transports: c.transports as any,
      })),
      userVerification: "preferred",
    });

    await this.prisma.adminAlert.create({
      data: {
        adminUserId: session.adminUserId,
        severity: "INFO",
        category: "WEBAUTHN_CHALLENGE_AUTH",
        title: "WebAuthn challenge auth",
        message: JSON.stringify({ challenge: options.challenge, sessionId: session.id, expiresAt: Date.now() + 5 * 60_000 }),
      },
    });
    return options;
  }

  async finishAuthenticate(sessionToken: string, body: any) {
    const session = await this.prisma.adminSession.findUnique({ where: { sessionToken } });
    if (!session) throw new NotFoundException("Session introuvable");
    if (session.step !== "SMS_OTP_OK") throw new BadRequestException("Étape invalide");

    const challengeRow = await this.prisma.adminAlert.findFirst({
      where: { adminUserId: session.adminUserId, category: "WEBAUTHN_CHALLENGE_AUTH", acknowledgedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!challengeRow) throw new BadRequestException("Aucun challenge actif");
    let challengeData: { challenge: string; sessionId: string; expiresAt: number };
    try { challengeData = JSON.parse(challengeRow.message); } catch { throw new BadRequestException("Challenge corrompu"); }
    if (challengeData.expiresAt < Date.now()) throw new BadRequestException("Challenge expiré");
    if (challengeData.sessionId !== session.id) throw new BadRequestException("Challenge mismatch session");

    const cred = await this.prisma.webAuthnCredential.findFirst({
      where: { credentialId: body.id, adminUserId: session.adminUserId, revokedAt: null },
    });
    if (!cred) throw new BadRequestException("Credential inconnu");

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: origin(),
        expectedRPID: rpId(),
        credential: {
          id: cred.credentialId,
          publicKey: Buffer.from(cred.publicKey, "base64"),
          counter: cred.counter,
          transports: cred.transports as any,
        },
        requireUserVerification: false,
      });
    } catch (e: any) {
      throw new BadRequestException(`Verification fail: ${e?.message}`);
    }
    if (!verification.verified) throw new BadRequestException("Authentication échouée");

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
}
