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
exports.AdminFounderBootstrapController = void 0;
/**
 * AdminFounderBootstrapController — endpoint one-shot pour créer le User ADMIN
 * du founder sans dépendre du vault MFA (qui exige Resend + Twilio env).
 *
 * SÉCURITÉ : protégé par un secret partagé HEADER `X-Founder-Bootstrap-Secret`
 * comparé à `process.env.FOUNDER_BOOTSTRAP_SECRET`. Si l'env n'est pas posée
 * (cas par défaut prod), l'endpoint répond 503 → totalement désactivé.
 *
 * Workflow d'usage :
 *   1. Sur Railway dashboard service `citurb` → Variables → ajouter
 *      `FOUNDER_BOOTSTRAP_SECRET=une-longue-chaine-secrete-aleatoire`
 *   2. Attendre le redeploy auto (1-2 min).
 *   3. Curl depuis n'importe où :
 *      curl -X POST https://citurbarea.com/api/admin/founder-bootstrap \
 *        -H "X-Founder-Bootstrap-Secret: une-longue-chaine-secrete-aleatoire" \
 *        -H "Content-Type: application/json" \
 *        -d '{"email":"architectattarassi@gmail.com","password":"MonPassFort!2026"}'
 *   4. Réponse : { ok, access_token, user } — le JWT est valide 7j.
 *   5. RETIRER FOUNDER_BOOTSTRAP_SECRET de Railway (sécurité).
 *
 * L'opération est idempotente : appel répété met à jour le password sans
 * créer de doublon User. Le mot de passe doit passer la validation
 * (≥10 chars + maj + min + chiffre).
 */
const common_1 = require("@nestjs/common");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcryptjs");
const tome_at_1 = require("../../tomes/tome-at");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const auth_service_1 = require("../../tomes/tome-5/auth/auth.service");
function validatePassword(p) {
    if (!p || p.length < 10)
        return "min 10 caractères";
    if (!/[A-Z]/.test(p))
        return "manque une majuscule";
    if (!/[a-z]/.test(p))
        return "manque une minuscule";
    if (!/[0-9]/.test(p))
        return "manque un chiffre";
    return null;
}
function safeEqual(a, b) {
    if (a.length !== b.length)
        return false;
    let r = 0;
    for (let i = 0; i < a.length; i++)
        r |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return r === 0;
}
let AdminFounderBootstrapController = class AdminFounderBootstrapController {
    prisma;
    authService;
    constructor(prisma, authService) {
        this.prisma = prisma;
        this.authService = authService;
    }
    async bootstrap(providedSecret, body) {
        const envSecret = process.env.FOUNDER_BOOTSTRAP_SECRET;
        if (!envSecret) {
            throw new common_1.ServiceUnavailableException("Endpoint désactivé. Poser FOUNDER_BOOTSTRAP_SECRET sur Railway pour l'activer.");
        }
        if (!providedSecret || !safeEqual(providedSecret, envSecret)) {
            throw new common_1.UnauthorizedException("Secret invalide");
        }
        const email = (body?.email || "").trim().toLowerCase();
        const password = body?.password || "";
        if (!email || !email.includes("@"))
            throw new common_1.BadRequestException("Email invalide");
        const pwErr = validatePassword(password);
        if (pwErr)
            throw new common_1.BadRequestException(`Mot de passe : ${pwErr}`);
        const passwordHash = await bcrypt.hash(password, 12);
        // Récupère AdminUser pour copier displayName/phone si dispo.
        const adminUser = await this.prisma.adminUser.findUnique({ where: { email } });
        const existing = await this.prisma.user.findUnique({ where: { email } });
        const user = existing
            ? await this.prisma.user.update({
                where: { email },
                data: {
                    passwordHash,
                    role: "ADMIN",
                    isActive: true,
                    emailVerifiedAt: existing.emailVerifiedAt || new Date(),
                },
            })
            : await this.prisma.user.create({
                data: {
                    email,
                    passwordHash,
                    role: "ADMIN",
                    isActive: true,
                    username: adminUser?.displayName || email.split("@")[0],
                    phone: adminUser?.phoneE164,
                    emailVerifiedAt: new Date(),
                },
            });
        const issued = await this.authService.issueTokenForUser(user.id);
        return {
            ok: true,
            access_token: issued.access_token,
            user: issued.user,
            message: "User ADMIN créé/mis à jour. Retire maintenant FOUNDER_BOOTSTRAP_SECRET de Railway pour désactiver l'endpoint.",
        };
    }
};
exports.AdminFounderBootstrapController = AdminFounderBootstrapController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Headers)("x-founder-bootstrap-secret")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminFounderBootstrapController.prototype, "bootstrap", null);
exports.AdminFounderBootstrapController = AdminFounderBootstrapController = __decorate([
    (0, tome_at_1.Tome)("tome9"),
    (0, common_1.Controller)("api/admin/founder-bootstrap"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auth_service_1.AuthService])
], AdminFounderBootstrapController);
