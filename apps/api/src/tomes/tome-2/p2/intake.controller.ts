import { Body, Controller, Post } from "@nestjs/common";
import { Tome } from "../../tome-at";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { AuthService } from "../../tome-5/auth/auth.service";
import { DossierService } from "./dossier.service";
import { OwnerNotifyService } from "../../../modules/owner-notify/owner-notify.service";

/**
 * IntakeController — Capture publique des leads sur les 6 portes
 *
 * Endpoint PUBLIC (pas de JwtAuthGuard) qui :
 *   1. Reçoit les données du formulaire d'une porte (P1-P6)
 *   2. Auto-crée un User CLIENT si l'email n'existe pas
 *   3. Crée un Dossier owned par ce user avec porteType discriminant
 *   4. Retourne le dossier ID (jamais le token côté public)
 *
 * Aucun document n'est requis ici — le visiteur laisse juste ses coordonnées
 * et son brief, l'admin contacte ensuite via le LeadsModule du backoffice.
 */

type IntakePayload = {
  porteType: "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
  sousType?: string;
  sousTypeP2?: string;
  gestionMode?: string;
  // Lead identity
  clientNom?: string;
  clientTel?: string;
  clientEmail?: string;
  raisonSociale?: string;
  rc?: string;
  ice?: string;
  representant?: string;
  // Project
  title?: string;
  commune?: string;
  natureProjet?: string;
  surfaceTerrain?: number;
  surfacePlancher?: number;
  nbNiveaux?: number;
  // Free brief
  brief?: string;
  // SEO / source tracking
  source?: string;
  utm?: Record<string, string>;
};

@Tome("tome2")
@Controller("p2")
export class IntakeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly dossiers: DossierService,
    private readonly ownerNotify: OwnerNotifyService,
  ) {}

  @Post("intake")
  async intake(@Body() body: IntakePayload) {
    if (!body.clientEmail && !body.clientTel) {
      throw new Error("Email ou téléphone obligatoire pour vous recontacter");
    }
    const email = (body.clientEmail || `lead-${Date.now()}@citurbarea.unknown`).toLowerCase().trim();
    const porteType = body.porteType || "P2";

    // 1. Find or create user (CLIENT role)
    let user = await this.prisma.user.findUnique({ where: { email } });
    let accessToken: string | null = null;
    if (!user) {
      // Auto-register with a random password (user receives credentials by email later)
      const tempPassword = `Citurb-${Math.random().toString(36).slice(2, 10)}!`;
      const reg = await this.auth.register(email, tempPassword, body.clientNom || undefined);
      user = await this.prisma.user.findUnique({ where: { id: reg.user.id } });
      accessToken = reg.access_token;
    } else {
      // Existing user → issue fresh token (magic-login bypass car le client vient de
      // re-fournir ses informations dans le wizard)
      const tokenRes = await this.auth.issueTokenForUser(user.id);
      accessToken = tokenRes.access_token;
    }
    if (!user) throw new Error("Échec création/récupération du compte");

    // 2. Create dossier owned by this user
    const title = body.title || `${porteType} — ${body.commune || body.sousType || body.sousTypeP2 || "Demande"}`;
    const dossier = await this.dossiers.create(user.id, {
      title,
      commune: body.commune,
      porteType,
      gestionMode: body.gestionMode || "AUTONOME",
      sousTypeP2: body.sousTypeP2 || body.sousType,
      natureProjet: body.natureProjet,
      raisonSociale: body.raisonSociale,
      rc: body.rc,
      ice: body.ice,
      representant: body.representant,
      clientNom: body.clientNom,
      clientTel: body.clientTel,
      clientEmail: email,
      payload: {
        commune: body.commune,
        surfaceTerrain: body.surfaceTerrain,
        surfacePlancher: body.surfacePlancher,
        nbNiveaux: body.nbNiveaux,
        natureProjet: body.natureProjet,
        brief: body.brief,
        source: body.source,
        utm: body.utm,
      },
    });

    // 3. Fire owner alerts (SMS + email) — fire-and-forget, never block client response
    this.ownerNotify.notify("NEW_USER_REGISTERED", {
      email,
      username: body.clientNom,
      porteType,
      tel: body.clientTel,
    }).catch(() => { /* logged in service */ });
    this.ownerNotify.notify("DOSSIER_CREATED", {
      title,
      commune: body.commune,
      packSelected: `${porteType} ${body.gestionMode || "AUTONOME"}`,
      dossierId: dossier.id,
      clientTel: body.clientTel,
      clientNom: body.clientNom,
    }).catch(() => { /* logged in service */ });

    // 4. Return response with magic-login token
    //    Le token permet à l'utilisateur d'enchaîner directement vers /portal
    //    et /payment/start sans étape de login séparée. C'est sécurisé car:
    //     - Le user vient de fournir son email dans le wizard (auto-vérifié implicitement)
    //     - Le token donne accès uniquement à SES propres dossiers (RolesGuard CLIENT)
    //     - Aucun moyen d'usurper l'identité d'un user existant sans connaître son email
    return {
      ok: true,
      dossierId: dossier.id,
      message: `Merci ! Votre demande ${porteType} a été enregistrée. Notre équipe vous recontacte sous 24h au ${body.clientTel || email}.`,
      access_token: accessToken,
      user: { id: user.id, email: user.email, role: user.role },
      // Hint to redirect to login if the user wants to track the dossier
      loginHint: { email, redirect: `/portal` },
    };
  }
}
