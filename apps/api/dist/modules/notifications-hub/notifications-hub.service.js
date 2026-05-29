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
exports.NotificationsHubService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const email_channel_1 = require("./channels/email.channel");
const sms_channel_1 = require("./channels/sms.channel");
const whatsapp_channel_1 = require("./channels/whatsapp.channel");
const push_channel_1 = require("./channels/push.channel");
const preferences_service_1 = require("./preferences.service");
const templates_service_1 = require("./templates.service");
/**
 * NotificationsHubService — service unique de dispatch multi-canal.
 *
 * Flow `dispatch({eventType, userId, payload})` :
 *   1. Charge user (email/phone/lang via prefs ou fallback fr)
 *   2. Rend les 5 variantes (email, sms, wa, push, in-app) via TemplatesService
 *   3. Pour chaque canal {EMAIL,SMS,WHATSAPP,PUSH,IN_APP} :
 *        - vérifie prefs (sauf IN_APP toujours actif)
 *        - vérifie filter `input.channels` éventuel
 *        - envoie via channel correspondant
 *   4. Stocke IN_APP en Prisma `Notification` (type mappé)
 *   5. Retourne `HubDispatchResult` agrégé
 *
 * Singleton importable partout : `constructor(private hub: NotificationsHubService)`.
 *
 * Aucune exception ne remonte ; chaque échec canal est isolé et loggé.
 */
