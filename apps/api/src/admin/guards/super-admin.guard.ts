import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { extractClientIp, extractClientFingerprint } from "../utils/device-fingerprint";

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

export const REQUIRE_ADMIN_ROLE = "require_admin_role";
export const RequireAdminRole = (...roles: Array<"SUPER_ADMIN" | "ADMIN_AUDIT" | "ADMIN_SUPPORT" | "ADMIN_READ_ONLY">) =>
  SetMetadata(REQUIRE_ADMIN_ROLE, roles);

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const auth = String(req.headers["authorization"] || "");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) throw new UnauthorizedException("Token admin requis");

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "dev-secret",
        audience: "admin",
      });
    } catch {
      throw new UnauthorizedException("Token admin invalide ou expiré");
    }

    const jti = payload.jti as string;
    const adminUserId = payload.sub as string;
    if (!jti || !adminUserId) throw new UnauthorizedException("Payload JWT incomplet");

    // Session lookup
    const session = await this.prisma.adminSession.findUnique({
      where: { jwtJti: jti },
      include: { adminUser: true },
    });
    if (!session) throw new UnauthorizedException("Session admin introuvable");
    if (session.revokedAt) throw new UnauthorizedException("Session révoquée");
    if (session.step !== "FULLY_AUTH") throw new UnauthorizedException("Session non complète");
    if (session.jwtExpiresAt && session.jwtExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Session expirée");
    }
    if (!session.adminUser) throw new UnauthorizedException("Admin introuvable");
    if (!session.adminUser.isActive || session.adminUser.suspendedAt) {
      throw new ForbiddenException("Compte admin suspendu");
    }
    if (session.adminUser.lockedUntil && session.adminUser.lockedUntil.getTime() > Date.now()) {
      throw new ForbiddenException("Compte admin verrouillé temporairement");
    }

    // Device fingerprint check — si le client envoie un fingerprint différent, on révoque.
    // EXCEPTION : pour les endpoints WebAuthn register (premier login sans passkey),
    // on tolère le mismatch (le user a peut-être ouvert nouvelle fenêtre) — juste warn.
    const clientFp = extractClientFingerprint(req);
    const path = String(req.path || req.url || "");
    const isRegisterFlow = path.includes("/admin/auth/webauthn/register");
    if (session.deviceFingerprint && clientFp !== session.deviceFingerprint && !isRegisterFlow) {
      await this.prisma.adminSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date(), revokedReason: "FINGERPRINT_MISMATCH" },
      });
      throw new UnauthorizedException("Empreinte appareil non reconnue — session révoquée");
    }

    // Rôle requis
    const requiredRoles = this.reflector.get<string[]>(REQUIRE_ADMIN_ROLE, ctx.getHandler())
      || this.reflector.get<string[]>(REQUIRE_ADMIN_ROLE, ctx.getClass())
      || [];
    if (requiredRoles.length > 0 && !requiredRoles.includes(session.adminUser.role)) {
      throw new ForbiddenException(`Rôle ${requiredRoles.join("/")} requis`);
    }

    // Injecte l'admin dans la requête pour les controllers
    req.admin = {
      id: session.adminUser.id,
      email: session.adminUser.email,
      displayName: session.adminUser.displayName,
      role: session.adminUser.role,
      sessionId: session.id,
      ipAddress: extractClientIp(req),
      deviceFingerprint: clientFp,
    };

    return true;
  }
}
