import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { CerclesService } from "./cercles.service";
import { EmailService } from "../email/email.service";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcryptjs");
import { randomBytes } from "crypto";

/**
 * CercleInvitationsService — Sprint F2
 *
 * Invitations par email pour rejoindre un cercle. Génère un token magique
 * URL-safe qui pointe vers /inscription?invite=<token>. À l'inscription,
 * le destinataire crée son User + ProProfile et est auto-membre du cercle.
 *
 * Comportement SMTP : tente d'envoyer via SMTP_HOST/USER/PASS. Si absent ou
 * échec, retourne le lien dans la réponse pour que le front l'affiche au
 * modérateur (pour qu'il copie/partage manuellement).
 */

const INVITE_TTL_DAYS = 7;
const TOKEN_BYTES = 24;

export type InviteResult = {
  email: string;
  status: "sent" | "link" | "already-member" | "failed";
  link: string;
  error?: string;
};

@Injectable()
export class CercleInvitationsService {
  private readonly log = new Logger("CercleInvitationsService");
  constructor(
    private readonly prisma: PrismaService,
    private readonly cercles: CerclesService,
    private readonly email: EmailService,
  ) {}

  // ── Invite ─────────────────────────────────────────────────────

  async inviteByEmail(cercleId: string, fromUserId: string, emails: string[], message?: string): Promise<{
    sent: number;
    links: number;
    failed: number;
    results: InviteResult[];
  }> {
    await this.cercles.assertModerator(cercleId, fromUserId);
    if (!emails || emails.length === 0) throw new BadRequestException("Aucun email");
    const cercle = await this.prisma.cercle.findUniqueOrThrow({
      where: { id: cercleId },
      select: { id: true, slug: true, name: true, description: true },
    });
    const inviter = await this.prisma.user.findUniqueOrThrow({
      where: { id: fromUserId },
      select: { id: true, email: true, username: true },
    });

    const cleaned = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@"))));
    if (cleaned.length === 0) throw new BadRequestException("Aucun email valide");

    const results: InviteResult[] = [];
    for (const email of cleaned) {
      try {
        // Si user existe déjà → ajoute en pending invite ou ACTIVE direct si PUBLIC
        const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (existing) {
          const isMember = await this.prisma.cercleMembership.findUnique({
            where: { cercleId_userId: { cercleId, userId: existing.id } },
            select: { status: true },
          });
          if (isMember && isMember.status === "ACTIVE") {
            results.push({ email, status: "already-member", link: "" });
            continue;
          }
        }

        const token = randomBytes(TOKEN_BYTES).toString("base64url");
        const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 3600 * 1000);
        await this.prisma.cercleInvitation.create({
          data: {
            token,
            cercleId,
            email,
            invitedById: fromUserId,
            message: message ?? null,
            expiresAt,
          },
        });
        const link = `${this.webUrl()}/inscription?invite=${encodeURIComponent(token)}`;

        const sent = await this.sendInviteEmail({
          to: email,
          inviterName: inviter.username || inviter.email.split("@")[0],
          inviterEmail: inviter.email,
          cercleName: cercle.name,
          cercleDescription: cercle.description ?? "",
          message: message ?? "",
          link,
        });

        results.push({
          email,
          status: sent ? "sent" : "link",
          link,
        });
      } catch (e: any) {
        this.log.error(`Invite ${email} failed: ${e?.message}`);
        results.push({ email, status: "failed", link: "", error: e?.message });
      }
    }

