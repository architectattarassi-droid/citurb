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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsHubController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const notifications_hub_service_1 = require("./notifications-hub.service");
const preferences_service_1 = require("./preferences.service");
const templates_service_1 = require("./templates.service");
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
let NotificationsHubController = class NotificationsHubController {
    hub;
    prefs;
    templates;
    constructor(hub, prefs, templates) {
        this.hub = hub;
        this.prefs = prefs;
        this.templates = templates;
    }
    uid(req) {
        return req?.user?.userId || req?.user?.sub;
    }
    // ── Dispatch (interne — utilisé par autres modules ou tests admin) ──
    async dispatch(body) {
        if (!body?.eventType || !body?.userId) {
            throw new common_1.BadRequestException("eventType + userId requis");
        }
        const r = await this.hub.dispatch(body);
        return { ok: r.ok, data: r };
    }
    // ── Inbox ──────────────────────────────────────────────────────
    async inbox(req, unread, limit) {
        const { items, unreadCount } = await this.hub.inbox(this.uid(req), {
            unread: unread === "true" || unread === "1",
            limit: limit ? Number(limit) : undefined,
        });
        return { ok: true, data: { items, unreadCount } };
    }
    async markRead(req, notifId) {
        return this.hub.markRead(this.uid(req), notifId);
    }
    async markAllRead(req) {
        return this.hub.markAllRead(this.uid(req));
    }
    // ── Préférences ─────────────────────────────────────────────────
    async getPreferences(req) {
        const userId = this.uid(req);
        const channels = ["EMAIL", "SMS", "WHATSAPP", "PUSH", "IN_APP"];
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
    async setPreference(req, body) {
        if (!body?.eventType || !body?.channel || typeof body.enabled !== "boolean") {
            throw new common_1.BadRequestException("eventType + channel + enabled requis");
        }
        await this.prefs.setPreference(this.uid(req), body.eventType, body.channel, body.enabled);
        return { ok: true };
    }
    async setLang(req, body) {
        if (!["fr", "ar", "en"].includes(body?.lang)) {
            throw new common_1.BadRequestException("lang invalide");
        }
        await this.prefs.setLang(this.uid(req), body.lang);
        return { ok: true };
    }
    // ── Web Push ───────────────────────────────────────────────────
    vapidKey() {
        return { ok: true, data: { publicKey: process.env.VAPID_PUBLIC_KEY || null } };
    }
    async subscribe(req, body) {
        const sub = body?.subscription;
        if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
            throw new common_1.BadRequestException("subscription invalide");
        }
        await this.prefs.addPushSub(this.uid(req), sub);
        return { ok: true };
    }
    async unsubscribe(req, body) {
        if (!body?.endpoint)
            throw new common_1.BadRequestException("endpoint requis");
        await this.prefs.removePushSub(this.uid(req), body.endpoint);
        return { ok: true };
    }
    // ── Rendu de template (debug / admin) ──────────────────────────
    renderTemplate(eventType, lang) {
        const ln = (["fr", "ar", "en"].includes(lang || "") ? lang : "fr");
        const r = this.templates.render(eventType, ln, {
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
};
exports.NotificationsHubController = NotificationsHubController;
__decorate([
    (0, common_1.Post)("dispatch"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsHubController.prototype, "dispatch", null);
__decorate([
    (0, common_1.Get)("inbox"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("unread")),
    __param(2, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], NotificationsHubController.prototype, "inbox", null);
__decorate([
    (0, common_1.Post)(":notifId/mark-read"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("notifId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationsHubController.prototype, "markRead", null);
__decorate([
    (0, common_1.Post)("mark-all-read"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsHubController.prototype, "markAllRead", null);
__decorate([
    (0, common_1.Get)("preferences"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsHubController.prototype, "getPreferences", null);
__decorate([
    (0, common_1.Patch)("preferences"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationsHubController.prototype, "setPreference", null);
__decorate([
    (0, common_1.Patch)("preferences/lang"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationsHubController.prototype, "setLang", null);
__decorate([
    (0, common_1.Get)("push/vapid-public-key"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NotificationsHubController.prototype, "vapidKey", null);
__decorate([
    (0, common_1.Post)("push/subscribe"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationsHubController.prototype, "subscribe", null);
__decorate([
    (0, common_1.Post)("push/unsubscribe"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationsHubController.prototype, "unsubscribe", null);
__decorate([
    (0, common_1.Get)("templates/:eventType"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("eventType")),
    __param(1, (0, common_1.Query)("lang")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], NotificationsHubController.prototype, "renderTemplate", null);
exports.NotificationsHubController = NotificationsHubController = __decorate([
    (0, tome_at_1.Tome)("tome0"),
    (0, common_1.Controller)("api/notifications-hub"),
    __metadata("design:paramtypes", [notifications_hub_service_1.NotificationsHubService,
        preferences_service_1.PreferencesService,
        templates_service_1.TemplatesService])
], NotificationsHubController);
