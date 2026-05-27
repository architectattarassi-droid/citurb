"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferencesService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
let PreferencesService = class PreferencesService {
    log = new common_1.Logger("HubPreferencesService");
    file = (0, path_1.join)(process.env.STORAGE_DIR || (0, path_1.join)(process.cwd(), "storage"), "notifications-hub-prefs.json");
    store = {};
    writeLock = Promise.resolve();
    async onModuleInit() {
        try {
            await fs_1.promises.mkdir((0, path_1.join)(this.file, ".."), { recursive: true }).catch(() => undefined);
            const txt = await fs_1.promises.readFile(this.file, "utf8").catch(() => "{}");
            this.store = JSON.parse(txt) || {};
            this.log.log(`[HubPrefs] ${Object.keys(this.store).length} utilisateur(s) chargé(s).`);
        }
        catch (e) {
            this.log.warn(`[HubPrefs] load failed: ${e?.message} — démarrage avec store vide.`);
            this.store = {};
        }
    }
    key(eventType, channel) {
        return `${eventType}:${channel}`;
    }
    /** Renvoie true si (event, channel) est ACTIF pour ce user (défaut = actif). */
    isEnabled(userId, eventType, channel) {
        const prefs = this.store[userId];
        if (!prefs?.muted)
            return true;
        return !prefs.muted[this.key(eventType, channel)];
    }
    /** Renvoie la langue préférée du user (fr par défaut). */
    getLang(userId) {
        return this.store[userId]?.lang || "fr";
    }
    setLang(userId, lang) {
        this.store[userId] = { ...(this.store[userId] || {}), lang };
        return this.persist();
    }
    /** Préférences exhaustives pour l'UI (matrice eventType × channel). */
    getMatrix(userId, eventTypes, channels) {
        const out = [];
        for (const e of eventTypes) {
            for (const c of channels) {
                out.push({ eventType: e, channel: c, enabled: this.isEnabled(userId, e, c) });
            }
        }
        return out;
    }
    /** Active ou désactive un canal pour un event type. */
    setPreference(userId, eventType, channel, enabled) {
        const prefs = this.store[userId] || {};
        prefs.muted = prefs.muted || {};
        if (enabled) {
            delete prefs.muted[this.key(eventType, channel)];
        }
        else {
            prefs.muted[this.key(eventType, channel)] = true;
        }
        this.store[userId] = prefs;
        return this.persist();
    }
    // ── Web Push subscriptions ─────────────────────────────────────
    listPushSubs(userId) {
        return this.store[userId]?.pushSubs || [];
    }
    async addPushSub(userId, sub) {
        const prefs = this.store[userId] || {};
        const existing = prefs.pushSubs || [];
        const already = existing.some(s => s.endpoint === sub.endpoint);
        if (already)
            return;
        prefs.pushSubs = [...existing, sub];
        this.store[userId] = prefs;
        await this.persist();
    }
    async removePushSub(userId, endpoint) {
        const prefs = this.store[userId] || {};
        if (!prefs.pushSubs)
            return;
        prefs.pushSubs = prefs.pushSubs.filter(s => s.endpoint !== endpoint);
        this.store[userId] = prefs;
        await this.persist();
    }
    async removePushSubsByEndpoints(userId, endpoints) {
        if (!endpoints.length)
            return;
        const set = new Set(endpoints);
        const prefs = this.store[userId] || {};
        if (!prefs.pushSubs)
            return;
        prefs.pushSubs = prefs.pushSubs.filter(s => !set.has(s.endpoint));
        this.store[userId] = prefs;
        await this.persist();
    }
    // ── Persistance disque (file lock séquentiel) ──────────────────
    persist() {
        const next = this.writeLock.then(async () => {
            try {
                await fs_1.promises.writeFile(this.file, JSON.stringify(this.store, null, 2), "utf8");
            }
            catch (e) {
                this.log.warn(`[HubPrefs] persist failed: ${e?.message}`);
            }
        });
        this.writeLock = next;
        return next;
    }
};
exports.PreferencesService = PreferencesService;
exports.PreferencesService = PreferencesService = __decorate([
    (0, common_1.Injectable)()
], PreferencesService);
