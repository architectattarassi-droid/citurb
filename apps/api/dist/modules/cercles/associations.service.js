"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssociationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const cercles_service_1 = require("./cercles.service");
const email_service_1 = require("../email/email.service");
let AssociationsService = class AssociationsService {
    prisma;
    cercles;
    email;
    log = new common_1.Logger("AssociationsService");
    constructor(prisma, cercles, email) {
        this.prisma = prisma;
        this.cercles = cercles;
        this.email = email;
    }
    // ── Apply ───────────────────────────────────────────────────────
    async getFormSchema(slug) {
        const cercle = await this.prisma.cercle.findUniqueOrThrow({
            where: { slug },
            select: {
                id: true, slug: true, name: true, description: true,
                membershipFlow: true, formSchema: true, eligibilityCriteria: true,
                cotisationAnnuelleMad: true, cardNumberPrefix: true,
            },
        });
        if (cercle.membershipFlow !== "ASSOCIATION") {
            throw new common_1.BadRequestException("Ce cercle n'utilise pas le flow d'adhésion association");
        }
        return cercle;
    }
    async submitApplication(cercleId, userId, formData, memberType) {
        const cercle = await this.prisma.cercle.findUniqueOrThrow({ where: { id: cercleId } });
        if (cercle.membershipFlow !== "ASSOCIATION") {
            throw new common_1.BadRequestException("Ce cercle n'utilise pas le flow d'adhésion association");
        }
        // Vérifie qu'il n'a pas déjà une application active
        const existingApp = await this.prisma.associationMembershipApplication.findFirst({
            where: { cercleId, userId, status: { in: ["PENDING", "APPROVED"] } },
        });
        if (existingApp) {
            throw new common_1.BadRequestException(existingApp.status === "APPROVED"
                ? "Tu es déjà membre de cette association"
                : "Tu as déjà une demande en cours. Patiente pour la décision.");
        }
        // Validation minimum des champs requis depuis formSchema
        const schema = cercle.formSchema || [];
        const missingFields = schema
            .filter((f) => f.required && (!formData[f.name] || String(formData[f.name]).trim() === ""))
            .map((f) => f.label);
        if (missingFields.length > 0) {
            throw new common_1.BadRequestException(`Champs manquants : ${missingFields.join(", ")}`);
        }
        // Crée Application + Membership PENDING_APPLICATION en transaction
        const result = await this.prisma.$transaction(async (tx) => {
            const application = await tx.associationMembershipApplication.create({
                data: {
                    cercleId,
                    userId,
                    status: "PENDING",
                    formData,
                    memberType: memberType || null,
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
        }).catch(() => { });
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
            }).catch(() => { });
        }
        return result;
    }
    // ── List / Detail (modo) ────────────────────────────────────────
    async listApplications(cercleId, viewerId, status) {
        await this.cercles.assertModerator(cercleId, viewerId);
        return this.prisma.associationMembershipApplication.findMany({
            where: { cercleId, ...(status ? { status: status } : {}) },
            orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
            include: {
                user: { select: { id: true, email: true, username: true, proProfile: { select: { displayName: true, metier: true, villePrincipale: true } } } },
            },
        });
    }
    async getMyApplication(cercleId, userId) {
        return this.prisma.associationMembershipApplication.findFirst({
            where: { cercleId, userId },
            orderBy: { submittedAt: "desc" },
        });
    }
    async getApplicationDetail(applicationId, viewerId) {
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
    async approveApplication(applicationId, reviewerId, opts = {}) {
        const app = await this.prisma.associationMembershipApplication.findUniqueOrThrow({
            where: { id: applicationId },
            include: { cercle: true },
        });
        if (app.status !== "PENDING")
            throw new common_1.BadRequestException("Application déjà traitée");
        await this.cercles.assertModerator(app.cercleId, reviewerId);
        const cardNumber = await this.generateCardNumber(app.cercleId);
        const memberType = (opts.memberType || app.memberType || "ACTIF");
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
                    cotisationStatus: cotisationStatus,
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
        }).catch(() => { });
        return result;
    }
    async rejectApplication(applicationId, reviewerId, reason) {
        if (!reason?.trim())
            throw new common_1.BadRequestException("Raison du refus requise");
        const app = await this.prisma.associationMembershipApplication.findUniqueOrThrow({
            where: { id: applicationId },
            include: { cercle: true, user: true },
        });
        if (app.status !== "PENDING")
            throw new common_1.BadRequestException("Application déjà traitée");
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
        }).catch(() => { });
        return { ok: true };
    }
    // ── Cotisation ──────────────────────────────────────────────────
    async markCotisationPaid(cercleId, userId, reviewerId, expireAt) {
        await this.cercles.assertModerator(cercleId, reviewerId);
        const m = await this.prisma.cercleMembership.update({
            where: { cercleId_userId: { cercleId, userId } },
            data: { cotisationStatus: "A_JOUR", cotisationExpireAt: expireAt },
        });
        return m;
    }
    // ── Card number generation (atomic, padded) ────────────────────
    async generateCardNumber(cercleId) {
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
            if (m)
                nextN = parseInt(m[1], 10) + 1;
        }
        return `${prefix}-${String(nextN).padStart(4, "0")}`;
    }
    // ── Email templates ────────────────────────────────────────────
    applicationReceivedEmail(cercleName, email) {
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
    newApplicationNotifyEmail(cercleName, candidateEmail, formData) {
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
    applicationApprovedEmail(cercleName, cardNumber, memberType, cotisation) {
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
    applicationRejectedEmail(cercleName, reason) {
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
    esc(s) {
        return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
};
exports.AssociationsService = AssociationsService;
exports.AssociationsService = AssociationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cercles_service_1.CerclesService,
        email_service_1.EmailService])
], AssociationsService);
