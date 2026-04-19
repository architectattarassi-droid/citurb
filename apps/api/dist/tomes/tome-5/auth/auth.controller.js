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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const tome_at_1 = require("../../tome-at");
const tome_decorators_1 = require("../../tome-at/kernel/tome.decorators");
let AuthController = class AuthController {
    auth;
    constructor(auth) {
        this.auth = auth;
    }
    async login(body) {
        return this.auth.login(body.email, body.password);
    }
    /**
     * DEV ONLY: creates an OWNER user once.
     * Protect/disable in production deployment.
     */
    async me(req) {
        const userId = req.user?.userId;
        // Hardening: avoid 500s if a stale/invalid token yields an unexpected payload shape.
        if (!userId)
            throw new common_1.UnauthorizedException('Not authenticated');
        return this.auth.me(userId);
    }
    /**
     * DEV ONLY bootstrap.
     * In production, this route is forbidden.
     */
    async ensureOwner() {
        if (process.env.NODE_ENV === "production") {
            throw new common_1.ForbiddenException("ensure-owner is disabled in production");
        }
        // Prefer CIT_* names (shared across API + OPS + backoffice) but keep backward compatibility.
        const ownerEmail = process.env.CIT_OWNER_EMAIL ||
            process.env.OWNER_EMAIL ||
            "owner@citurbarea.local";
        const ownerPassword = process.env.CIT_OWNER_PASSWORD ||
            process.env.OWNER_PASSWORD ||
            "ChangeMeNow!";
        await this.auth.ensureOwner(ownerEmail, ownerPassword);
        // Optional extra accounts
        const adminEmail = process.env.CIT_ADMIN_EMAIL || process.env.ADMIN_EMAIL || null;
        const adminPassword = process.env.CIT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || null;
        if (adminEmail && adminPassword) {
            await this.auth.ensureAdmin(adminEmail, adminPassword);
        }
        const opsEmail = process.env.CIT_OPS_EMAIL || process.env.OPS_EMAIL || null;
        const opsPassword = process.env.CIT_OPS_PASSWORD || process.env.OPS_PASSWORD || null;
        if (opsEmail && opsPassword) {
            await this.auth.ensureOps(opsEmail, opsPassword);
        }
        // In dev, return the bootstrap password so you can log in immediately.
        return { ok: true, ownerEmail, adminEmail, opsEmail, devPassword: ownerPassword };
    }
    /**
     * DEV ONLY: force-reset OWNER password to the configured default.
     * Useful when you can't log in after experimenting.
     */
    async resetOwnerPassword() {
        if (process.env.NODE_ENV === "production") {
            throw new common_1.ForbiddenException("reset-owner-password is disabled in production");
        }
        const ownerEmail = process.env.CIT_OWNER_EMAIL ||
            process.env.OWNER_EMAIL ||
            "owner@citurbarea.local";
        const ownerPassword = process.env.CIT_OWNER_PASSWORD ||
            process.env.OWNER_PASSWORD ||
            "ChangeMeNow!";
        // ensureOwner will upsert + set password for dev
        await this.auth.ensureOwner(ownerEmail, ownerPassword);
        return { ok: true, ownerEmail, devPassword: ownerPassword };
    }
    async register(body) {
        return this.auth.register(body.email, body.password, body.username);
    }
    async sendOtp(req, body) {
        await this.auth.sendPhoneOtp(req.user.userId, body.phone);
        return { ok: true, message: 'Code envoyé' };
    }
    async verifyOtp(req, body) {
        await this.auth.verifyPhoneOtp(req.user.userId, body.phone, body.code);
        return { ok: true };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)("login"),
    (0, tome_decorators_1.Rule)('T5-AUTH-LOGIN'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)("me"),
    (0, tome_decorators_1.Rule)('T5-AUTH-ME'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Get)("dev/ensure-owner"),
    (0, tome_decorators_1.Rule)('T5-AUTH-ENSURE-OWNER'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "ensureOwner", null);
__decorate([
    (0, common_1.Get)("dev/reset-owner-password"),
    (0, tome_decorators_1.Rule)('T5-AUTH-RESET-OWNER_PASSWORD'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetOwnerPassword", null);
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('send-otp'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('verify-otp'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
exports.AuthController = AuthController = __decorate([
    (0, tome_at_1.Tome)('tome5'),
    (0, common_1.Controller)("auth"),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
