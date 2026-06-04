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
import { Controller, Post, Req, UnauthorizedException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { Tome } from "../../tomes/tome-at";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { AuthService } from "../../tomes/tome-5/auth/auth.service";

@Tome("tome9")
@Controller("api/admin/bridge")
export class AdminBridgeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  @Post("to-user")
  async toUser(@Req() req: any) {
    const auth = (req.headers?.authorization || "") as string;
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!token) throw new UnauthorizedException("Session token manquant");

    // Validation manuelle session admin (équivalent loadSession privé).
    const session = await this.prisma.adminSession.findUnique({ where: { sessionToken: token } });
    if (!session) throw new UnauthorizedException("Session introuvable");
    if (session.revokedAt) throw new UnauthorizedException("Session révoquée");
    if (session.expiresAt.getTime() < Date.now()) throw new UnauthorizedException("Session expirée");

    const adminUser = await this.prisma.adminUser.findUnique({ where: { id: session.adminUserId } });
    if (!adminUser) throw new UnauthorizedException("AdminUser introuvable");
    if (!adminUser.isActive) throw new UnauthorizedException("AdminUser désactivé");

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
        passwordHash: `vault-only:${randomBytes(32).toString("hex")}`,
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
}
