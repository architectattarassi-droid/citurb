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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const rbac_1 = require("./rbac");
const bcrypt = require("bcryptjs");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const otp_service_1 = require("../../../modules/otp/otp.service");
const owner_notify_service_1 = require("../../../modules/owner-notify/owner-notify.service");
const domain_error_1 = require("../../../modules/kernel/domain-error");
const node_crypto_1 = require("node:crypto");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwt;
    otpService;
    ownerNotify;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, jwt, otpService, ownerNotify) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.otpService = otpService;
        this.ownerNotify = ownerNotify;
    }
    async hashPassword(password) {
        return bcrypt.hash(password, 10);
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive)
            throw new common_1.UnauthorizedException("Invalid credentials");
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok)
            throw new common_1.UnauthorizedException("Invalid credentials");
        // Ne PAS appeler ensureEntitlements ici : ne pas écraser les features existantes
        return user;
    }
    /**
     * Doctrine V1 : toutes les features sont désactivées par défaut.
     * L'activation se fait UNIQUEMENT via ActivationRequest (validée par admin).
     * Ne pas appeler cette méthode à chaque login — seulement à la création du compte.
     */
    async initEntitlements(userId) {
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
    async enableFeature(userId, featureKey) {
        const entitlements = await this.prisma.userEntitlements.findUnique({ where: { userId } });
        const current = entitlements?.features ?? {};
        await this.prisma.userEntitlements.upsert({
            where: { userId },
            update: { features: { ...current, [featureKey]: true } },
            create: { userId, features: { ...current, [featureKey]: true } },
        });
    }
    async login(email, password) {
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
    async ensureOwner(email, password) {
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
    async me(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { entitlements: true },
        });
        if (!user)
            return { user: null };
        const role = user.role;
        const caps = (0, rbac_1.capsFor)(role);
        const plan = user.plan || "PRO";
        const base = (0, rbac_1.entitlementsFor)(role);
        const dbFeatures = user.entitlements?.features;
        // Doctrine : features DB-driven. Si pas d'entitlement → tout à false.
        const features = dbFeatures && typeof dbFeatures === "object"
            ? { ...base.features, ...dbFeatures }
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
    async sendPhoneOtp(userId, phone) {
        await this.prisma.user.update({ where: { id: userId }, data: { phone } });
        await this.otpService.sendVerification(phone);
    }
    async verifyPhoneOtp(userId, phone, code) {
        const approved = await this.otpService.checkVerification(phone, code);
        if (!approved) {
            throw new domain_error_1.DomainError('Code incorrect ou expiré', 422, {
                rule_id: 'T5-OTP-001', error_code: 'OTP_INVALID',
                category: 'authz', severity: 'medium',
                incident_id: (0, node_crypto_1.randomUUID)(),
                public_code: 'OTP_INVALID',
            });
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: { phoneVerifiedAt: new Date() },
        });
    }
    async register(email, password, username) {
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new domain_error_1.DomainError('Email déjà utilisé', 409, {
                rule_id: 'T5-REG-001', error_code: 'EMAIL_TAKEN',
                category: 'authz', severity: 'low',
                incident_id: (0, node_crypto_1.randomUUID)(),
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
        this.ownerNotify.notify('NEW_USER_REGISTERED', { email: user.email, username: user.username }).catch(() => { });
        const payload = { sub: user.id, userId: user.id, email: user.email, role: user.role };
        const access_token = await this.jwt.signAsync(payload);
        return { access_token, user: { id: user.id, email: user.email, role: user.role, username: user.username } };
    }
    // DEV helpers (used by OPS bootstrap routes)
    async ensureAdmin(email, password) {
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
    async ensureOps(email, password) {
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        otp_service_1.OtpService,
        owner_notify_service_1.OwnerNotifyService])
], AuthService);
