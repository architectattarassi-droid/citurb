import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { diskStorage } = require("multer");
import { join } from "path";
import { mkdirSync } from "fs";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { CercleInvitationsService } from "./cercle-invitations.service";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";

const UPLOAD_BASE = process.env.UPLOADS_DIR || join(process.cwd(), "uploads");
const AVATAR_DIR = join(UPLOAD_BASE, "avatars");
try { mkdirSync(AVATAR_DIR, { recursive: true }); } catch {}

const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const AVATAR_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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
    private readonly prisma: PrismaService,
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

  // ── Inscription OUVERTE (sans invitation, depuis la landing) ───

  @Post("public/signup")
  async publicSignup(
    @Body() body: {
      email: string;
      password: string;
      displayName: string;
      metier?: string;
      title?: string;
      civilite?: string;
      prenom?: string;
      nom?: string;
      phonePrivate?: string;
      phonePublic?: string;
      cabinetName?: string;
      cabinetStatus?: string;
      cabinetIce?: string;
      cabinetRc?: string;
      cabinetAdresse?: string;
      cnoaNumero?: string;
      yearsExperience?: number;
      ecole?: string;
      anneeDiplome?: number;
      diplome?: string;
      villePrincipale?: string;
      specialites?: string[];
      regions?: string[];
      langues?: string[];
      websiteUrl?: string;
      linkedinUrl?: string;
      emailPublic?: string;
      bio?: string;
      adhesionSouhaitee?: string;
      sourceConnaissance?: string;
      newsletterOptIn?: boolean;
      acceptCgu?: boolean;
      cercleSlug?: string;
    },
  ) {
    const result = await this.invitations.publicSignup(body);
    const access_token = this.jwt.sign({
      sub: result.userId,
      userId: result.userId,
      email: result.email,
      role: "CLIENT",
    });
    return { ok: true, data: { ...result, access_token } };
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
      cabinetName?: string;
      cabinetStatus?: string;
      cnoaNumero?: string;
      yearsExperience?: number;
      ecole?: string;
      anneeDiplome?: number;
      diplome?: string;
      specialites?: string[];
      regions?: string[];
      langues?: string[];
      websiteUrl?: string;
      linkedinUrl?: string;
      emailPublic?: string;
      bio?: string;
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

  // ── Upload avatar de profil (auth, après signup) ───────────────

  @Post("me/profile/avatar")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req: any, _file: any, cb: any) => {
          const userId = req?.user?.userId || req?.user?.sub || "unknown";
          const dir = join(AVATAR_DIR, userId);
          try { mkdirSync(dir, { recursive: true }); } catch {}
          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const ext = (file.originalname.match(/\.(jpg|jpeg|png|webp|gif)$/i) || [".jpg"])[0];
          cb(null, `avatar-${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: AVATAR_MAX_BYTES },
    }),
  )
  async uploadAvatar(@Req() req: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException("Aucun fichier");
    if (!AVATAR_MIMES.has(file.mimetype)) {
      throw new BadRequestException(`Type ${file.mimetype} non autorisé. JPG/PNG/WebP/GIF uniquement.`);
    }
    const userId = req.user.userId || req.user.sub;
    const relative = `avatars/${userId}/${file.filename}`;
    const avatarUrl = `/uploads/${relative}`;
    await this.prisma.proProfile.upsert({
      where: { userId },
      update: { avatarUrl },
      create: {
        userId,
        avatarUrl,
        displayName: req.user.email || "Membre",
        metier: "ARCHITECTE" as any,
      },
    });
    return { ok: true, data: { avatarUrl, fileKey: relative, sizeBytes: file.size } };
  }
}
