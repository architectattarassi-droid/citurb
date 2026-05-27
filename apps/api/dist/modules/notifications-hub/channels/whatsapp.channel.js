"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappChannel = void 0;
const common_1 = require("@nestjs/common");
/**
 * WhatsappChannel — WhatsApp Business Cloud API (Meta Graph) avec fallback wa.me.
 *
 * Trois modes :
 *  1. Cloud API : si `WHATSAPP_BUSINESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` configurés
 *     → envoi direct via Graph API (template ou texte).
 *  2. Fallback wa.me : si non configuré → on construit l'URL deeplink
 *     `https://wa.me/<phone>?text=<encoded>` retournée comme `externalId` —
 *     l'UI peut alors présenter le lien à l'utilisateur (OPS notif owner par ex.).
 *  3. Skip : si pas de numéro destinataire, log warn et return success=false.
 *
 * Doctrine : aucun message ne contient de données sensibles (CNI, montants exacts
 * client) — uniquement métadonnées dossier + lien retour plateforme.
 */
let WhatsappChannel = class WhatsappChannel {
    log = new common_1.Logger("HubWhatsappChannel");
    hasCloudApi() {
        return !!(process.env.WHATSAPP_BUSINESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
    }
    async send(toE164, rendered) {
        if (!toE164 || !toE164.startsWith("+")) {
            return { success: false, error: "Numéro E.164 requis" };
        }
        const body = rendered.bodyWhatsapp || rendered.bodyText || rendered.bodyInAppDescription || "";
        if (!body)
            return { success: false, error: "Aucun contenu" };
        if (this.hasCloudApi()) {
            return this.sendViaCloudApi(toE164, body);
        }
        // Fallback : deeplink wa.me — pas d'envoi auto, mais l'URL est utilisable par l'UI.
        const phone = toE164.replace(/^\+/, "");
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
        this.log.warn(`[HubWhatsapp] Cloud API non configurée — fallback deeplink: ${url.slice(0, 80)}…`);
        return { success: true, externalId: url };
    }
    async sendViaCloudApi(toE164, body) {
        const token = process.env.WHATSAPP_BUSINESS_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";
        const to = toE164.replace(/^\+/, "");
        try {
            const res = await fetch(`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(phoneNumberId)}/messages`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to,
                    type: "text",
                    text: { body: body.slice(0, 4000) },
                }),
            });
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                this.log.error(`[HubWhatsapp] Cloud API ${res.status}: ${txt.slice(0, 200)}`);
                return { success: false, error: `WhatsApp ${res.status}` };
            }
            const data = await res.json().catch(() => ({}));
            const msgId = data?.messages?.[0]?.id;
            return { success: true, externalId: msgId };
        }
        catch (e) {
            this.log.error(`[HubWhatsapp] network: ${e?.message}`);
            return { success: false, error: e?.message };
        }
    }
};
exports.WhatsappChannel = WhatsappChannel;
exports.WhatsappChannel = WhatsappChannel = __decorate([
    (0, common_1.Injectable)()
], WhatsappChannel);
