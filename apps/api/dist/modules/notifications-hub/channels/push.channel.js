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
exports.PushChannel = void 0;
const common_1 = require("@nestjs/common");
/**
 * PushChannel — Web Push VAPID.
 *
 * Charge dynamiquement `web-push` (peerDep optionnel). Si la lib n'est pas
 * installée OU si les clés VAPID ne sont pas configurées, on log et on no-op.
 *
 * VAPID :
 *  - `VAPID_PUBLIC_KEY`   : exposée côté front pour `pushManager.subscribe`
 *  - `VAPID_PRIVATE_KEY`  : utilisée ici pour signer les envois
 *  - `VAPID_SUBJECT`      : "mailto:contact@citurbarea.ma" (par défaut)
 *
 * Le hub fournit la liste des subscriptions du user (lues depuis prefs) ; on
 * envoie en parallèle et on collecte les success/echecs. Les subscriptions
 * en erreur 410/404 (gone/not-found) sont à supprimer côté hub.
 */
let PushChannel = class PushChannel {
    log = new common_1.Logger("HubPushChannel");
    webpush = null;
    configured = false;
    constructor() {
        this.init();
    }
    init() {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            this.webpush = require("web-push");
        }
        catch {
            this.log.warn("[HubPush] lib `web-push` absente — installer `npm i web-push` pour activer.");
            return;
        }
        const pub = process.env.VAPID_PUBLIC_KEY;
        const priv = process.env.VAPID_PRIVATE_KEY;
        const subject = process.env.VAPID_SUBJECT || "mailto:contact@citurbarea.ma";
        if (!pub || !priv) {
            this.log.warn("[HubPush] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquantes — Push désactivé.");
            return;
        }
        try {
            this.webpush.setVapidDetails(subject, pub, priv);
            this.configured = true;
            this.log.log("[HubPush] VAPID configuré.");
        }
        catch (e) {
            this.log.error(`[HubPush] erreur VAPID: ${e?.message}`);
        }
    }
    isReady() {
        return this.configured;
    }
    /**
     * Envoie un push à toutes les subscriptions fournies.
     * Retourne success=true dès qu'au moins une sub a abouti.
     * Les ids gone (410/404) sont remontés via `goneEndpoints` pour purge.
     */
    async sendAll(subscriptions, rendered) {
        if (!this.configured || !this.webpush) {
            return { success: false, error: "Push non configuré", goneEndpoints: [] };
        }
        if (!subscriptions.length) {
            return { success: false, error: "Aucune subscription Web Push", goneEndpoints: [] };
        }
        const payload = JSON.stringify({
            title: rendered.bodyPushTitle || rendered.bodyInAppTitle || "CITURBAREA",
            body: rendered.bodyPushBody || rendered.bodyInAppDescription || "",
            icon: "/icons/icon.svg",
            badge: "/icons/icon.svg",
            url: rendered.ctaUrl || "/notifications",
        });
        const gone = [];
        let okCount = 0;
        await Promise.all(subscriptions.map(async (sub) => {
            try {
                await this.webpush.sendNotification(sub, payload);
                okCount += 1;
            }
            catch (e) {
                const status = e?.statusCode;
                if (status === 404 || status === 410) {
                    gone.push(sub.endpoint);
                }
                else {
                    this.log.warn(`[HubPush] envoi échoué (${status}): ${e?.message}`);
                }
            }
        }));
        return {
            success: okCount > 0,
            externalId: okCount ? `push-${okCount}` : undefined,
            goneEndpoints: gone,
        };
    }
};
exports.PushChannel = PushChannel;
exports.PushChannel = PushChannel = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PushChannel);
