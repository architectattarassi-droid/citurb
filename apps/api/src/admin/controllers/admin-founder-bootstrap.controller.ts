/**
 * AdminFounderBootstrapController — endpoint one-shot pour créer le User ADMIN
 * du founder sans dépendre du vault MFA (qui exige Resend + Twilio env).
 *
 * SÉCURITÉ : protégé par un secret partagé HEADER `X-Founder-Bootstrap-Secret`
 * comparé à `process.env.FOUNDER_BOOTSTRAP_SECRET`. Si l'env n'est pas posée
 * (cas par défaut prod), l'endpoint répond 503 → totalement désactivé.
 *
 * Workflow d'usage :
 *   1. Sur Railway dashboard service `citurb` → Variables → ajouter
 *      `FOUNDER_BOOTSTRAP_SECRET=une-longue-chaine-secrete-aleatoire`
 *   2. Attendre le redeploy auto (1-2 min).
 *   3. Curl depuis n'importe où :
 *      curl -X POST https://citurbarea.com/api/admin/founder-bootstrap \
 *        -H "X-Founder-Bootstrap-Secret: une-longue-chaine-secrete-aleatoire" \
 *        -H "Content-Type: application/json" \
 *        -d '{"email":"architectattarassi@gmail.com","password":"MonPassFort!2026"}'
 *   4. Réponse : { ok, access_token, user } — le JWT est valide 7j.
 *   5. RETIRER FOUNDER_BOOTSTRAP_SECRET de Railway (sécurité).
 *
 * L'opération est idempotente : appel répété met à jour le password sans
 * créer de doublon User. Le mot de passe doit passer la validation
 * (≥10 chars + maj + min + chiffre).
 */
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcryptjs");
import { Tome } from "../../tomes/tome-at";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { AuthService } from "../../tomes/tome-5/auth/auth.service";

interface BootstrapBody {
  email?: string;
  password?: string;
}

function validatePassword(p: string): string | null {
  if (!p || p.length < 10) return "min 10 caractères";
  if (!/[A-Z]/.test(p)) return "manque une majuscule";
  if (!/[a-z]/.test(p)) return "manque une minuscule";
  if (!/[0-9]/.test(p)) return "manque un chiffre";
  return null;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

@Tome("tome9")
@Controller("api/admin/founder-bootstrap")
export class AdminFounderBootstrapController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  async bootstrap(
    @Headers("x-founder-bootstrap-secret") providedSecret: string | undefined,
    @Body() body: BootstrapBody,
  ) {
    const envSecret = process.env.FOUNDER_BOOTSTRAP_SECRET;
    if (!envSecret) {
      throw new ServiceUnavailableException(
        "Endpoint désactivé. Poser FOUNDER_BOOTSTRAP_SECRET sur Railway pour l'activer.",
      );
    }
    if (!providedSecret || !safeEqual(providedSecret, envSecret)) {
      throw new UnauthorizedException("Secret invalide");
    }

    const email = (body?.email || "").trim().toLowerCase();
    const password = body?.password || "";
    if (!email || !email.includes("@")) throw new BadRequestException("Email invalide");

    const pwErr = validatePassword(password);
    if (pwErr) throw new BadRequestException(`Mot de passe : ${pwErr}`);

    const passwordHash = await bcrypt.hash(password, 12);

    // Récupère AdminUser pour copier displayName/phone si dispo.
    const adminUser = await this.prisma.adminUser.findUnique({ where: { email } });

    const existing = await this.prisma.user.findUnique({ where: { email } });
    const user = existing
      ? await this.prisma.user.update({
          where: { email },
          data: {
            passwordHash,
            role: "ADMIN",
            isActive: true,
            emailVerifiedAt: existing.emailVerifiedAt || new Date(),
          },
        })
      : await this.prisma.user.create({
          data: {
            email,
            passwordHash,
            role: "ADMIN",
            isActive: true,
            username: adminUser?.displayName || email.split("@")[0],
            phone: adminUser?.phoneE164,
            emailVerifiedAt: new Date(),
          },
        });

    const issued = await this.authService.issueTokenForUser(user.id);

    return {
      ok: true,
      access_token: issued.access_token,
      user: issued.user,
      message:
        "User ADMIN créé/mis à jour. Retire maintenant FOUNDER_BOOTSTRAP_SECRET de Railway pour désactiver l'endpoint.",
    };
  }
}
