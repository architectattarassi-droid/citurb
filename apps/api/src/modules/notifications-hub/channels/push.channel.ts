import { Injectable, Logger } from "@nestjs/common";
import type { RenderedTemplate, WebPushSubscription } from "../types";

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
@Injectable()
export class PushChannel {
  private readonly log = new Logger("HubPushChannel");
  private webpush: any | null = null;
  private configured = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.webpush = require("web-push");
    } catch {
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
    } catch (e: any) {
      this.log.error(`[HubPush] erreur VAPID: ${e?.message}`);
    }
  }

  isReady(): boolean {
    return this.configured;
  }

  /**
   * Envoie un push à toutes les subscriptions fournies.
   * Retourne success=true dès qu'au moins une sub a abouti.
   * Les ids gone (410/404) sont remontés via `goneEndpoints` pour purge.
   */
  async sendAll(
    subscriptions: WebPushSubscription[],
    rendered: RenderedTemplate,
  ): Promise<{ success: boolean; externalId?: string; error?: string; goneEndpoints: string[] }> {
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

    const gone: string[] = [];
    let okCount = 0;
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await this.webpush.sendNotification(sub, payload);
          okCount += 1;
        } catch (e: any) {
          const status = e?.statusCode;
          if (status === 404 || status === 410) {
            gone.push(sub.endpoint);
          } else {
            this.log.warn(`[HubPush] envoi échoué (${status}): ${e?.message}`);
          }
        }
      }),
    );
    return {
      success: okCount > 0,
      externalId: okCount ? `push-${okCount}` : undefined,
      goneEndpoints: gone,
    };
  }
}
