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
exports.ProAccessGuard = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
/**
 * ProAccessGuard — Cercles est un réseau réservé aux pros.
 *
 * Politique :
 * - OWNER / ADMIN / OPS → accès complet (modération, support).
 * - CLIENT (ou autre) avec ProProfile → accès complet.
 * - CLIENT (ou autre) sans ProProfile → 403 (particulier non-éligible).
 *
 * Exceptions (passent toujours) :
 * - GET /api/cercles/me/profile : un user doit pouvoir vérifier l'absence de profil.
 * - POST /api/cercles/me/profile : permet d'amorcer un profil pro (Annuaire).
 */
let ProAccessGuard = class ProAccessGuard {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const user = req?.user;
        if (!user)
            throw new common_1.UnauthorizedException("Auth required");
        // Whitelist : endpoints profil pro (lecture + amorce)
        const url = req.originalUrl || req.url || "";
        if (url.startsWith("/api/cercles/me/profile"))
            return true;
        const role = user.role;
        if (role === "OWNER" || role === "ADMIN" || role === "OPS")
            return true;
        const userId = user.userId || user.sub;
        if (!userId)
            throw new common_1.UnauthorizedException("Auth required");
        const profile = await this.prisma.proProfile.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!profile) {
            throw new common_1.ForbiddenException("Cercles est réservé aux comptes pros");
        }
        return true;
    }
};
exports.ProAccessGuard = ProAccessGuard;
exports.ProAccessGuard = ProAccessGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tome_at_1.PrismaService])
], ProAccessGuard);
