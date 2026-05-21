import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at";

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
@Injectable()
export class ProAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req: any = ctx.switchToHttp().getRequest();
    const user = req?.user;
    if (!user) throw new UnauthorizedException("Auth required");

    // Whitelist : endpoints profil pro (lecture + amorce)
    const url: string = req.originalUrl || req.url || "";
    if (url.startsWith("/api/cercles/me/profile")) return true;

    const role = user.role;
    if (role === "OWNER" || role === "ADMIN" || role === "OPS") return true;

    const userId = user.userId || user.sub;
    if (!userId) throw new UnauthorizedException("Auth required");

    const profile = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new ForbiddenException("Cercles est réservé aux comptes pros");
    }
    return true;
  }
}
