import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { CerclesService } from "./cercles.service";
import { EmailService } from "../email/email.service";

/**
 * AssociationsService — Sprint I
 *
 * Gère le workflow d'adhésion aux Cercles type ASSOCIATION (SNASP, ANJAUM, etc.) :
 *  1. Candidat soumet une AssociationMembershipApplication avec formData
 *     → crée aussi CercleMembership PENDING_APPLICATION
 *  2. Modérateur consulte la liste des dossiers PENDING
 *  3. Modérateur approuve (génère cardNumber + active membership + définit memberType)
 *     ou rejette (avec raison)
 *  4. Email automatique au candidat à chaque étape
 *  5. Cotisation suivie séparément (markCotisationPaid)
 */

type FormFieldDef = {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "date" | "select" | "textarea" | "checkbox" | "file";
  required?: boolean;
  options?: string[]; // pour select
  placeholder?: string;
  helpText?: string;
};

@Injectable()
export class AssociationsService {
  private readonly log = new Logger("AssociationsService");
  constructor(
    private readonly prisma: PrismaService,
    private readonly cercles: CerclesService,
    private readonly email: EmailService,
  ) {}

  // ── Apply ───────────────────────────────────────────────────────

  async getFormSchema(slug: string) {
    const cercle = await this.prisma.cercle.findUniqueOrThrow({
      where: { slug },
      select: {
        id: true, slug: true, name: true, description: true,
        membershipFlow: true, formSchema: true, eligibilityCriteria: true,
        cotisationAnnuelleMad: true, cardNumberPrefix: true,
      },
    });
    if (cercle.membershipFlow !== "ASSOCIATION") {
      throw new BadRequestException("Ce cercle n'utilise pas le flow d'adhésion association");
    }
    return cercle;
  }

