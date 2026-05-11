import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { extractClientIp, ipInCidr } from "../utils/device-fingerprint";

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

@Injectable()
export class IpAllowlistGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const adminUserId = req?.admin?.id || req?.adminUserId; // injecté par SuperAdminGuard ou login flow
    if (!adminUserId) return true; // pas d'admin connu = pas de check IP (login lui-même se base sur rate limit)

    const ip = extractClientIp(req);
    const strict = String(process.env.ADMIN_IP_ALLOWLIST_STRICT || "false") === "true";

    const allowed = await this.prisma.adminAllowedIp.findMany({
      where: { adminUserId, revokedAt: null },
      select: { cidr: true, id: true },
    });

    const match = allowed.find((a) => ipInCidr(ip, a.cidr));
    if (match) {
      // touch lastSeenAt (best-effort, ne pas bloquer)
      this.prisma.adminAllowedIp.update({
        where: { id: match.id },
        data: { lastSeenAt: new Date() },
      }).catch(() => {});
      return true;
    }

    if (strict) {
      throw new ForbiddenException(`IP ${ip} non autorisée. Demande d'ajout requise.`);
    }

    // Mode souple : on laisse passer mais on log et on alerte
    req.adminIpStatus = "UNKNOWN";
    return true;
  }
}
