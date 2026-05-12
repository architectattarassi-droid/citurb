import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { AdminAuthService } from "../services/admin-auth.service";
import { AdminWebAuthnService } from "../services/admin-webauthn.service";
import { SuperAdminGuard, RequireAdminRole } from "../guards/super-admin.guard";
import { extractClientIp, extractClientFingerprint, extractUserAgent } from "../utils/device-fingerprint";

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

@Tome("tome5")
@Controller("admin/auth")
export class AdminAuthController {
  constructor(
    private readonly auth: AdminAuthService,
    private readonly webauthn: AdminWebAuthnService,
  ) {}

  private ctx(req: any) {
    return {
      ipAddress: extractClientIp(req),
      userAgent: extractUserAgent(req),
      deviceFingerprint: extractClientFingerprint(req),
    };
  }
  private sessionToken(req: any): string {
    const auth = String(req.headers["authorization"] || "");
    return auth.startsWith("Bearer ") ? auth.slice(7) : (req.body?.sessionToken || "");
  }

  // ── Login flow (public, mais protégé par rate limit interne) ──

  @Post("login")
  async login(@Req() req: any, @Body() body: { email: string; password: string }) {
    return { ok: true, data: await this.auth.loginPassword(body.email, body.password, this.ctx(req)) };
  }

  @Post("email-otp/verify")
  async verifyEmail(@Req() req: any, @Body() body: { code: string }) {
    return { ok: true, data: await this.auth.verifyEmailOtp(this.sessionToken(req), body.code, this.ctx(req)) };
  }

  @Post("sms-otp/verify")
  async verifySms(@Req() req: any, @Body() body: { code: string }) {
    return { ok: true, data: await this.auth.verifySmsOtp(this.sessionToken(req), body.code, this.ctx(req)) };
  }

  private clientOrigin(req: any): string | undefined {
    return req?.headers?.origin || req?.headers?.referer || undefined;
  }

  @Post("webauthn/auth-begin")
  async webauthnBegin(@Req() req: any) {
    return { ok: true, data: await this.webauthn.beginAuthenticate(this.sessionToken(req), this.clientOrigin(req)) };
  }

  @Post("webauthn/auth-finish")
  async webauthnFinish(@Req() req: any, @Body() body: any) {
    return { ok: true, data: await this.webauthn.finishAuthenticate(this.sessionToken(req), body, this.clientOrigin(req)) };
  }

  // ── Enregistrement WebAuthn (admin déjà FULLY_AUTH) ──

  @Post("webauthn/register-begin")
  @UseGuards(SuperAdminGuard)
  async registerBegin(@Req() req: any, @Body() body: { deviceType?: string }) {
    return { ok: true, data: await this.webauthn.beginRegister(req.admin.id, body.deviceType || "Authenticator", this.clientOrigin(req)) };
  }

  @Post("webauthn/register-finish")
  @UseGuards(SuperAdminGuard)
  async registerFinish(@Req() req: any, @Body() body: any) {
    return { ok: true, data: await this.webauthn.finishRegister(req.admin.id, body, body.deviceType, this.clientOrigin(req)) };
  }

  // ── /me + logout ──

  @Get("me")
  @UseGuards(SuperAdminGuard)
  async me(@Req() req: any) {
    return { ok: true, data: req.admin };
  }

  @Post("logout")
  @UseGuards(SuperAdminGuard)
  async logout(@Req() req: any) {
    // Le guard donne sessionId
    return { ok: true };
  }
}
