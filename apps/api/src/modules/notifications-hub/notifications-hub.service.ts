import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { EmailChannel } from "./channels/email.channel";
import { SmsChannel } from "./channels/sms.channel";
import { WhatsappChannel } from "./channels/whatsapp.channel";
import { PushChannel } from "./channels/push.channel";
import { PreferencesService } from "./preferences.service";
import { TemplatesService } from "./templates.service";
import type {
  HubChannel,
  HubDispatchInput,
  HubDispatchResult,
  HubEventType,
  HubLang,
  RenderedTemplate,
} from "./types";

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
const NOTIFICATION_TYPE_MAP: Record<HubEventType, string> = {
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

@Injectable()
export class NotificationsHubService {
  private readonly log = new Logger("NotificationsHubService");

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailChannel: EmailChannel,
    private readonly smsChannel: SmsChannel,
    private readonly whatsappChannel: WhatsappChannel,
    private readonly pushChannel: PushChannel,
    private readonly prefs: PreferencesService,
    private readonly templates: TemplatesService,
  ) {}

  // ── Dispatch principal ──────────────────────────────────────────

  async dispatch(input: HubDispatchInput): Promise<HubDispatchResult> {
    const { eventType, userId, payload = {} } = input;
    const out: HubDispatchResult = { ok: true, eventType, userId, delivered: [] };

    // 1. Charger user (email/phone)
    const user = await this.prisma.user
      .findUnique({ where: { id: userId }, select: { id: true, email: true, phone: true, username: true } })
      .catch(() => null);
    if (!user) {
      this.log.warn(`[Hub] user introuvable ${userId} — dispatch skip`);
      return { ...out, ok: false };
    }

    // 2. Lang + rendu
    const lang: HubLang = input.lang || this.prefs.getLang(userId);
    const ctx = { userName: user.username || user.email?.split("@")[0] || "", ...payload };
    const rendered = this.templates.render(eventType, lang, ctx);

    // 3. Canaux candidats (filter input + filter prefs)
    const allChannels: HubChannel[] = ["EMAIL", "SMS", "WHATSAPP", "PUSH", "IN_APP"];
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

  private async storeInApp(
    userId: string,
    eventType: HubEventType,
    rendered: RenderedTemplate,
    payload: Record<string, any>,
  ): Promise<string | null> {
    const title = rendered.bodyInAppTitle || rendered.subject || eventType;
    const body = rendered.bodyInAppDescription || rendered.bodyText || "";
    const actionUrl = rendered.ctaUrl || null;
    const type = (NOTIFICATION_TYPE_MAP[eventType] || "POST_MENTION") as any;
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
    } catch (e: any) {
      this.log.warn(`[Hub] storeInApp failed: ${e?.message}`);
      return null;
    }
  }

  // ── Inbox / lecture ─────────────────────────────────────────────

  async inbox(userId: string, opts: { unread?: boolean; limit?: number } = {}) {
    const limit = Math.min(Math.max(opts.limit || 50, 1), 200);
    const where: any = { userId };
    if (opts.unread) where.readAt = null;
    const items = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const unreadCount = await this.prisma.notification.count({ where: { userId, readAt: null } });
    return { items, unreadCount };
  }

  async markRead(userId: string, notifId: string): Promise<{ ok: boolean }> {
    await this.prisma.notification
      .updateMany({ where: { id: notifId, userId }, data: { readAt: new Date() } })
      .catch(() => undefined);
    return { ok: true };
  }

  async markAllRead(userId: string): Promise<{ ok: boolean; count: number }> {
    const r = await this.prisma.notification
      .updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } })
      .catch(() => ({ count: 0 } as any));
    return { ok: true, count: r.count };
  }
}
