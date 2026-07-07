import { Body, Controller, Post, HttpCode, UnauthorizedException } from "@nestjs/common";
import { Tome } from "../../tome-at";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { AuthService } from "../../tome-5/auth/auth.service";
import { DossierService } from "./dossier.service";
import { OwnerNotifyService } from "../../../modules/owner-notify/owner-notify.service";

/**
 * GoogleLeadsWebhookController — réception temps réel des leads Google Ads.
 *
 * Google (formulaire de lead) POST vers  POST /webhooks/google-leads  à chaque
 * envoi. On vérifie la clé (`google_key` == GOOGLE_LEADS_WEBHOOK_KEY), on parse
 * les champs, on mappe la réponse « Quel est votre projet ? » vers la bonne porte,
 * puis on crée un Dossier (via DossierService, comme /p2/intake) → le lead
 * apparaît directement dans /cc/leads et /cc/dossiers, avec notif owner.
 *
 * Endpoint PUBLIC (Google n'envoie pas de JWT) — l'authentification est la clé.
 * Doit répondre HTTP 200 pour que Google valide le webhook (bouton « test »).
 */
@Tome("tome2")
@Controller("webhooks")
export class GoogleLeadsWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly dossiers: DossierService,
    private readonly ownerNotify: OwnerNotifyService,
  ) {}

  @Post("google-leads")
  @HttpCode(200)
  async googleLeads(@Body() body: any) {
    // 1. Vérification de la clé secrète (partagée avec le formulaire Google)
    const expected = process.env.GOOGLE_LEADS_WEBHOOK_KEY || "";
    if (!expected || body?.google_key !== expected) {
      throw new UnauthorizedException("invalid_google_key");
    }

    // 2. Extraction des champs (Google envoie user_column_data[])
    const cols: any[] = Array.isArray(body?.user_column_data) ? body.user_column_data : [];
    const byId = (id: string) => cols.find((c) => c?.column_id === id)?.string_value || "";
    const byName = (re: RegExp) =>
      cols.find((c) => re.test(String(c?.column_name || "")))?.string_value || "";

    const fullName = byId("FULL_NAME") || [byId("FIRST_NAME"), byId("LAST_NAME")].filter(Boolean).join(" ").trim();
    const phone = byId("PHONE_NUMBER") || byId("WORK_PHONE");
    const email = byId("EMAIL") || byId("WORK_EMAIL");
    const city = byId("CITY");
    const projet = byName(/projet/i); // question personnalisée « Quel est votre projet ? »

    // 3. Mapping projet → porte
    const p = projet.toLowerCase();
    let porteType: "P1" | "P2" | "P3" | "P4" = "P1";
    if (/immeuble|promotion|promoteur/.test(p)) porteType = "P2";
    else if (/r[eé]novation/.test(p)) porteType = "P3";
    else if (/foncier|expertise/.test(p)) porteType = "P4";

    // 4. Bouton « Envoyer les données de test » → 200 sans créer de dossier
    if (body?.is_test) {
      return { ok: true, test: true, parsed: { fullName, phone, email, city, projet, porteType } };
    }

    // 5. Pas de moyen de recontact → on accuse quand même réception (200)
    if (!email && !phone) {
      return { ok: true, skipped: "no_contact" };
    }

    // 6. Find / create user CLIENT + Dossier (même logique que /p2/intake)
    const mail = (email || `google-lead-${Date.now()}@citurbarea.unknown`).toLowerCase().trim();
    let user = await this.prisma.user.findUnique({ where: { email: mail } });
    if (!user) {
      const tempPassword = `Citurb-${Math.random().toString(36).slice(2, 10)}!`;
      const reg = await this.auth.register(mail, tempPassword, fullName || undefined);
      user = await this.prisma.user.findUnique({ where: { id: reg.user.id } });
    }
    if (!user) return { ok: true };

    const title = `${porteType} — Google Ads${city ? " · " + city : ""}`;
    const dossier = await this.dossiers.create(user.id, {
      title,
      commune: city || undefined,
      porteType,
      gestionMode: "AUTONOME",
      clientNom: fullName || undefined,
      clientTel: phone || undefined,
      clientEmail: mail,
      payload: {
        source: "GOOGLE_ADS",
        lang: "fr",
        brief: projet ? `Projet déclaré : ${projet}` : undefined,
        googleLead: {
          lead_id: body?.lead_id,
          form_id: body?.form_id,
          campaign_id: body?.campaign_id,
          gcl_id: body?.gcl_id,
          receivedAt: new Date().toISOString(),
        },
      },
    });

    this.ownerNotify
      .notify("DOSSIER_CREATED", {
        title,
        commune: city,
        packSelected: `${porteType} — Lead Google Ads`,
        dossierId: dossier.id,
      })
      .catch(() => {});

    return { ok: true, dossierId: dossier.id };
  }
}
