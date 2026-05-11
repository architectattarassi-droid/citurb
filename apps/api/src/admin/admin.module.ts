import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../tomes/tome-at";
import { AdminAuditService } from "./services/admin-audit.service";
import { AdminRateLimitService } from "./services/admin-rate-limit.service";
import { AdminNotifyService } from "./services/admin-notify.service";
import { AdminAuthService } from "./services/admin-auth.service";
import { AdminWebAuthnService } from "./services/admin-webauthn.service";
import { SuperAdminGuard } from "./guards/super-admin.guard";
import { IpAllowlistGuard } from "./guards/ip-allowlist.guard";
import { AdminAuthController } from "./controllers/admin-auth.controller";
import { AdminDashboardController } from "./controllers/admin-dashboard.controller";
import { AdminActionsController } from "./controllers/admin-actions.controller";

/**
 * AdminModule — Sprint H.
 *
 * App admin ultra-sécurisée séparée. Tous les endpoints sont sous /admin/*.
 *
 * Couches de protection activées :
 *  1. Password fort + bcrypt cost 14 (login flow)
 *  2. OTP Email obligatoire
 *  3. OTP SMS obligatoire (Twilio)
 *  4. WebAuthn / Passkey obligatoire (Windows Hello + YubiKey)
 *  5. IP allowlist (mode strict ou souple)
 *  6. Device fingerprint (révocation auto si change)
 *  7. Session courte 15min + JWT jti tracking
 *  8. Audit log immuable hash-chain
 *  9. Notifications temps réel email + SMS
 * 10. Rate limiting strict + lockout
 */

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "dev-secret",
      signOptions: { expiresIn: "15m", audience: "admin", issuer: "citurbarea-admin" },
    }),
  ],
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminActionsController,
  ],
  providers: [
    AdminAuditService,
    AdminRateLimitService,
    AdminNotifyService,
    AdminAuthService,
    AdminWebAuthnService,
    SuperAdminGuard,
    IpAllowlistGuard,
  ],
  exports: [
    AdminAuditService,
    AdminRateLimitService,
    AdminNotifyService,
    SuperAdminGuard,
    IpAllowlistGuard,
    JwtModule,
  ],
})
export class AdminModule {}
