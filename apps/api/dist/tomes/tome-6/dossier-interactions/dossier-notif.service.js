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
var DossierNotifService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DossierNotifService = void 0;
const common_1 = require("@nestjs/common");
const email_service_1 = require("../../../modules/email/email.service");
const twilio_service_1 = require("../../../modules/twilio/twilio.service");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
/**
 * DossierNotifService — multi-canal broadcaster pour les interactions dossier.
 *
 * 4 canaux :
 *   1. Email (Resend → SMTP fallback via EmailService)
 *   2. SMS / WhatsApp deep link (Twilio Messaging API)
 *   3. Web Push (stocké en queue / pré-câblage — voir notifyPush)
 *   4. Persistence applicative (`Dossier.payload.notifQueue[]`) en attendant
 *      la table Prisma `Notification` (voir INTEGRATION.md).
 *
 * Sélection des destinataires :
 *   - Mentions explicites (@userId) → toujours notifiées (priorité)
 *   - Parties du dossier (`payload.parties[]` userIds) → selon visibility
 *   - INTERNE_OPS : staff seulement (skip ici, la console CC le voit)
 *   - PRIVATE : auteur + mentions seulement
 */
let DossierNotifService = DossierNotifService_1 = class DossierNotifService {
    prisma;
    email;
    twilio;
    logger = new common_1.Logger(DossierNotifService_1.name);
    PUBLIC_URL = process.env.PUBLIC_WEB_URL || "https://citurbarea.com";
    constructor(prisma, email, twilio) {
        this.prisma = prisma;
        this.email = email;
        this.twilio = twilio;
    }
    async broadcast(args) {
        const { dossier, interaction } = args;
        if (interaction.visibility === "INTERNE_OPS") {
            this.logger.debug(`[Notif] skip broadcast INTERNE_OPS interaction=${interaction.id}`);
            return;
        }
        const recipientIds = await this.resolveRecipients(dossier, interaction);
        if (recipientIds.length === 0)
            return;
        const users = await this.prisma.user.findMany({
            where: { id: { in: recipientIds } },
            select: { id: true, email: true, phone: true, username: true },
        });
        const authorName = await this.getAuthorName(interaction.authorUserId);
        const deepLink = `${this.PUBLIC_URL}/dossier/${dossier.id}?i=${interaction.id}`;
        const dossierLabel = `${dossier.porteType}-${dossier.id.slice(-6).toUpperCase()}`;
        const preview = this.previewText(interaction.contentMD, 140);
        // Persistence app-level (notif feed in-app) — capable de remplacer la
        // table Prisma `Notification` tant qu'elle n'est pas migrée.
        await this.persistInAppQueue(dossier.id, recipientIds, {
            interactionId: interaction.id,
            deepLink,
            preview,
            authorUserId: interaction.authorUserId,
            mentions: interaction.mentions,
            createdAt: interaction.createdAt,
        });
        // Persistence Notification (table Prisma existante) pour les mentions
        // explicites — réutilise POST_MENTION en attendant l'enum dédié
        // DOSSIER_INTERACTION (voir INTEGRATION.md).
        if (interaction.mentions.length > 0) {
            await this.persistMentionsNotifications({
                dossierId: dossier.id,
                dossierLabel,
                mentions: interaction.mentions,
                authorName,
                preview,
                deepLink,
                interactionId: interaction.id,
            });
        }
        // Email + SMS WhatsApp deep link, en parallèle
        await Promise.allSettled(users.map(async (u) => {
            const isMentioned = interaction.mentions.includes(u.id);
            const subject = isMentioned
                ? `Vous êtes mentionné dans le dossier ${dossierLabel}`
                : `Nouvelle interaction sur votre dossier ${dossierLabel}`;
            const html = this.htmlBody({
                authorName, dossierLabel, preview, deepLink, isMentioned,
            });
            if (u.email) {
                await this.email.send({
                    to: u.email,
                    subject,
                    html,
                    text: `${authorName} a commenté votre dossier ${dossierLabel} — ${preview}\n${deepLink}`,
                });
            }
            if (u.phone) {
                const body = `${authorName} a commenté votre dossier ${dossierLabel} — voir : ${deepLink}`;
                await this.twilio.sendSms(u.phone, body);
            }
        }));
        this.notifyPush(recipientIds, {
            title: `Dossier ${dossierLabel}`,
            body: `${authorName} : ${preview}`,
            url: deepLink,
        }).catch(() => undefined);
    }
    // ── Resolve recipients ─────────────────────────────────────────
    async resolveRecipients(dossier, it) {
        const set = new Set();
        // Mentions toujours (priorité absolue)
        for (const m of it.mentions)
            set.add(m);
        // PRIVATE : seulement auteur + mentions (pas d'autre party)
        if (it.visibility === "PRIVATE") {
            set.delete(it.authorUserId); // pas la peine de se notifier soi-même
            return Array.from(set);
        }
        // PUBLIC : owner + parties listées
        set.add(dossier.ownerId);
        const parties = Array.isArray(dossier.payload?.parties)
            ? dossier.payload.parties : [];
        for (const p of parties)
            set.add(p);
        // Skip l'auteur (pas de self-notif)
        set.delete(it.authorUserId);
        return Array.from(set);
    }
    async getAuthorName(userId) {
        try {
            const u = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { username: true, email: true },
            });
            return u?.username || u?.email?.split("@")[0] || "Un membre";
        }
        catch {
            return "Un membre";
        }
    }
    // ── Persistence in-app (queue applicative) ────────────────────
    /**
     * Append à `Dossier.payload.notifQueue` (capé). Remplace temporairement
     * la table Prisma `Notification` (voir INTEGRATION.md).
     */
    async persistInAppQueue(dossierId, recipientIds, payload) {
        try {
            const d = await this.prisma.dossier.findUnique({
                where: { id: dossierId }, select: { payload: true },
            });
            if (!d)
                return;
            const base = d.payload && typeof d.payload === "object" ? { ...d.payload } : {};
            const queue = Array.isArray(base.notifQueue) ? base.notifQueue : [];
            queue.push({
                kind: "DOSSIER_INTERACTION",
                ts: new Date().toISOString(),
                recipients: recipientIds,
                ...payload,
            });
            base.notifQueue = queue.slice(-500);
            await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload: base } });
        }
        catch (e) {
            this.logger.warn(`[Notif] persistInAppQueue failed: ${e?.message}`);
        }
    }
    /**
     * Crée une row `Notification` (table Prisma existante) par mentionné.
     * Type = POST_MENTION (proche sémantiquement, tant que le nouveau type
     * DOSSIER_INTERACTION_MENTION n'est pas migré).
     */
    async persistMentionsNotifications(args) {
        try {
            await this.prisma.notification.createMany({
                data: args.mentions.map((uid) => ({
                    userId: uid,
                    type: "POST_MENTION",
                    title: `Mention sur ${args.dossierLabel}`,
                    body: `${args.authorName} : ${args.preview}`,
                    actionUrl: args.deepLink,
                    refType: "dossier_interaction",
                    refId: args.interactionId,
                })),
                skipDuplicates: true,
            });
        }
        catch (e) {
            this.logger.warn(`[Notif] persistMentionsNotifications failed: ${e?.message}`);
        }
    }
    // ── Web Push (placeholder — service worker côté front) ────────
    /**
     * Web Push : à câbler avec une table `PushSubscription` + lib `web-push`.
     * Pour l'instant : log + persistence en payload pour qu'un worker puisse
     * picker. Permet au front polling de récupérer.
     */
    async notifyPush(_recipientIds, payload) {
        this.logger.debug(`[Notif] push (placeholder) ${JSON.stringify(payload).slice(0, 200)}`);
    }
    // ── Helpers texte/html ─────────────────────────────────────────
    previewText(md, max) {
        if (!md)
            return "(message vide)";
        // strip basique markdown
        const txt = md
            .replace(/\!\[[^\]]*\]\([^)]+\)/g, "[image]")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/[*_`>#]/g, "")
            .replace(/\s+/g, " ")
            .trim();
        return txt.length <= max ? txt : txt.slice(0, max - 1) + "…";
    }
    htmlBody(args) {
        const banner = args.isMentioned
            ? `<p style="background:#FEF3C7;padding:8px 12px;border-radius:6px;color:#92400E"><b>@mention</b> Vous êtes mentionné.</p>`
            : "";
        return `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#0F172A">CITURBAREA — Dossier ${args.dossierLabel}</h2>
        ${banner}
        <p><b>${this.esc(args.authorName)}</b> a publié une nouvelle interaction :</p>
        <blockquote style="border-left:3px solid #2563EB;padding:8px 12px;background:#F1F5F9;color:#0F172A">
          ${this.esc(args.preview)}
        </blockquote>
        <p style="margin-top:20px">
          <a href="${args.deepLink}" style="background:#2563EB;color:white;padding:10px 16px;border-radius:6px;text-decoration:none">Voir le dossier</a>
        </p>
        <p style="color:#64748B;font-size:12px;margin-top:32px">
          Échanges plateforme CITURBAREA — réponses hors plateforme = perte des garanties.
        </p>
      </div>
    `.trim();
    }
    esc(s) {
        return String(s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
};
exports.DossierNotifService = DossierNotifService;
exports.DossierNotifService = DossierNotifService = DossierNotifService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService,
        twilio_service_1.TwilioService])
], DossierNotifService);
