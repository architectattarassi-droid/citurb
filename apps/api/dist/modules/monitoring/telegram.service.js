"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
const common_1 = require("@nestjs/common");
let TelegramService = class TelegramService {
    log = new common_1.Logger("TelegramService");
    token() {
        return process.env.TELEGRAM_BOT_TOKEN || undefined;
    }
    chatId() {
        return process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID || undefined;
    }
    isConfigured() {
        return !!this.token() && !!this.chatId();
    }
    /**
     * Envoie un message. `parseMode` par défaut "HTML" (sous-ensemble supporté par
     * Telegram : <b> <i> <a href> <code> <pre>). `disablePreview` évite les cartes
     * de prévisualisation de liens (par défaut true).
     */
    async sendMessage(text, parseMode = "HTML", disablePreview = true) {
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
        }
        catch (e) {
            this.log.error(`[Telegram] network error: ${e?.message}`);
            return { ok: false, error: e?.message || "network error" };
        }
    }
};
exports.TelegramService = TelegramService;
exports.TelegramService = TelegramService = __decorate([
    (0, common_1.Injectable)()
], TelegramService);
