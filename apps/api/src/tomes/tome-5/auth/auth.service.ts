import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { capsFor, entitlementsFor } from "./rbac";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { OtpService } from "../../../modules/otp/otp.service";
import { OwnerNotifyService } from "../../../modules/owner-notify/owner-notify.service";
import { DomainError } from "../../../modules/kernel/domain-error";
import { randomUUID } from "node:crypto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly otpService: OtpService,
    private readonly ownerNotify: OwnerNotifyService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException("Invalid credentials");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    // Ne PAS appeler ensureEntitlements ici : ne pas écraser les features existantes
    return user;
  }

  /**
   * Doctrine V1 : toutes les features sont désactivées par défaut.
   * L'activation se fait UNIQUEMENT via ActivationRequest (validée par admin).
   * Ne pas appeler cette méthode à chaque login — seulement à la création du compte.
   */
  async initEntitlements(userId: string) {
    const defaultFeatures = {
      P1_ENABLED: false,
      P2_ENABLED: false,
      P3_ENABLED: false,
      P4_ENABLED: false,
      P5_ENABLED: false,
      P6_ENABLED: false,
      API_ENABLED: false,
    };
    // create only — ne jamais écraser des features existantes
    await this.prisma.userEntitlements.upsert({
      where: { userId },
      update: {}, // pas de mise à jour si déjà présent
      create: { userId, features: defaultFeatures },
    });
  }

  /**
   * Active une feature spécifique pour un utilisateur.
   * Appelé par l'admin après validation d'une ActivationRequest.
   */
  async enableFeature(userId: string, featureKey: string): Promise<void> {
    const entitlements = await this.prisma.userEntitlements.findUnique({ where: { userId } });
    const current = (entitlements?.features as Record<string, boolean>) ?? {};
    await this.prisma.userEntitlements.upsert({
      where: { userId },
      update: { features: { ...current, [featureKey]: true } },
      create: { userId, features: { ...current, [featureKey]: true } },
    });
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const payload = { sub: user.id, role: user.role, email: user.email };
    return {
      access_token: await this.jwt.signAsync(payload),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  /**
   * Dev bootstrap: ensure an OWNER exists AND make the operation recoverable.
   * In practice, when you iterate on zips, the database may already contain an OWNER with an unknown password.
   * This endpoint must be able to reset the creds so OPS can log in reliably.
   */
  async ensureOwner(email: string, password: string) {
    const passwordHash = await this.hashPassword(password);
    const existingOwner = await this.prisma.user.findFirst({ where: { role: "OWNER" } });

    const owner = existingOwner
      ? await this.prisma.user.update({
          where: { id: existingOwner.id },
          data: { email, passwordHash, isActive: true, plan: "PRO" },
        })
      : await this.prisma.user.create({
          data: { email, passwordHash, role: "OWNER", plan: "PRO", isActive: true },
        });

    // OWNER gets all features enabled (admin access) — idempotent.
    await this.prisma.userEntitlements.upsert({
      where: { userId: owner.id },
      update: {
        features: {
          P1_ENABLED: true,
          P2_ENABLED: true,
          P3_ENABLED: true,
          P4_ENABLED: true,
          P5_ENABLED: true,
          P6_ENABLED: true,
          API_ENABLED: true,
        },
      },
      create: {
        userId: owner.id,
        features: {
          P1_ENABLED: true,
          P2_ENABLED: true,
          P3_ENABLED: true,
          P4_ENABLED: true,
          P5_ENABLED: true,
          P6_ENABLED: true,
          API_ENABLED: true,
        },
      },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { entitlements: true },
    });
    if (!user) return { user: null };

    const role = user.role as any;
    const caps = capsFor(role);
    const plan = (user as any).plan || "PRO";
    const base = entitlementsFor(role);

    const dbFeatures = (user as any).entitlements?.features as any;
    // Doctrine : features DB-driven. Si pas d'entitlement → tout à false.
    const features =
      dbFeatures && typeof dbFeatures === "object"
        ? { ...base.features, ...(dbFeatures as Record<string, boolean>) }
        : {
            P1_ENABLED: false,
            P2_ENABLED: false,
            P3_ENABLED: false,
            P4_ENABLED: false,
            P5_ENABLED: false,
            P6_ENABLED: false,
            API_ENABLED: false,
          };

    return {
      user: {
        userId: user.id,
        email: user.email,
        role: user.role,
        plan,
        caps,
        entitlements: { plan: String(plan).toLowerCase(), features },
      },
    };
  }

  async sendPhoneOtp(userId: string, phone: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { phone } });
    await this.otpService.sendVerification(phone);
  }

  async verifyPhoneOtp(userId: string, phone: string, code: string): Promise<void> {
    const approved = await this.otpService.checkVerification(phone, code);
    if (!approved) {
      throw new DomainError('Code incorrect ou expiré', 422, {
        rule_id: 'T5-OTP-001', error_code: 'OTP_INVALID',
        category: 'authz', severity: 'medium',
        incident_id: randomUUID(),
        public_code: 'OTP_INVALID',
      });
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { phoneVerifiedAt: new Date() },
    });
  }

  async register(email: string, password: string, username?: string): Promise<{ access_token: string; user: any }> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new DomainError('Email déjà utilisé', 409, {
        rule_id: 'T5-REG-001', error_code: 'EMAIL_TAKEN',
        category: 'authz', severity: 'low',
        incident_id: randomUUID(),
        public_code: 'EMAIL_TAKEN',
      });
    }
    const passwordHash = await this.hashPassword(password);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        username: username || null,
        role: 'CLIENT',
        plan: 'PRO',
        isActive: true,
      },
    });
    await this.initEntitlements(user.id);
    this.ownerNotify.notify('NEW_USER_REGISTERED', { email: user.email, username: user.username }).catch(() => {});
    const payload = { sub: user.id, userId: user.id, email: user.email, role: user.role };
    const access_token = await this.jwt.signAsync(payload);
    return { access_token, user: { id: user.id, email: user.email, role: user.role, username: user.username } };
  }

  // DEV helpers (used by OPS bootstrap routes)
  async ensureAdmin(email: string, password: string) {
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await this.hashPassword(password);
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          role: 'ADMIN',
          plan: 'PRO',
          isActive: true,
        },
      });
      this.logger.warn(`[DEV] Admin user created: ${email}`);
    }
    return user;
  }

  async ensureOps(email: string, password: string) {
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await this.hashPassword(password);
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          role: 'OPS',
          plan: 'PRO',
          isActive: true,
        },
      });
      this.logger.warn(`[DEV] Ops user created: ${email}`);
    }
    return user;
  }

}

