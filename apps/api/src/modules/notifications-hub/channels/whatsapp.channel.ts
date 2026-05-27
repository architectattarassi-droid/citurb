import { Injectable, Logger } from "@nestjs/common";
import type { RenderedTemplate } from "../types";

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
@Injectable()
export class WhatsappChannel {
  private readonly log = new Logger("HubWhatsappChannel");

  hasCloudApi(): boolean {
    return !!(process.env.WHATSAPP_BUSINESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  }

  async send(toE164: string, rendered: RenderedTemplate): Promise<{ success: boolean; externalId?: string; error?: string }> {
    if (!toE164 || !toE164.startsWith("+")) {
      return { success: false, error: "Numéro E.164 requis" };
    }
    const body = rendered.bodyWhatsapp || rendered.bodyText || rendered.bodyInAppDescription || "";
    if (!body) return { success: false, error: "Aucun contenu" };

    if (this.hasCloudApi()) {
      return this.sendViaCloudApi(toE164, body);
    }
    // Fallback : deeplink wa.me — pas d'envoi auto, mais l'URL est utilisable par l'UI.
    const phone = toE164.replace(/^\+/, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
    this.log.warn(`[HubWhatsapp] Cloud API non configurée — fallback deeplink: ${url.slice(0, 80)}…`);
    return { success: true, externalId: url };
  }

  private async sendViaCloudApi(toE164: string, body: string): Promise<{ success: boolean; externalId?: string; error?: string }> {
    const token = process.env.WHATSAPP_BUSINESS_TOKEN!;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
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
      const data: any = await res.json().catch(() => ({}));
      const msgId = data?.messages?.[0]?.id;
      return { success: true, externalId: msgId };
    } catch (e: any) {
      this.log.error(`[HubWhatsapp] network: ${e?.message}`);
      return { success: false, error: e?.message };
    }
  }
}