  async submitApplication(cercleId: string, userId: string, formData: any, memberType?: string) {
    const cercle = await this.prisma.cercle.findUniqueOrThrow({ where: { id: cercleId } });
    if (cercle.membershipFlow !== "ASSOCIATION") {
      throw new BadRequestException("Ce cercle n'utilise pas le flow d'adhésion association");
    }

    // Vérifie qu'il n'a pas déjà une application active
    const existingApp = await this.prisma.associationMembershipApplication.findFirst({
      where: { cercleId, userId, status: { in: ["PENDING", "APPROVED"] } },
    });
    if (existingApp) {
      throw new BadRequestException(
        existingApp.status === "APPROVED"
          ? "Tu es déjà membre de cette association"
          : "Tu as déjà une demande en cours. Patiente pour la décision.",
      );
    }

    // Validation minimum des champs requis depuis formSchema
    const schema = (cercle.formSchema as FormFieldDef[]) || [];
    const missingFields = schema
      .filter((f) => f.required && (!formData[f.name] || String(formData[f.name]).trim() === ""))
      .map((f) => f.label);
    if (missingFields.length > 0) {
      throw new BadRequestException(`Champs manquants : ${missingFields.join(", ")}`);
    }

    // Crée Application + Membership PENDING_APPLICATION en transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const application = await tx.associationMembershipApplication.create({
        data: {
          cercleId,
          userId,
          status: "PENDING",
          formData,
          memberType: (memberType as any) || null,
        },
      });
      const membership = await tx.cercleMembership.upsert({
        where: { cercleId_userId: { cercleId, userId } },
        update: { status: "PENDING_APPLICATION", applicationId: application.id },
        create: {
          cercleId,
          userId,
          role: "MEMBER",
          status: "PENDING_APPLICATION",
          applicationId: application.id,
        },
      });
      return { application, membership };
    });

    // Email candidat : confirmation
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.email.send({
      to: user.email,
      subject: `Demande d'adhésion ${cercle.name} reçue`,
      html: this.applicationReceivedEmail(cercle.name, user.email),
      from: process.env.RESEND_FROM || "CITURBAREA <onboarding@resend.dev>",
    }).catch(() => {});

    // Email modos : notification d'une nouvelle demande
    const modos = await this.prisma.cercleModerator.findMany({
      where: { cercleId },
      include: { user: { select: { email: true } } },
    });
    for (const m of modos) {
      this.email.send({
        to: m.user.email,
        subject: `Nouvelle demande d'adhésion ${cercle.name}`,
        html: this.newApplicationNotifyEmail(cercle.name, user.email, formData),
        from: process.env.RESEND_FROM || "CITURBAREA <onboarding@resend.dev>",
      }).catch(() => {});
    }

    return result;
  }

  // ── List / Detail (modo) ────────────────────────────────────────

  async listApplications(cercleId: string, viewerId: string, status?: string) {
    await this.cercles.assertModerator(cercleId, viewerId);
    return this.prisma.associationMembershipApplication.findMany({
      where: { cercleId, ...(status ? { status: status as any } : {}) },
      orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
      include: {
        user: { select: { id: true, email: true, username: true, proProfile: { select: { displayName: true, metier: true, villePrincipale: true } } } },
      },
    });
  }

  async getMyApplication(cercleId: string, userId: string) {
    return this.prisma.associationMembershipApplication.findFirst({
      where: { cercleId, userId },
      orderBy: { submittedAt: "desc" },
    });
  }

  async getApplicationDetail(applicationId: string, viewerId: string) {
    const app = await this.prisma.associationMembershipApplication.findUniqueOrThrow({
      where: { id: applicationId },
      include: {
        cercle: { select: { id: true, slug: true, name: true, cardNumberPrefix: true } },
        user: { include: { proProfile: true } },
      },
    });
    // Soit le candidat soit un modo
    if (app.userId !== viewerId) {
      await this.cercles.assertModerator(app.cercleId, viewerId);
    }
    return app;
  }

  // ── Approve / Reject (modo) ─────────────────────────────────────

  async approveApplication(applicationId: string, reviewerId: string, opts: { memberType?: string; reviewNote?: string } = {}) {
    const app = await this.prisma.associationMembershipApplication.findUniqueOrThrow({
      where: { id: applicationId },
      include: { cercle: true },
    });
    if (app.status !== "PENDING") throw new BadRequestException("Application déjà traitée");
    await this.cercles.assertModerator(app.cercleId, reviewerId);

    const cardNumber = await this.generateCardNumber(app.cercleId);
    const memberType = (opts.memberType || app.memberType || "ACTIF") as any;
    const cotisationStatus = app.cercle.cotisationAnnuelleMad ? "EN_ATTENTE" : "NON_REQUISE";

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedApp = await tx.associationMembershipApplication.update({
        where: { id: applicationId },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedBy: reviewerId,
          reviewNote: opts.reviewNote ?? null,
          memberType,
        },
      });
      const membership = await tx.cercleMembership.update({
        where: { cercleId_userId: { cercleId: app.cercleId, userId: app.userId } },
        data: {
          status: "ACTIVE",
          memberType,
          cardNumber,
          cotisationStatus: cotisationStatus as any,
        },
      });
      return { application: updatedApp, membership };
    });

    // Email candidat : validation + carte
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: app.userId } });
    await this.email.send({
      to: user.email,
      subject: `Adhésion ${app.cercle.name} validée — Carte ${cardNumber}`,
      html: this.applicationApprovedEmail(app.cercle.name, cardNumber, memberType, app.cercle.cotisationAnnuelleMad),
      from: process.env.RESEND_FROM || "CITURBAREA <onboarding@resend.dev>",
    }).catch(() => {});

    return result;
  }

  async rejectApplication(applicationId: string, reviewerId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException("Raison du refus requise");
    const app = await this.prisma.associationMembershipApplication.findUniqueOrThrow({
      where: { id: applicationId },
      include: { cercle: true, user: true },
    });
    if (app.status !== "PENDING") throw new BadRequestException("Application déjà traitée");
    await this.cercles.assertModerator(app.cercleId, reviewerId);

    await this.prisma.$transaction(async (tx) => {
      await tx.associationMembershipApplication.update({
        where: { id: applicationId },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          reviewedBy: reviewerId,
          rejectionReason: reason,
        },
      });
      await tx.cercleMembership.update({
        where: { cercleId_userId: { cercleId: app.cercleId, userId: app.userId } },
        data: { status: "LEFT", leftAt: new Date() },
      });
    });

    // Email candidat
    await this.email.send({
      to: app.user.email,
      subject: `Demande d'adhésion ${app.cercle.name} : décision`,
      html: this.applicationRejectedEmail(app.cercle.name, reason),
      from: process.env.RESEND_FROM || "CITURBAREA <onboarding@resend.dev>",
    }).catch(() => {});

    return { ok: true };
  }

  // ── Cotisation ──────────────────────────────────────────────────

  async markCotisationPaid(cercleId: string, userId: string, reviewerId: string, expireAt: Date) {
    await this.cercles.assertModerator(cercleId, reviewerId);
    const m = await this.prisma.cercleMembership.update({
      where: { cercleId_userId: { cercleId, userId } },
      data: { cotisationStatus: "A_JOUR", cotisationExpireAt: expireAt },
    });
    return m;
  }

  // ── Card number generation (atomic, padded) ────────────────────

  private async generateCardNumber(cercleId: string): Promise<string> {
    const cercle = await this.prisma.cercle.findUniqueOrThrow({
      where: { id: cercleId },
      select: { cardNumberPrefix: true, slug: true },
    });
    const prefix = cercle.cardNumberPrefix || cercle.slug.toUpperCase().slice(0, 6);
    // Trouve le dernier numéro émis pour ce préfixe
    const last = await this.prisma.cercleMembership.findFirst({
      where: { cardNumber: { startsWith: prefix } },
      orderBy: { cardNumber: "desc" },
      select: { cardNumber: true },
    });
    let nextN = 1;
    if (last?.cardNumber) {
      const m = last.cardNumber.match(/(\d+)$/);
      if (m) nextN = parseInt(m[1], 10) + 1;
    }
    return `${prefix}-${String(nextN).padStart(4, "0")}`;
  }

  // ── Email templates ────────────────────────────────────────────

  private applicationReceivedEmail(cercleName: string, email: string): string {
    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 24px auto; padding: 0 16px; color: #1A1F2E;">
  <div style="background: #0F2A4A; color: #FAF7F2; padding: 24px 28px; border-radius: 8px 8px 0 0;">
    <div style="font-size: 11px; letter-spacing: 0.22em; color: #B08D57;">CITURBAREA · ADHÉSION</div>
    <h1 style="font-family: Georgia, serif; font-size: 22px; margin: 8px 0 0;">Demande reçue</h1>
  </div>
  <div style="background: white; padding: 28px; border: 1px solid #E8E2D5; border-top: 0; border-radius: 0 0 8px 8px;">
    <p>Bonjour,</p>
    <p>Ta demande d'adhésion à <strong>${this.esc(cercleName)}</strong> a bien été reçue.</p>
    <p>Le bureau examinera ton dossier dans les prochains jours. Tu recevras un email avec la décision.</p>
    <p style="margin-top: 24px; font-size: 12px; color: #5C6373;">— L'équipe ${this.esc(cercleName)}</p>
  </div>
</body></html>`;
  }

  private newApplicationNotifyEmail(cercleName: string, candidateEmail: string, formData: any): string {
    const rows = Object.entries(formData)
      .filter(([_, v]) => v != null && String(v).trim() !== "")
      .map(([k, v]) => `<tr><td style="padding:4px 8px;color:#5C6373;font-size:12px;">${this.esc(k)}</td><td style="padding:4px 8px;font-size:13px;">${this.esc(String(v))}</td></tr>`)
      .join("");
    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 24px auto; padding: 0 16px; color: #1A1F2E;">
  <div style="background: #B08D57; color: white; padding: 20px 28px; border-radius: 8px 8px 0 0;">
    <h1 style="font-family: Georgia, serif; font-size: 18px; margin: 0;">Nouvelle demande d'adhésion · ${this.esc(cercleName)}</h1>
  </div>
  <div style="background: white; padding: 24px 28px; border: 1px solid #E8E2D5; border-top: 0;">
    <p>Candidat : <strong>${this.esc(candidateEmail)}</strong></p>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;background:#F2EDE3;border-radius:4px;">${rows}</table>
    <p style="margin-top: 20px; font-size: 13px;">Connecte-toi à CITURBAREA pour valider ou refuser.</p>
  </div>
</body></html>`;
  }

  private applicationApprovedEmail(cercleName: string, cardNumber: string, memberType: string, cotisation: number | null): string {
    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 24px auto; padding: 0 16px; color: #1A1F2E;">
  <div style="background: #0F2A4A; color: #FAF7F2; padding: 24px 28px; border-radius: 8px 8px 0 0;">
    <div style="font-size: 11px; letter-spacing: 0.22em; color: #B08D57;">CITURBAREA · ADHÉSION VALIDÉE</div>
    <h1 style="font-family: Georgia, serif; font-size: 22px; margin: 8px 0 0;">Bienvenue à ${this.esc(cercleName)} 🎉</h1>
  </div>
  <div style="background: white; padding: 28px; border: 1px solid #E8E2D5; border-top: 0; border-radius: 0 0 8px 8px;">
    <p>Ton dossier a été validé. Tu es désormais membre <strong>${this.esc(memberType)}</strong>.</p>
    <div style="background:#F2EDE3;padding:16px;border-radius:6px;border-left:3px solid #B08D57;margin:18px 0;">
      <div style="font-size:11px;letter-spacing:.10em;color:#5C6373;">NUMÉRO DE CARTE</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:#0F2A4A;margin-top:4px;">${this.esc(cardNumber)}</div>
    </div>
    ${cotisation ? `<p style="background:#F5E6DD;padding:12px;border-radius:4px;font-size:13px;">⚠ Cotisation annuelle : <strong>${cotisation} MAD</strong>. Procédure de paiement à venir.</p>` : ""}
    <p style="margin-top: 18px;">Tu peux maintenant accéder à l'espace membres, participer aux discussions et événements.</p>
  </div>
</body></html>`;
  }

  private applicationRejectedEmail(cercleName: string, reason: string): string {
    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 24px auto; padding: 0 16px; color: #1A1F2E;">
  <div style="background: #5C6373; color: white; padding: 20px 28px; border-radius: 8px 8px 0 0;">
    <h1 style="font-family: Georgia, serif; font-size: 18px; margin: 0;">Décision sur ta demande</h1>
  </div>
  <div style="background: white; padding: 28px; border: 1px solid #E8E2D5; border-top: 0; border-radius: 0 0 8px 8px;">
    <p>Ta demande d'adhésion à <strong>${this.esc(cercleName)}</strong> n'a pas pu être validée à ce stade.</p>
    <div style="background:#F2DEDE;padding:12px;border-left:3px solid #94292B;border-radius:4px;margin:14px 0;font-size:13px;">
      <strong>Motif :</strong><br/>${this.esc(reason)}
    </div>
    <p style="font-size: 12px; color: #5C6373; margin-top: 18px;">N'hésite pas à nous contacter pour plus d'informations ou à soumettre une nouvelle demande ultérieurement.</p>
  </div>
</body></html>`;
  }

  private esc(s: string): string {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
}
