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
exports.SuperAdminGuard = exports.RequireAdminRole = exports.REQUIRE_ADMIN_ROLE = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const device_fingerprint_1 = require("../utils/device-fingerprint");
/**
 * SuperAdminGuard — Sprint H couche 7 (session courte + fingerprint stable).
 *
 * Vérifie pour chaque requête /admin/* :
 *  1. Bearer JWT admin valide (HS256, audience="admin", short TTL 15min)
 *  2. AdminSession existe, step=FULLY_AUTH, non révoquée, jwtJti matchant
 *  3. AdminUser.isActive true, non suspendu, non lockedUntil
 *  4. AdminUser.role correspond aux rôles requis (@RequireAdminRole)
 *  5. Device fingerprint correspond à celui de la session (sinon REVOKED)
 *  6. AllowedIp matche (cf IpAllowlistGuard utilisé en chaîne)
 */
exports.REQUIRE_ADMIN_ROLE = "require_admin_role";
const RequireAdminRole = (...roles) => (0, common_1.SetMetadata)(exports.REQUIRE_ADMIN_ROLE, roles);
exports.RequireAdminRole = RequireAdminRole;
let SuperAdminGuard = class SuperAdminGuard {
    jwt;
    prisma;
    reflector;
    constructor(jwt, prisma, reflector) {
        this.jwt = jwt;
        this.prisma = prisma;
        this.reflector = reflector;
    }
    async canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const auth = String(req.headers["authorization"] || "");
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token)
            throw new common_1.UnauthorizedException("Token admin requis");
        let payload;
        try {
            payload = await this.jwt.verifyAsync(token, {
                secret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "dev-secret",
                audience: "admin",
            });
        }
        catch {
            throw new common_1.UnauthorizedException("Token admin invalide ou expiré");
        }
        const jti = payload.jti;
        const adminUserId = payload.sub;
        if (!jti || !adminUserId)
            throw new common_1.UnauthorizedException("Payload JWT incomplet");
        // Session lookup
        const session = await this.prisma.adminSession.findUnique({
            where: { jwtJti: jti },
            include: { adminUser: true },
        });
        if (!session)
            throw new common_1.UnauthorizedException("Session admin introuvable");
        if (session.revokedAt)
            throw new common_1.UnauthorizedException("Session révoquée");
        if (session.step !== "FULLY_AUTH")
            throw new common_1.UnauthorizedException("Session non complète");
        if (session.jwtExpiresAt && session.jwtExpiresAt.getTime() < Date.now()) {
            throw new common_1.UnauthorizedException("Session expirée");
        }
        if (!session.adminUser)
            throw new common_1.UnauthorizedException("Admin introuvable");
        if (!session.adminUser.isActive || session.adminUser.suspendedAt) {
            throw new common_1.ForbiddenException("Compte admin suspendu");
        }
        if (session.adminUser.lockedUntil && session.adminUser.lockedUntil.getTime() > Date.now()) {
            throw new common_1.ForbiddenException("Compte admin verrouillé temporairement");
        }
        // Device fingerprint check — si le client envoie un fingerprint différent, on révoque
        const clientFp = (0, device_fingerprint_1.extractClientFingerprint)(req);
        if (session.deviceFingerprint && clientFp !== session.deviceFingerprint) {
            await this.prisma.adminSession.update({
                where: { id: session.id },
                data: { revokedAt: new Date(), revokedReason: "FINGERPRINT_MISMATCH" },
            });
            throw new common_1.UnauthorizedException("Empreinte appareil non reconnue — session révoquée");
        }
        // Rôle requis
        const requiredRoles = this.reflector.get(exports.REQUIRE_ADMIN_ROLE, ctx.getHandler())
            || this.reflector.get(exports.REQUIRE_ADMIN_ROLE, ctx.getClass())
            || [];
        if (requiredRoles.length > 0 && !requiredRoles.includes(session.adminUser.role)) {
            throw new common_1.ForbiddenException(`Rôle ${requiredRoles.join("/")} requis`);
        }
        // Injecte l'admin dans la requête pour les controllers
        req.admin = {
            id: session.adminUser.id,
            email: session.adminUser.email,
            displayName: session.adminUser.displayName,
            role: session.adminUser.role,
            sessionId: session.id,
            ipAddress: (0, device_fingerprint_1.extractClientIp)(req),
            deviceFingerprint: clientFp,
        };
        return true;
    }
};
exports.SuperAdminGuard = SuperAdminGuard;
exports.SuperAdminGuard = SuperAdminGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        prisma_service_1.PrismaService,
        core_1.Reflector])
], SuperAdminGuard);
