import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { CercleInvitationsService } from "./cercle-invitations.service";
import { JwtService } from "@nestjs/jwt";

/**
 * CercleInvitationsController — Sprint F2
 *
 * Endpoints :
 *  - POST /api/cercles/:cercleId/invite-email   (auth modo+)  → envoyer multi-emails
 *  - GET  /api/cercles/:cercleId/invitations    (auth modo+)  → historique
 *  - GET  /api/cercles/invitations/lookup       (public)      → résoudre token avant inscription
 *  - POST /api/cercles/invitations/signup       (public)      → créer compte + rejoindre cercle
 */

@Tome("tome8")
@Controller("api/cercles")
export class CercleInvitationsController {
  constructor(
    private readonly invitations: CercleInvitationsService,
    private readonly jwt: JwtService,
  ) {}

  private uid(req: any): string {
    return req?.user?.userId || req?.user?.sub;
  }

  // ── Multi-email invite (modo+) ─────────────────────────────────

  @Post(":cercleId/invite-email")
  @UseGuards(JwtAuthGuard)
  async invite(
    @Req() req: any,
    @Param("cercleId") cercleId: string,
    @Body() body: { emails: string[]; message?: string },
  ) {
    return {
      ok: true,
      data: await this.invitations.inviteByEmail(cercleId, this.uid(req), body.emails, body.message),
    };
  }

  // ── Liste des invitations émises (modo+) ──────────────────────

  @Get(":cercleId/invitations")
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: any, @Param("cercleId") cercleId: string) {
    return { ok: true, data: await this.invitations.listForCercle(cercleId, this.uid(req)) };
  }

  // ── Résoudre un token (public, utilisé par la page d'inscription) ──

  @Get("invitations/lookup")
  async lookup(@Query("token") token: string) {
    if (!token) return { ok: false, error: "Token manquant" };
    try {
      const data = await this.invitations.lookupToken(token);
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Invitation invalide" };
    }
  }

  // ── Inscription via invitation (public) ───────────────────────

  @Post("invitations/signup")
  async signup(
    @Body() body: {
      token: string;
      password: string;
      displayName: string;
      metier?: string;
      title?: string;
      villePrincipale?: string;
      phonePublic?: string;
    },
  ) {
    const result = await this.invitations.signupViaInvite(body.token, body);
    // Auto-login après signup : génère un JWT pour redirection directe
    const access_token = this.jwt.sign({
      sub: result.userId,
      userId: result.userId,
      email: result.email,
      role: "CLIENT",
    });
    return { ok: true, data: { ...result, access_token } };
  }
}
