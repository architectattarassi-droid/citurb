import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { Tome } from '../../tome-at';
import { Rule } from "../../tome-at/kernel/tome.decorators";

@Tome('tome5')
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  @Rule('T5-AUTH-LOGIN')
  async login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  /**
   * DEV ONLY: creates an OWNER user once.
   * Protect/disable in production deployment.
   */
  @UseGuards(JwtAuthGuard)
  @Get("me")
  @Rule('T5-AUTH-ME')
  async me(@Req() req: any) {
    const userId = req.user?.userId;
    // Hardening: avoid 500s if a stale/invalid token yields an unexpected payload shape.
    if (!userId) throw new UnauthorizedException('Not authenticated');
    return this.auth.me(userId);
  }

  /**
   * DEV ONLY bootstrap.
   * In production, this route is forbidden.
   */
  @Get("dev/ensure-owner")
  @Rule('T5-AUTH-ENSURE-OWNER')
  async ensureOwner(): Promise<{ ok: true; ownerEmail: string; adminEmail: string | null; opsEmail: string | null; devPassword?: string }> {
    if (process.env.NODE_ENV === "production") {
      throw new ForbiddenException("ensure-owner is disabled in production");
    }

    // Prefer CIT_* names (shared across API + OPS + backoffice) but keep backward compatibility.
    const ownerEmail =
      process.env.CIT_OWNER_EMAIL ||
      process.env.OWNER_EMAIL ||
      "owner@citurbarea.local";
    const ownerPassword =
      process.env.CIT_OWNER_PASSWORD ||
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
  @Get("dev/reset-owner-password")
  @Rule('T5-AUTH-RESET-OWNER_PASSWORD')
  async resetOwnerPassword(): Promise<{ ok: true; ownerEmail: string; devPassword: string }> {
    if (process.env.NODE_ENV === "production") {
      throw new ForbiddenException("reset-owner-password is disabled in production");
    }

    const ownerEmail =
      process.env.CIT_OWNER_EMAIL ||
      process.env.OWNER_EMAIL ||
      "owner@citurbarea.local";
    const ownerPassword =
      process.env.CIT_OWNER_PASSWORD ||
      process.env.OWNER_PASSWORD ||
      "ChangeMeNow!";

    // ensureOwner will upsert + set password for dev
    await this.auth.ensureOwner(ownerEmail, ownerPassword);
    return { ok: true, ownerEmail, devPassword: ownerPassword };
  }

  @Post('register')
  async register(@Body() body: { email: string; password: string; username?: string }) {
    return this.auth.register(body.email, body.password, body.username);
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-otp')
  async sendOtp(@Req() req: any, @Body() body: { phone: string }) {
    await this.auth.sendPhoneOtp(req.user.userId, body.phone);
    return { ok: true, message: 'Code envoyé' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-otp')
  async verifyOtp(@Req() req: any, @Body() body: { phone: string; code: string }) {
    await this.auth.verifyPhoneOtp(req.user.userId, body.phone, body.code);
    return { ok: true };
  }
}
