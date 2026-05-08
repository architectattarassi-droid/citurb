import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { Tome } from "../../tome-at";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { AuthService } from "../../tome-5/auth/auth.service";
import { JwtAuthGuard } from "../../tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../../tome-5/auth/roles.guard";
import { Roles } from "../../tome-5/auth/roles.decorator";
import { DossierService } from "./dossier.service";
import { OwnerNotifyService } from "../../../modules/owner-notify/owner-notify.service";
import { ClientNotifyService } from "../../../modules/client-notify/client-notify.service";

/**
 * AdminDossierController — Création et invitation côté admin (Command Center)
 *
 *   POST /api/cc/dossiers/admin-create   — crée un dossier complet sans le wizard public
 *   POST /api/cc/dossiers/:id/invite     — invite le client par email avec magic-login
 *
 * Doctrine : l'atelier doit pouvoir piloter un projet en autonomie totale,
 * créer un dossier directement et — quand le client revient — lui ouvrir
 * l'accès au portail via un lien sécurisé sans qu'il ait à recréer un compte.
 */

interface AdminCreatePayload {
  porteType: "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
  // Identité client
  clientNom?: string;
  clientTel?: string;
  clientEmail?: string;
  raisonSociale?: string;
  rc?: string;
  ice?: string;
  representant?: string;
  // Projet
  title?: string;
  commune?: string;
  natureProjet?: string;
  surfaceTerrain?: number;
  surfacePlancher?: number;
  nbNiveaux?: number;
  // Multi-porte
  sousType?: string;
  sousTypeP2?: string;
  gestionMode?: string;
  // Brief (devis snapshot, etc.)
  brief?: any;
  // Locale par défaut pour les emails
  lang?: "fr" | "en" | "ar";
  // Comportement
  inviteClient?: boolean; // si true et email fourni, envoie magic-login
  packPriceMAD?: number;
  packSelected?: string;
}

@Tome("tome2")
@Controller("api/cc/dossiers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "OWNER", "OPS")
export class AdminDossierController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly dossiers: DossierService,
    private readonly ownerNotify: OwnerNotifyService,
    private readonly clientNotify: ClientNotifyService,
  ) {}

  @Post("admin-create")
  async adminCreate(@Body() body: AdminCreatePayload) {
    if (!body.porteType) throw new Error("porteType requis (P1..P6)");
    if (!body.clientNom && !body.raisonSociale && !body.clientEmail && !body.clientTel) {
      throw new Error("Au moins un identifiant client requis (nom, raison sociale, email ou tél)");
    }

    const porteType = body.porteType;
    const email = (body.clientEmail || `client-${Date.now()}@citurbarea.local`).toLowerCase().trim();
    const lang = body.lang === "en" || body.lang === "ar" ? body.lang : "fr";

    // 1. Find / create user CLIENT
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const tempPassword = `Citurb-${Math.random().toString(36).slice(2, 10)}!`;
      const reg = await this.auth.register(email, tempPassword, body.clientNom || body.raisonSociale || undefined);
      user = await this.prisma.user.findUnique({ where: { id: reg.user.id } });
    }
    if (!user) throw new Error("Échec création/récupération du compte client");

    // 2. Crée le dossier (DossierService gère phase BRIEF auto)
    const title = body.title || `${porteType} — ${body.commune || body.sousType || body.sousTypeP2 || body.clientNom || "Demande"}`;
    const dossier = await this.dossiers.create(user.id, {
      title,
      commune: body.commune,
      porteType,
      gestionMode: body.gestionMode || "AUTONOME",
      sousTypeP2: body.sousTypeP2 || body.sousType,
      natureProjet: body.natureProjet,
      surfaceTerrain: body.surfaceTerrain,
      surfacePlancher: body.surfacePlancher,
      nbNiveaux: body.nbNiveaux,
      raisonSociale: body.raisonSociale,
      rc: body.rc,
      ice: body.ice,
      representant: body.representant,
      clientNom: body.clientNom,
      clientTel: body.clientTel,
      clientEmail: email,
      packSelected: body.packSelected,
      packPriceMAD: body.packPriceMAD,
      payload: {
        brief: body.brief,
        source: "ADMIN_CREATE",
        lang,
        adminCreatedAt: new Date().toISOString(),
      },
    });

    // 3. Notif owner — dossier créé manuellement par admin
    this.ownerNotify.notify("DOSSIER_CREATED", {
      title, commune: body.commune,
      packSelected: body.packSelected || `${porteType} ${body.gestionMode || "AUTONOME"} (admin)`,
      dossierId: dossier.id,
    }).catch(() => {});

    // 4. Optionnellement invite le client (magic-login + email)
    let inviteResult: { invited: boolean; magicLoginUrl?: string; tokenIssued?: boolean } = { invited: false };
    if (body.inviteClient && body.clientEmail && !body.clientEmail.endsWith(".local")) {
      try {
        const tokenRes = await this.auth.issueTokenForUser(user.id);
        const webUrl = process.env.PUBLIC_WEB_URL || "https://citurb-web-production.up.railway.app";
        const magicLoginUrl = `${webUrl}/portal?magicToken=${encodeURIComponent(tokenRes.access_token)}`;
        // Email "demande reçue" suffit — il contient déjà les liens vers /portal
        this.clientNotify.demandeRecue({
          to: email,
          porteType,
          dossierId: dossier.id,
          clientNom: body.clientNom || body.raisonSociale,
          title,
          lang,
        }).catch(() => {});
        inviteResult = { invited: true, magicLoginUrl, tokenIssued: true };
      } catch (e: any) {
        inviteResult = { invited: false };
      }
    }

    return {
      ok: true,
      dossierId: dossier.id,
      userId: user.id,
      title,
      porteType,
      ...inviteResult,
    };
  }

  /**
   * Invite (ou réinvite) le client à reprendre la main sur un dossier existant.
   * Émet un nouveau token magic-login et le délivre par email.
   */
  @Post(":id/invite")
  async inviteExisting(@Param("id") dossierId: string, @Body() body: { lang?: "fr" | "en" | "ar" }) {
    const dossier = await this.prisma.dossier.findUniqueOrThrow({
      where: { id: dossierId },
      select: { id: true, ownerId: true, porteType: true, title: true, clientNom: true, clientEmail: true, payload: true },
    });
    if (!dossier.clientEmail || dossier.clientEmail.endsWith(".local") || dossier.clientEmail.endsWith(".unknown")) {
      return { ok: false, error: "Aucun email client valide sur ce dossier — éditez d'abord les coordonnées." };
    }
    const langRaw = body?.lang || (dossier.payload as any)?.lang;
    const lang: "fr" | "en" | "ar" = langRaw === "en" || langRaw === "ar" ? langRaw : "fr";
    const tokenRes = await this.auth.issueTokenForUser(dossier.ownerId);
    const webUrl = process.env.PUBLIC_WEB_URL || "https://citurb-web-production.up.railway.app";
    const magicLoginUrl = `${webUrl}/portal?magicToken=${encodeURIComponent(tokenRes.access_token)}`;

    // Reuse demandeRecue email (CTAs vers /portal et /payment/start)
    await this.clientNotify.demandeRecue({
      to: dossier.clientEmail,
      porteType: dossier.porteType ?? "P2",
      dossierId: dossier.id,
      clientNom: dossier.clientNom ?? undefined,
      title: dossier.title ?? undefined,
      lang,
    });
    return { ok: true, magicLoginUrl, sent: dossier.clientEmail };
  }
}
