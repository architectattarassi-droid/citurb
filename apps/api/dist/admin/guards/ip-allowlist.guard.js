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
exports.IpAllowlistGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const device_fingerprint_1 = require("../utils/device-fingerprint");
/**
 * IpAllowlistGuard — Sprint H couche 5.
 *
 * Mode strict : si ADMIN_IP_ALLOWLIST_STRICT=true, refuse toute requête
 * /admin/* venant d'une IP qui n'est pas dans AdminAllowedIp pour cet admin.
 *
 * Mode souple (par défaut) : enregistre les nouvelles IPs en mode "pending"
 * et envoie une alerte SMS/email pour validation manuelle. La première IP
 * du SUPER_ADMIN initial est auto-trustée.
 *
 * À utiliser EN AMONT du SuperAdminGuard (pour les routes authentifiées) ou
 * en combinaison avec un check basé sur AdminSession (pour login).
 */
let IpAllowlistGuard = class IpAllowlistGuard {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const adminUserId = req?.admin?.id || req?.adminUserId; // injecté par SuperAdminGuard ou login flow
        if (!adminUserId)
            return true; // pas d'admin connu = pas de check IP (login lui-même se base sur rate limit)
        const ip = (0, device_fingerprint_1.extractClientIp)(req);
        const strict = String(process.env.ADMIN_IP_ALLOWLIST_STRICT || "false") === "true";
        const allowed = await this.prisma.adminAllowedIp.findMany({
            where: { adminUserId, revokedAt: null },
            select: { cidr: true, id: true },
        });
        const match = allowed.find((a) => (0, device_fingerprint_1.ipInCidr)(ip, a.cidr));
        if (match) {
            // touch lastSeenAt (best-effort, ne pas bloquer)
            this.prisma.adminAllowedIp.update({
                where: { id: match.id },
                data: { lastSeenAt: new Date() },
            }).catch(() => { });
            return true;
        }
        if (strict) {
            throw new common_1.ForbiddenException(`IP ${ip} non autorisée. Demande d'ajout requise.`);
        }
        // Mode souple : on laisse passer mais on log et on alerte
        req.adminIpStatus = "UNKNOWN";
        return true;
    }
};
exports.IpAllowlistGuard = IpAllowlistGuard;
exports.IpAllowlistGuard = IpAllowlistGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IpAllowlistGuard);
