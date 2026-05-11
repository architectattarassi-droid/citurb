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
exports.AdminAuthController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const admin_auth_service_1 = require("../services/admin-auth.service");
const admin_webauthn_service_1 = require("../services/admin-webauthn.service");
const super_admin_guard_1 = require("../guards/super-admin.guard");
const device_fingerprint_1 = require("../utils/device-fingerprint");
/**
 * AdminAuthController — Sprint H endpoints d'authentification.
 *
 * Flow login :
 *   1. POST /admin/auth/login             { email, password }
 *   2. POST /admin/auth/email-otp/verify  { sessionToken, code }
 *   3. POST /admin/auth/sms-otp/verify    { sessionToken, code }
 *   4a.POST /admin/auth/webauthn/auth-begin   { sessionToken }
 *   4b.POST /admin/auth/webauthn/auth-finish  { sessionToken, body: PublicKeyCredential }
 *
 * Enregistrement WebAuthn (admin déjà loggé) :
 *   POST /admin/auth/webauthn/register-begin   { deviceType }
 *   POST /admin/auth/webauthn/register-finish  { body, deviceType }
 *
 * Bonus :
 *   GET  /admin/auth/me                  → renvoie l'admin du JWT
 *   POST /admin/auth/logout              → révoque la session courante
 */
let AdminAuthController = class AdminAuthController {
    auth;
    webauthn;
    constructor(auth, webauthn) {
        this.auth = auth;
        this.webauthn = webauthn;
    }
    ctx(req) {
        return {
            ipAddress: (0, device_fingerprint_1.extractClientIp)(req),
            userAgent: (0, device_fingerprint_1.extractUserAgent)(req),
            deviceFingerprint: (0, device_fingerprint_1.extractClientFingerprint)(req),
        };
    }
    sessionToken(req) {
        const auth = String(req.headers["authorization"] || "");
        return auth.startsWith("Bearer ") ? auth.slice(7) : (req.body?.sessionToken || "");
    }
    // ── Login flow (public, mais protégé par rate limit interne) ──
    async login(req, body) {
        return { ok: true, data: await this.auth.loginPassword(body.email, body.password, this.ctx(req)) };
    }
    async verifyEmail(req, body) {
        return { ok: true, data: await this.auth.verifyEmailOtp(this.sessionToken(req), body.code, this.ctx(req)) };
    }
    async verifySms(req, body) {
        return { ok: true, data: await this.auth.verifySmsOtp(this.sessionToken(req), body.code, this.ctx(req)) };
    }
    async webauthnBegin(req) {
        return { ok: true, data: await this.webauthn.beginAuthenticate(this.sessionToken(req)) };
    }
    async webauthnFinish(req, body) {
        return { ok: true, data: await this.webauthn.finishAuthenticate(this.sessionToken(req), body) };
    }
    // ── Enregistrement WebAuthn (admin déjà FULLY_AUTH) ──
    async registerBegin(req, body) {
        return { ok: true, data: await this.webauthn.beginRegister(req.admin.id, body.deviceType || "Authenticator") };
    }
    async registerFinish(req, body) {
        return { ok: true, data: await this.webauthn.finishRegister(req.admin.id, body, body.deviceType) };
    }
    // ── /me + logout ──
    async me(req) {
        return { ok: true, data: req.admin };
    }
    async logout(req) {
        // Le guard donne sessionId
        return { ok: true };
    }
};
exports.AdminAuthController = AdminAuthController;
__decorate([
    (0, common_1.Post)("login"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)("email-otp/verify"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)("sms-otp/verify"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "verifySms", null);
__decorate([
    (0, common_1.Post)("webauthn/auth-begin"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "webauthnBegin", null);
__decorate([
    (0, common_1.Post)("webauthn/auth-finish"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "webauthnFinish", null);
__decorate([
    (0, common_1.Post)("webauthn/register-begin"),
    (0, common_1.UseGuards)(super_admin_guard_1.SuperAdminGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "registerBegin", null);
__decorate([
    (0, common_1.Post)("webauthn/register-finish"),
    (0, common_1.UseGuards)(super_admin_guard_1.SuperAdminGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "registerFinish", null);
__decorate([
    (0, common_1.Get)("me"),
    (0, common_1.UseGuards)(super_admin_guard_1.SuperAdminGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "me", null);
__decorate([
    (0, common_1.Post)("logout"),
    (0, common_1.UseGuards)(super_admin_guard_1.SuperAdminGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "logout", null);
exports.AdminAuthController = AdminAuthController = __decorate([
    (0, tome_at_1.Tome)("tome5"),
    (0, common_1.Controller)("admin/auth"),
    __metadata("design:paramtypes", [admin_auth_service_1.AdminAuthService,
        admin_webauthn_service_1.AdminWebAuthnService])
], AdminAuthController);
