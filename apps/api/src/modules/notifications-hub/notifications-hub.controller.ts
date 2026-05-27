import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { NotificationsHubService } from "./notifications-hub.service";
import { PreferencesService } from "./preferences.service";
import { TemplatesService } from "./templates.service";
import type { HubChannel, HubDispatchInput, HubEventType, HubLang, WebPushSubscription } from "./types";

/**
 * NotificationsHubController — endpoints REST du hub centralisé.
 *
 * Toutes les routes sous `/api/notifications-hub` (allow-listée MutationGate).
 * Auth JWT obligatoire (sauf rendu de templates qui est utilitaire admin).
 *
 * Endpoints :
 *   POST  /dispatch                       (interne, payload léger)
 *   GET   /inbox?unread=&limit=
 *   POST  /:notifId/mark-read
 *   POST  /mark-all-read
 *   GET   /preferences
 *   PATCH /preferences                    body: {eventType, channel, enabled}
 *   GET   /preferences/lang
 *   PATCH /preferences/lang               body: {lang: "fr"|"ar"|"en"}
 *   POST  /push/subscribe                 body: { subscription }
 *   POST  /push/unsubscribe               body: { endpoint }
 *   GET   /push/vapid-public-key
 *   GET   /templates/:eventType?lang=fr
 */
@Tome("tome0")
@Controller("api/notifications-hub")
export class NotificationsHubController {
  constructor(
    private readonly hub: NotificationsHubService,
    private readonly prefs: PreferencesService,
    private readonly templates: TemplatesService,
  ) {}

  private uid(req: any): string {
    return req?.user?.userId || req?.user?.sub;
  }

  // ── Dispatch (interne — utilisé par autres modules ou tests admin) ──

  @Post("dispatch")
  @UseGuards(JwtAuthGuard)
  async dispatch(@Body() body: HubDispatchInput) {
    if (!body?.eventType || !body?.userId) {
      throw new BadRequestException("eventType + userId requis");
    }
    const r = await this.hub.dispatch(body);
    return { ok: r.ok, data: r };
  }

  // ── Inbox ──────────────────────────────────────────────────────

  @Get("inbox")
  @UseGuards(JwtAuthGuard)
  async inbox(@Req() req: any, @Query("unread") unread?: string, @Query("limit") limit?: string) {
    const { items, unreadCount } = await this.hub.inbox(this.uid(req), {
      unread: unread === "true" || unread === "1",
      limit: limit ? Number(limit) : undefined,
    });
    return { ok: true, data: { items, unreadCount } };
  }

  @Post(":notifId/mark-read")
  @UseGuards(JwtAuthGuard)
  async markRead(@Req() req: any, @Param("notifId") notifId: string) {
    return this.hub.markRead(this.uid(req), notifId);
  }

  @Post("mark-all-read")
  @UseGuards(JwtAuthGuard)
  async markAllRead(@Req() req: any) {
    return this.hub.markAllRead(this.uid(req));
  }

  // ── Préférences ─────────────────────────────────────────────────

  @Get("preferences")
  @UseGuards(JwtAuthGuard)
  async getPreferences(@Req() req: any) {
    const userId = this.uid(req);
    const channels: HubChannel[] = ["EMAIL", "SMS", "WHATSAPP", "PUSH", "IN_APP"];
    const eventTypes = this.templates.listEventTypes();
    const matrix = this.prefs.getMatrix(userId, eventTypes, channels);
    return {
      ok: true,
      data: {
        lang: this.prefs.getLang(userId),
        channels,
        eventTypes,
        matrix,
      },
    };
  }

  @Patch("preferences")
  @UseGuards(JwtAuthGuard)
  async setPreference(
    @Req() req: any,
    @Body() body: { eventType: HubEventType; channel: HubChannel; enabled: boolean },
  ) {
    if (!body?.eventType || !body?.channel || typeof body.enabled !== "boolean") {
      throw new BadRequestException("eventType + channel + enabled requis");
    }
    await this.prefs.setPreference(this.uid(req), body.eventType, body.channel, body.enabled);
    return { ok: true };
  }

  @Patch("preferences/lang")
  @UseGuards(JwtAuthGuard)
  async setLang(@Req() req: any, @Body() body: { lang: HubLang }) {
    if (!["fr", "ar", "en"].includes(body?.lang)) {
      throw new BadRequestException("lang invalide");
    }
    await this.prefs.setLang(this.uid(req), body.lang);
    return { ok: true };
  }

  // ── Web Push ───────────────────────────────────────────────────

  @Get("push/vapid-public-key")
  vapidKey() {
    return { ok: true, data: { publicKey: process.env.VAPID_PUBLIC_KEY || null } };
  }

  @Post("push/subscribe")
  @UseGuards(JwtAuthGuard)
  async subscribe(@Req() req: any, @Body() body: { subscription: WebPushSubscription }) {
    const sub = body?.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      throw new BadRequestException("subscription invalide");
    }
    await this.prefs.addPushSub(this.uid(req), sub);
    return { ok: true };
  }

  @Post("push/unsubscribe")
  @UseGuards(JwtAuthGuard)
  async unsubscribe(@Req() req: any, @Body() body: { endpoint: string }) {
    if (!body?.endpoint) throw new BadRequestException("endpoint requis");
    await this.prefs.removePushSub(this.uid(req), body.endpoint);
    return { ok: true };
  }

  // ── Rendu de template (debug / admin) ──────────────────────────

  @Get("templates/:eventType")
  @UseGuards(JwtAuthGuard)
  renderTemplate(@Param("eventType") eventType: string, @Query("lang") lang?: string) {
    const ln: HubLang = (["fr", "ar", "en"].includes(lang || "") ? lang : "fr") as HubLang;
    const r = this.templates.render(eventType as HubEventType, ln, {
      userName: "Yassine",
      ref: "REF-DEMO",
      dossierId: "demo-id",
      amount: "1 000",
      currency: "MAD",
      date: "26/05/2026",
      commune: "Casablanca",
      actorName: "Mohammed",
      excerpt: "Bonjour, …",
    });
    return { ok: true, data: r };
  }
}
