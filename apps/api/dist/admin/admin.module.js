"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const tome_at_1 = require("../tomes/tome-at");
const admin_audit_service_1 = require("./services/admin-audit.service");
const admin_rate_limit_service_1 = require("./services/admin-rate-limit.service");
const admin_notify_service_1 = require("./services/admin-notify.service");
const admin_auth_service_1 = require("./services/admin-auth.service");
const admin_webauthn_service_1 = require("./services/admin-webauthn.service");
const super_admin_guard_1 = require("./guards/super-admin.guard");
const ip_allowlist_guard_1 = require("./guards/ip-allowlist.guard");
const admin_auth_controller_1 = require("./controllers/admin-auth.controller");
const admin_dashboard_controller_1 = require("./controllers/admin-dashboard.controller");
const admin_actions_controller_1 = require("./controllers/admin-actions.controller");
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
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            tome_at_1.PrismaModule,
            jwt_1.JwtModule.register({
                secret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "dev-secret",
                signOptions: { expiresIn: "15m", audience: "admin", issuer: "citurbarea-admin" },
            }),
        ],
        controllers: [
            admin_auth_controller_1.AdminAuthController,
            admin_dashboard_controller_1.AdminDashboardController,
            admin_actions_controller_1.AdminActionsController,
        ],
        providers: [
            admin_audit_service_1.AdminAuditService,
            admin_rate_limit_service_1.AdminRateLimitService,
            admin_notify_service_1.AdminNotifyService,
            admin_auth_service_1.AdminAuthService,
            admin_webauthn_service_1.AdminWebAuthnService,
            super_admin_guard_1.SuperAdminGuard,
            ip_allowlist_guard_1.IpAllowlistGuard,
        ],
        exports: [
            admin_audit_service_1.AdminAuditService,
            admin_rate_limit_service_1.AdminRateLimitService,
            admin_notify_service_1.AdminNotifyService,
            super_admin_guard_1.SuperAdminGuard,
            ip_allowlist_guard_1.IpAllowlistGuard,
            jwt_1.JwtModule,
        ],
    })
], AdminModule);
