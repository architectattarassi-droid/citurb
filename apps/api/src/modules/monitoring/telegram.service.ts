import { Injectable, Logger } from "@nestjs/common";

/**
 * TelegramService — envoi de messages via l'API Bot Telegram.
 *
 * Config (env) :
 *  - TELEGRAM_BOT_TOKEN : token du bot (créé via @BotFather).
 *  - TELEGRAM_CHAT_ID   : chat cible (perso, groupe ou canal). Fallback sur
 *    TELEGRAM_ADMIN_CHAT_ID (déjà présent dans l'env historique).
 *
 * Récupérer le chat_id : écrire au bot puis
 *   GET https://api.telegram.org/bot<token>/getUpdates
 * et lire result[].message.chat.id (ou utiliser @userinfobot).
 *
 * Jamais bloquant : retourne { ok:false } en cas d'erreur, ne throw jamais.
 */
export type TelegramResult = { ok: boolean; skipped?: boolean; error?: string };

@Injectable()
export class TelegramService {
  private readonly log = new Logger("TelegramService");

  private token(): string | undefined {
    return process.env.TELEGRAM_BOT_TOKEN || undefined;
  }
  private chatId(): string | undefined {
    return process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID || undefined;
  }

  isConfigured(): boolean {
    return !!this.token() && !!this.chatId();
  }

  /**
   * Envoie un message. `parseMode` par défaut "HTML" (sous-ensemble supporté par
   * Telegram : <b> <i> <a href> <code> <pre>). `disablePreview` évite les cartes
   * de prévisualisation de liens (par défaut true).
   */
  async sendMessage(
    text: string,
    parseMode: "HTML" | "Markdown" | "MarkdownV2" = "HTML",
    disablePreview = true,
  ): Promise<TelegramResult> {
    if (!this.isConfigured()) {
      this.log.warn("[Telegram] non configuré (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID) — skip");
      return { ok: false, skipped: true, error: "not configured" };
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token()}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: this.chatId(),
          text,
          parse_mode: parseMode,
          disable_web_page_preview: disablePreview,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const err = `Telegram ${res.status}: ${body.slice(0, 200)}`;
        this.log.error(`[Telegram] ${err}`);
        return { ok: false, error: err };
      }
      this.log.log("[Telegram] message envoyé");
      return { ok: true };
    } catch (e: any) {
      this.log.error(`[Telegram] network error: ${e?.message}`);
      return { ok: false, error: e?.message || "network error" };
    }
  }
}
