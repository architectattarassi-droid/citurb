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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminBridgeController = void 0;
/**
 * AdminBridgeController — pont vault (AdminUser) ↔ User JWT classique.
 *
 * PROBLÈME : les endpoints /api/cc/* (backoffice Command Center) exigent un
 * User JWT avec role ADMIN/OWNER/OPS. Or les SUPER_ADMIN (vault MFA, modèle
 * Prisma `AdminUser`) sont une auth séparée de la table `User` — un
 * SUPER_ADMIN qui n'a PAS aussi un compte User classique tombe sur 401 en
 * essayant d'accéder à /cc/inscrits, /cc/leads, etc.
 *
 * SOLUTION : un endpoint qui, depuis une session vault valide (sessionToken
 * stocké en `AdminSession`), upsert un User shadow avec le même email +
 * role=ADMIN + passwordHash inutilisable (vault login only), puis émet un
 * User JWT via `AuthService.issueTokenForUser`.
 *
 * Le frontend admin appelle cet endpoint au montage de CCLayout si pas de
 * userToken stocké mais un sessionToken admin valide → obtient un userToken
 * → débloque /cc/*.
 */
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const node_crypto_1 = require("node:crypto");
const tome_at_1 = require("../../tomes/tome-at");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const auth_service_1 = require("../../tomes/tome-5/auth/auth.service");
let AdminBridgeController = class AdminBridgeController {
    prisma;
    authService;
    jwt;
    constructor(prisma, authService, jwt) {
        this.prisma = prisma;
        this.authService = authService;
        this.jwt = jwt;
    }
    async toUser(req) {
        const auth = (req.headers?.authorization || "");
        const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
        if (!token)
            throw new common_1.UnauthorizedException("Token manquant");
        // Le front peut envoyer soit :
        //   (a) le JWT admin émis après FULLY_AUTH (15 min, signé ADMIN_JWT_SECRET,
        //       payload { sub: adminUserId, role, email })
        //   (b) le sessionToken intermédiaire de l'AdminSession (pendant le multi-step
        //       login, ou si conservé après FULLY_AUTH).
        // On essaie (a) d'abord (cas normal post-login), fallback (b).
        let adminUserId = null;
        try {
            const payload = await this.jwt.verifyAsync(token, {
                secret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "dev-secret",
                audience: "admin",
                issuer: "citurbarea-admin",
            });
            if (payload?.sub)
                adminUserId = payload.sub;
        }
        catch {
            // Fallback : validation comme sessionToken AdminSession.
            const session = await this.prisma.adminSession.findUnique({ where: { sessionToken: token } });
            if (!session)
                throw new common_1.UnauthorizedException("Token invalide (ni JWT admin ni session vault)");
            if (session.revokedAt)
                throw new common_1.UnauthorizedException("Session révoquée");
            if (session.expiresAt.getTime() < Date.now())
                throw new common_1.UnauthorizedException("Session expirée");
            adminUserId = session.adminUserId;
        }
        if (!adminUserId)
            throw new common_1.UnauthorizedException("AdminUser ID introuvable");
        const adminUser = await this.prisma.adminUser.findUnique({ where: { id: adminUserId } });
        if (!adminUser)
            throw new common_1.UnauthorizedException("AdminUser introuvable");
        if (!adminUser.isActive)
            throw new common_1.UnauthorizedException("AdminUser désactivé");
        // Upsert User shadow avec role ADMIN — passwordHash non utilisable
        // (l'admin reste obligé de passer par le vault MFA pour se loguer).
        const user = await this.prisma.user.upsert({
            where: { email: adminUser.email },
            update: {
                role: "ADMIN",
                isActive: true,
            },
            create: {
                email: adminUser.email,
                passwordHash: `vault-only:${(0, node_crypto_1.randomBytes)(32).toString("hex")}`,
                role: "ADMIN",
                username: adminUser.displayName,
                isActive: true,
                emailVerifiedAt: new Date(),
            },
        });
        // Émet un User JWT (route interne mais protégée par notre check vault au-dessus).
        const issued = await this.authService.issueTokenForUser(user.id);
        return { ok: true, access_token: issued.access_token, user: issued.user };
    }
};
exports.AdminBridgeController = AdminBridgeController;
__decorate([
    (0, common_1.Post)("to-user"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminBridgeController.prototype, "toUser", null);
exports.AdminBridgeController = AdminBridgeController = __decorate([
    (0, tome_at_1.Tome)("tome9"),
    (0, common_1.Controller)("api/admin/bridge"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auth_service_1.AuthService,
        jwt_1.JwtService])
], AdminBridgeController);
