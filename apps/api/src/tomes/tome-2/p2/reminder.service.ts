import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../tome-at';
import * as nodemailer from 'nodemailer';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Tourne tous les jours à 9h00 heure Maroc (UTC+1 = 8h UTC)
  @Cron('0 8 * * *', { timeZone: 'Africa/Casablanca' })
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
      } catch (e) {
        this.logger.error(`[Reminder] Échec pour dossier ${dossier.id}: ${e}`);
      }
    }
  }

  private async sendReminderEmail(dossier: any) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    const from = process.env.SMTP_FROM || `"CITURBAREA" <${SMTP_USER}>`;

    const displayName = dossier.owner.username || dossier.owner.email;
    const daysInactive = Math.floor(
      (Date.now() - new Date(dossier.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    const statusLabel =
      dossier.status === 'NEEDS_CHANGES'
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
    } else {
      this.logger.warn(
        `[Reminder][FALLBACK] SMTP non configuré. Email non envoyé à ${dossier.owner.email}`,
      );
    }
  }

  // Méthode pour déclencher manuellement (tests + endpoint admin)
  async triggerNow(): Promise<{ sent: number }> {
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
      } catch (e) {
        this.logger.error(`[Reminder] triggerNow échec dossier ${d.id}: ${e}`);
      }
    }
    return { sent };
  }
}