/** Mapping HubEventType → enum NotificationType existant (fallback POST_MENTION). */
const NOTIFICATION_TYPE_MAP = {
    LEAD_CONTACT_RECU: "POST_MENTION",
    DOSSIER_CREE: "POST_MENTION",
    PROFIL_VALIDE: "CONNECTION_ACCEPTED",
    PERMIS_DEPOSE: "POST_MENTION",
    PERMIS_COMMISSION_PROGRAMMEE: "ROOM_STARTING",
    PERMIS_DECISION_FAVORABLE: "POST_MENTION",
    PERMIS_DECISION_RESERVES: "POST_MENTION",
    PERMIS_DECISION_REFUS: "POST_MENTION",
    CHANTIER_DEMARRAGE: "POST_MENTION",
    PV_CHANTIER_SIGNE: "POST_MENTION",
    RETARD_DETECTE: "POST_MENTION",
    BLOCAGE_DECLARE: "POST_MENTION",
    PV_CADENCE_RAPPEL: "POST_MENTION",
    CHANTIER_BLOQUE_PV: "POST_MENTION",
    CHANTIER_DEBLOQUE_PV: "POST_MENTION",
    RECEPTION_PROVISOIRE_PROGRAMMEE: "ROOM_STARTING",
    LIVRAISON_PRETE: "POST_MENTION",
    GARANTIE_EXPIRE_J30: "POST_MENTION",
    PAIEMENT_RECU: "POST_MENTION",
    PACK_VALIDE: "CONNECTION_ACCEPTED",
    FACTURE_DISPONIBLE: "POST_MENTION",
    MENTION_INTERACTION: "POST_MENTION",
    INVITATION_CERCLE: "CERCLE_INVITE",
    MESSAGE_RECU: "POST_REPLY",
    OTP_CONNEXION: "POST_MENTION",
    MOT_DE_PASSE_CHANGE: "POST_MENTION",
    INFO_GENERIQUE: "POST_MENTION",
};
let NotificationsHubService = class NotificationsHubService {
    prisma;
    emailChannel;
    smsChannel;
    whatsappChannel;
    pushChannel;
    prefs;
    templates;
    log = new common_1.Logger("NotificationsHubService");
    constructor(prisma, emailChannel, smsChannel, whatsappChannel, pushChannel, prefs, templates) {
        this.prisma = prisma;
        this.emailChannel = emailChannel;
        this.smsChannel = smsChannel;
        this.whatsappChannel = whatsappChannel;
        this.pushChannel = pushChannel;
        this.prefs = prefs;
        this.templates = templates;
    }
    // ── Dispatch principal ──────────────────────────────────────────
    async dispatch(input) {
        const { eventType, userId, payload = {} } = input;
        const out = { ok: true, eventType, userId, delivered: [] };
        // 1. Charger user (email/phone)
        const user = await this.prisma.user
            .findUnique({ where: { id: userId }, select: { id: true, email: true, phone: true, username: true } })
            .catch(() => null);
        if (!user) {
            this.log.warn(`[Hub] user introuvable ${userId} — dispatch skip`);
            return { ...out, ok: false };
        }
        // 2. Lang + rendu
        const lang = input.lang || this.prefs.getLang(userId);
        const ctx = { userName: user.username || user.email?.split("@")[0] || "", ...payload };
        const rendered = this.templates.render(eventType, lang, ctx);
        // 3. Canaux candidats (filter input + filter prefs)
        const allChannels = ["EMAIL", "SMS", "WHATSAPP", "PUSH", "IN_APP"];
        const candidate = (input.channels && input.channels.length ? input.channels : allChannels);
        // IN_APP : toujours (sauf si explicitement filtré OUT)
        if (candidate.includes("IN_APP")) {
            const notifId = await this.storeInApp(userId, eventType, rendered, payload);
            out.delivered.push({ channel: "IN_APP", success: !!notifId, externalId: notifId || undefined });
            out.notifId = notifId || undefined;
        }
        // Autres canaux : respect des prefs
        if (candidate.includes("EMAIL") && this.prefs.isEnabled(userId, eventType, "EMAIL") && user.email) {
            const r = await this.emailChannel.send(user.email, rendered);
            out.delivered.push({ channel: "EMAIL", ...r });
        }
        if (candidate.includes("SMS") && this.prefs.isEnabled(userId, eventType, "SMS") && user.phone) {
            const r = await this.smsChannel.send(user.phone, rendered);
            out.delivered.push({ channel: "SMS", ...r });
        }
        if (candidate.includes("WHATSAPP") && this.prefs.isEnabled(userId, eventType, "WHATSAPP") && user.phone) {
            const r = await this.whatsappChannel.send(user.phone, rendered);
            out.delivered.push({ channel: "WHATSAPP", ...r });
        }
        if (candidate.includes("PUSH") && this.prefs.isEnabled(userId, eventType, "PUSH")) {
            const subs = this.prefs.listPushSubs(userId);
            if (subs.length) {
                const r = await this.pushChannel.sendAll(subs, rendered);
                out.delivered.push({ channel: "PUSH", success: r.success, externalId: r.externalId, error: r.error });
                if (r.goneEndpoints?.length) {
                    await this.prefs.removePushSubsByEndpoints(userId, r.goneEndpoints).catch(() => undefined);
                }
            }
        }
        out.ok = out.delivered.some(d => d.success);
        this.log.log(`[Hub] dispatch ${eventType} → ${userId} : ${out.delivered.map(d => `${d.channel}=${d.success ? "ok" : "ko"}`).join(", ")}`);
        return out;
    }
    // ── Storage IN_APP via Prisma Notification ────────────────────
    async storeInApp(userId, eventType, rendered, payload) {
        const title = rendered.bodyInAppTitle || rendered.subject || eventType;
        const body = rendered.bodyInAppDescription || rendered.bodyText || "";
        const actionUrl = rendered.ctaUrl || null;
        const type = (NOTIFICATION_TYPE_MAP[eventType] || "POST_MENTION");
        try {
            const n = await this.prisma.notification.create({
                data: {
                    userId,
                    type,
                    title,
                    body: body || null,
                    actionUrl,
                    refType: `hub:${eventType}`,
                    refId: payload?.dossierId || payload?.refId || null,
                },
            });
            return n.id;
        }
        catch (e) {
            this.log.warn(`[Hub] storeInApp failed: ${e?.message}`);
            return null;
        }
    }
    // ── Inbox / lecture ─────────────────────────────────────────────
    async inbox(userId, opts = {}) {
        const limit = Math.min(Math.max(opts.limit || 50, 1), 200);
        const where = { userId };
        if (opts.unread)
            where.readAt = null;
        const items = await this.prisma.notification.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
        });
        const unreadCount = await this.prisma.notification.count({ where: { userId, readAt: null } });
        return { items, unreadCount };
    }
    async markRead(userId, notifId) {
        await this.prisma.notification
            .updateMany({ where: { id: notifId, userId }, data: { readAt: new Date() } })
            .catch(() => undefined);
        return { ok: true };
    }
    async markAllRead(userId) {
        const r = await this.prisma.notification
            .updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } })
            .catch(() => ({ count: 0 }));
        return { ok: true, count: r.count };
    }
};
exports.NotificationsHubService = NotificationsHubService;
exports.NotificationsHubService = NotificationsHubService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_channel_1.EmailChannel,
        sms_channel_1.SmsChannel,
        whatsapp_channel_1.WhatsappChannel,
        push_channel_1.PushChannel,
        preferences_service_1.PreferencesService,
        templates_service_1.TemplatesService])
], NotificationsHubService);
