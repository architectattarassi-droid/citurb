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
var ReminderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReminderService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const tome_at_1 = require("../../tome-at");
const nodemailer = require("nodemailer");
let ReminderService = ReminderService_1 = class ReminderService {
    prisma;
    logger = new common_1.Logger(ReminderService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    // Tourne tous les jours à 9h00 heure Maroc (UTC+1 = 8h UTC)
    async sendWeeklyReminders() {
        this.logger.log('[Reminder] Démarrage du job de rappel hebdomadaire');
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const staleDossiers = await this.prisma.dossier.findMany({
            where: {
                status: { in: ['DRAFT', 'NEEDS_CHANGES'] },
                updatedAt: { lt: oneWeekAgo },
                OR: [
                    { lastReminderSentAt: null },
                    { lastReminderSentAt: { lt: oneWeekAgo } },
                ],
            },
            include: {
                owner: { select: { email: true, username: true } },
            },
            take: 100,
        });
        this.logger.log(`[Reminder] ${staleDossiers.length} dossiers inactifs trouvés`);
        for (const dossier of staleDossiers) {
            try {
                await this.sendReminderEmail(dossier);
                await this.prisma.dossier.update({
                    where: { id: dossier.id },
                    data: {
                        lastReminderSentAt: new Date(),
                        reminderCount: { increment: 1 },
                    },
                });
                this.logger.log(`[Reminder] Email envoyé → ${dossier.owner.email} (dossier: ${dossier.id})`);
            }
            catch (e) {
                this.logger.error(`[Reminder] Échec pour dossier ${dossier.id}: ${e}`);
            }
        }
    }
    async sendReminderEmail(dossier) {
        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
        const from = process.env.SMTP_FROM || `"CITURBAREA" <${SMTP_USER}>`;
        const displayName = dossier.owner.username || dossier.owner.email;
        const daysInactive = Math.floor((Date.now() - new Date(dossier.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        const statusLabel = dossier.status === 'NEEDS_CHANGES'
            ? 'des corrections sont en attente de votre part'
            : 'votre dossier est encore en cours de préparation';
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 22px;">CITURBAREA</h1>
        </div>
        <div style="padding: 32px; background: #fff;">
          <h2 style="color: #1e293b;">Bonjour ${displayName},</h2>
          <p style="color: #475569; line-height: 1.6;">
            Nous avons remarqué que ${statusLabel} depuis <strong>${daysInactive} jours</strong>.
          </p>
          <p style="color: #475569; line-height: 1.6;">
            Votre projet <strong>"${dossier.title || 'Sans titre'}"</strong>
            ${dossier.commune ? `à <strong>${dossier.commune}</strong>` : ''}
            est à portée — il suffit de quelques étapes pour le finaliser.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:5173'}/p1/dossier"
              style="background: #2563eb; color: #fff; padding: 14px 28px;
                border-radius: 8px; text-decoration: none; font-weight: 700;
                font-size: 16px; display: inline-block;">
              Reprendre mon dossier →
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">
            Besoin d'aide ? Répondez directement à cet email ou contactez-nous.
          </p>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            CITURBAREA — Plateforme d'intelligence territoriale urbaine<br/>
            Pour ne plus recevoir ces rappels, finalisez ou supprimez votre dossier.
          </p>
        </div>
      </div>
    `;
        if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
            const secure = String(process.env.SMTP_SECURE || '') === 'true' || Number(SMTP_PORT) === 465;
            const transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: Number(SMTP_PORT),
                secure,
                auth: { user: SMTP_USER, pass: SMTP_PASS },
            });
            await transporter.sendMail({
                from,
                to: dossier.owner.email,
                subject: `⏰ Votre dossier CITURBAREA attend votre action`,
                html,
            });
        }
        else {
            this.logger.warn(`[Reminder][FALLBACK] SMTP non configuré. Email non envoyé à ${dossier.owner.email}`);
        }
    }
    // Méthode pour déclencher manuellement (tests + endpoint admin)
    async triggerNow() {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const staleDossiers = await this.prisma.dossier.findMany({
            where: {
                status: { in: ['DRAFT', 'NEEDS_CHANGES'] },
                updatedAt: { lt: oneWeekAgo },
                OR: [
                    { lastReminderSentAt: null },
                    { lastReminderSentAt: { lt: oneWeekAgo } },
                ],
            },
            include: { owner: { select: { email: true, username: true } } },
            take: 100,
        });
        let sent = 0;
        for (const d of staleDossiers) {
            try {
                await this.sendReminderEmail(d);
                await this.prisma.dossier.update({
                    where: { id: d.id },
                    data: { lastReminderSentAt: new Date(), reminderCount: { increment: 1 } },
                });
                sent++;
            }
            catch (e) {
                this.logger.error(`[Reminder] triggerNow échec dossier ${d.id}: ${e}`);
            }
        }
        return { sent };
    }
};
exports.ReminderService = ReminderService;
__decorate([
    (0, schedule_1.Cron)('0 8 * * *', { timeZone: 'Africa/Casablanca' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReminderService.prototype, "sendWeeklyReminders", null);
exports.ReminderService = ReminderService = ReminderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tome_at_1.PrismaService])
], ReminderService);
