import { Injectable, Logger } from "@nestjs/common";
import { TwilioService } from "../../twilio/twilio.service";
import type { RenderedTemplate } from "../types";

/**
 * SmsChannel — wrap `TwilioService` (Programmable Messaging).
 *
 * Le hub appelle `send(toE164, rendered)` ; on tronque à 160 caractères et
 * on retombe sur `bodyInAppDescription` si pas de `bodyText`.
 */
@Injectable()
export class SmsChannel {
  private readonly log = new Logger("HubSmsChannel");

  constructor(private readonly twilio: TwilioService) {}

  async send(toE164: string, rendered: RenderedTemplate): Promise<{ success: boolean; externalId?: string; error?: string }> {
    if (!toE164 || !toE164.startsWith("+")) {
      return { success: false, error: "Numéro E.164 requis (format +212…)" };
    }
    const body = (rendered.bodyText || rendered.bodyInAppDescription || rendered.bodyInAppTitle || "CITURBAREA").slice(0, 160);
    const r = await this.twilio.sendSms(toE164, body);
    if (!r.ok) {
      this.log.warn(`[HubSms] échec envoi à ${toE164}: ${r.error}`);
      return { success: false, error: r.error };
    }
    return { success: true, externalId: r.messageId };
  }
}