    return {
      sent: results.filter((r) => r.status === "sent").length,
      links: results.filter((r) => r.status === "link").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    };
  }

  // ── Lookup (page /inscription) ─────────────────────────────────

  async lookupToken(token: string) {
    const inv = await this.prisma.cercleInvitation.findUnique({
      where: { token },
      include: {
        cercle: { select: { id: true, slug: true, name: true, description: true } },
        invitedBy: { select: { id: true, email: true, username: true } },
      },
    });
    if (!inv) throw new NotFoundException("Invitation introuvable");
    if (inv.usedAt) throw new BadRequestException("Invitation déjà utilisée");
    if (inv.expiresAt.getTime() < Date.now()) throw new BadRequestException("Invitation expirée");
    return {
      email: inv.email,
      message: inv.message,
      expiresAt: inv.expiresAt,
      cercle: inv.cercle,
      invitedBy: inv.invitedBy,
    };
  }

  // ── Signup via invitation ──────────────────────────────────────

  async signupViaInvite(
    token: string,
    input: {
      password: string;
      displayName: string;
      metier?: string;
      title?: string;
      villePrincipale?: string;
      phonePublic?: string;
      // Champs enrichis Sprint K
      cabinetName?: string;
      cabinetStatus?: string; // INDEPENDANT_PHYSIQUE | LIBERAL | ASSOCIE | SALARIE_CABINET | SALARIE_ENTREPRISE | FONCTIONNAIRE | ENSEIGNANT | ETUDIANT | RETRAITE | HONORAIRE
      cnoaNumero?: string;
      yearsExperience?: number;
      // Formation
      ecole?: string;
      anneeDiplome?: number;
      diplome?: string;
      // Spécialités + régions
      specialites?: string[];
      regions?: string[];
      langues?: string[];
      // Réseaux
      websiteUrl?: string;
      linkedinUrl?: string;
      emailPublic?: string;
      // Bio
      bio?: string;
    },
  ): Promise<{ userId: string; cercleSlug: string; email: string }> {
    if (!input.password || input.password.length < 8) {
      throw new BadRequestException("Mot de passe ≥ 8 caractères requis");
    }
    if (!input.displayName?.trim()) throw new BadRequestException("Nom d'affichage requis");

    const inv = await this.prisma.cercleInvitation.findUnique({
      where: { token },
      include: { cercle: { select: { id: true, slug: true } } },
    });
    if (!inv) throw new NotFoundException("Invitation introuvable");
    if (inv.usedAt) throw new BadRequestException("Invitation déjà utilisée");
    if (inv.expiresAt.getTime() < Date.now()) throw new BadRequestException("Invitation expirée");

    // Si user existe déjà avec cet email → on associe (pas de re-création)
    let user = await this.prisma.user.findUnique({ where: { email: inv.email } });
    if (!user) {
      const passwordHash = await bcrypt.hash(input.password, 10);
      user = await this.prisma.user.create({
        data: {
          email: inv.email,
          username: input.displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24),
          passwordHash,
          role: "CLIENT",
          plan: "PRO",
          isActive: true,
          emailVerifiedAt: new Date(),
        },
      });
    }

    // Construit le ProProfile complet avec tous les champs enrichis
    const formations = (input.ecole && input.anneeDiplome) ? [{
      ecole: input.ecole,
      diplome: input.diplome || "Diplôme d'État d'Architecte",
      annee: input.anneeDiplome,
    }] : [];

    const profileData = {
      displayName: input.displayName.trim(),
      title: input.title ?? null,
      bio: input.bio ?? null,
      metier: (input.metier as any) || "ARCHITECTE",
      cabinetName: input.cabinetName ?? null,
      cabinetStatus: input.cabinetStatus ?? null,
      cnoaNumero: input.cnoaNumero ?? null,
      yearsExperience: input.yearsExperience ?? null,
      formations: formations.length > 0 ? formations as any : null,
      villePrincipale: input.villePrincipale ?? null,
      phonePublic: input.phonePublic ?? null,
      emailPublic: input.emailPublic ?? user.email,
      regions: input.regions ?? [],
      specialites: input.specialites ?? [],
      langues: input.langues ?? ["FR", "AR"],
      agrements: input.cnoaNumero ? [input.cnoaNumero] : [],
      websiteUrl: input.websiteUrl ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
      isVerified: false,
    };

    const profileExists = await this.prisma.proProfile.findUnique({ where: { userId: user.id } });
    if (!profileExists) {
      await this.prisma.proProfile.create({ data: { userId: user.id, ...profileData } });
    } else {
      await this.prisma.proProfile.update({ where: { userId: user.id }, data: profileData });
    }

    // Membership ACTIVE
    await this.prisma.cercleMembership.upsert({
      where: { cercleId_userId: { cercleId: inv.cercleId, userId: user.id } },
      update: { status: "ACTIVE", role: "MEMBER" },
      create: { cercleId: inv.cercleId, userId: user.id, status: "ACTIVE", role: "MEMBER" },
    });

    await this.prisma.cercleInvitation.update({
      where: { id: inv.id },
      data: { usedAt: new Date() },
    });

    return { userId: user.id, cercleSlug: inv.cercle.slug, email: user.email };
  }

  // ── List invitations (modos) ───────────────────────────────────

  async listForCercle(cercleId: string, viewerId: string) {
    await this.cercles.assertModerator(cercleId, viewerId);
    return this.prisma.cercleInvitation.findMany({
      where: { cercleId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        email: true,
        message: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
        invitedBy: { select: { id: true, username: true, email: true } },
      },
    });
  }

  // ── Email / utils ──────────────────────────────────────────────

  private webUrl(): string {
    return process.env.PUBLIC_WEB_URL?.replace(/\/$/, "") || "http://localhost:5173";
  }

  private async sendInviteEmail(opts: {
    to: string;
    inviterName: string;
    inviterEmail: string;
    cercleName: string;
    cercleDescription: string;
    message: string;
    link: string;
  }): Promise<boolean> {
    if (!this.email.isConfigured()) {
      this.log.warn(`[Invitations] Aucun provider email — lien renvoyé au front pour ${opts.to}`);
      return false;
    }
    const subject = `${opts.inviterName} vous invite à rejoindre ${opts.cercleName} sur CITURBAREA Cercles`;
    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 24px auto; padding: 0 16px; color: #1A1F2E;">
  <div style="background: #0F2A4A; color: #FAF7F2; padding: 24px 28px; border-radius: 8px 8px 0 0;">
    <div style="font-size: 13px; letter-spacing: 0.20em; color: #B08D57;">CITURBAREA · CERCLES</div>
    <h1 style="font-family: Georgia, serif; font-size: 22px; margin: 8px 0 0; font-weight: 600;">Vous êtes invité(e)</h1>
  </div>
  <div style="background: white; padding: 28px; border: 1px solid #E8E2D5; border-top: 0; border-radius: 0 0 8px 8px;">
    <p style="font-size: 15px; line-height: 1.55;">Bonjour,</p>
    <p style="font-size: 15px; line-height: 1.55;">
      <strong>${this.esc(opts.inviterName)}</strong> (${this.esc(opts.inviterEmail)})
      vous invite à rejoindre le cercle professionnel
      <strong>${this.esc(opts.cercleName)}</strong> sur CITURBAREA — la plateforme des pros du BTP marocain.
    </p>
    ${opts.cercleDescription ? `<p style="font-size: 14px; color: #5C6373; font-style: italic; line-height: 1.5;">« ${this.esc(opts.cercleDescription)} »</p>` : ""}
    ${opts.message ? `<div style="background: #F2EDE3; padding: 12px 16px; border-left: 3px solid #B08D57; margin: 18px 0; font-size: 14px; line-height: 1.5;"><strong>Mot de l'invitant :</strong><br />${this.esc(opts.message)}</div>` : ""}
    <div style="text-align: center; margin: 28px 0;">
      <a href="${opts.link}" style="display: inline-block; background: #0F2A4A; color: #FAF7F2; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; letter-spacing: 0.04em;">Créer mon compte et rejoindre</a>
    </div>
    <p style="font-size: 12px; color: #8B91A1; text-align: center;">Le lien expire dans 7 jours.</p>
    <p style="font-size: 11px; color: #8B91A1; text-align: center; margin-top: 16px;">Si vous n'attendiez pas cette invitation, vous pouvez l'ignorer.</p>
  </div>
</body></html>`;

    const r = await this.email.send({
      to: opts.to,
      subject,
      html,
      text: `${opts.inviterName} t'invite à rejoindre ${opts.cercleName} sur CITURBAREA Cercles.\n\nLien d'inscription : ${opts.link}\n\nLe lien expire dans 7 jours.`,
      from: process.env.RESEND_FROM || `CITURBAREA Cercles <onboarding@resend.dev>`,
    });
    if (r.ok) {
      this.log.log(`[Invitations] Email envoyé à ${opts.to} via ${r.provider}`);
      return true;
    }
    this.log.error(`[Invitations] Échec envoi à ${opts.to}: ${r.error}`);
    return false;
  }

  private esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
}
