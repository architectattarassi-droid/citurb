import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { PrismaModule } from "../../tome-at/kernel/prisma/prisma.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { OtpService } from "../../../modules/otp/otp.service";
import { PasswordResetService } from "./password-reset.service";
import { SignupVerificationService } from "./signup-verification.service";
import { EmailSignupService } from "./email-signup.service";
import { OwnerNotifyModule } from "../../../modules/owner-notify/owner-notify.module";

/**
 * TOME 5 — Auth/RBAC
 * Minimal auth only for OPS/ADMIN/OWNER access.
 * Front public stays anonymous/state-driven.
 */
@Module({
  imports: [
    PrismaModule,
    PassportModule,
    OwnerNotifyModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "dev-secret-change-me",
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, OtpService, PasswordResetService, SignupVerificationService, EmailSignupService],
  exports: [AuthService],
})
export class Tome5AuthModule {}
