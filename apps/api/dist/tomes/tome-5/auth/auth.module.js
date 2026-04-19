"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tome5AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const prisma_module_1 = require("../../tome-at/kernel/prisma/prisma.module");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const jwt_strategy_1 = require("./jwt.strategy");
const otp_service_1 = require("../../../modules/otp/otp.service");
const owner_notify_module_1 = require("../../../modules/owner-notify/owner-notify.module");
/**
 * TOME 5 — Auth/RBAC
 * Minimal auth only for OPS/ADMIN/OWNER access.
 * Front public stays anonymous/state-driven.
 */
let Tome5AuthModule = class Tome5AuthModule {
};
exports.Tome5AuthModule = Tome5AuthModule;
exports.Tome5AuthModule = Tome5AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            passport_1.PassportModule,
            owner_notify_module_1.OwnerNotifyModule,
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET || "dev-secret-change-me",
                signOptions: { expiresIn: "2h" },
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy, otp_service_1.OtpService],
        exports: [auth_service_1.AuthService],
    })
], Tome5AuthModule);
