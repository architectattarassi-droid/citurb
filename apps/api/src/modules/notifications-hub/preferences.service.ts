import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { promises as fs } from "fs";
import { join } from "path";
import type { ChannelPreference, HubChannel, HubEventType, HubLang, WebPushSubscription } from "./types";

/**
 * PreferencesService — préférences notifications utilisateur.
 *
 * Stockage : fichier JSON `storage/notifications-hub-prefs.json` (idempotent,
 * zéro migration Prisma). Format :
 *   {
 *     "<userId>": {
 *       lang: "fr",
 *       muted: { "<eventType>:<channel>": true },   // opt-out explicite
 *       pushSubs: [ { endpoint, keys, ... } ]
 *     }
 *   }
 *
 * Défaut : tous les canaux opt-in pour tous les événements. Seuls les opt-out
 * explicites sont stockés → file léger.
 *
 * Concurrency : lecture/écriture séquentielles via promise lock interne.
 */

type UserPrefs = {
  lang?: HubLang;
  muted?: Record<string, boolean>;   // clé "EVENT:CHANNEL"
  pushSubs?: WebPushSubscription[];
};

@Injectable()
export class PreferencesService implements OnModuleInit {
  private readonly log = new Logger("HubPreferencesService");
  private readonly file = join(process.env.STORAGE_DIR || join(process.cwd(), "storage"), "notifications-hub-prefs.json");
  private store: Record<string, UserPrefs> = {};
  private writeLock: Promise<void> = Promise.resolve();

  async onModuleInit() {
    try {
      await fs.mkdir(join(this.file, ".."), { recursive: true }).catch(() => undefined);
      const txt = await fs.readFile(this.file, "utf8").catch(() => "{}");
      this.store = JSON.parse(txt) || {};
      this.log.log(`[HubPrefs] ${Object.keys(this.store).length} utilisateur(s) chargé(s).`);
    } catch (e: any) {
      this.log.warn(`[HubPrefs] load failed: ${e?.message} — démarrage avec store vide.`);
      this.store = {};
    }
  }

  private key(eventType: HubEventType, channel: HubChannel) {
    return `${eventType}:${channel}`;
  }

  /** Renvoie true si (event, channel) est ACTIF pour ce user (défaut = actif). */
  isEnabled(userId: string, eventType: HubEventType, channel: HubChannel): boolean {
    const prefs = this.store[userId];
    if (!prefs?.muted) return true;
    return !prefs.muted[this.key(eventType, channel)];
  }

  /** Renvoie la langue préférée du user (fr par défaut). */
  getLang(userId: string): HubLang {
    return this.store[userId]?.lang || "fr";
  }

  setLang(userId: string, lang: HubLang): Promise<void> {
    this.store[userId] = { ...(this.store[userId] || {}), lang };
    return this.persist();
  }

  /** Préférences exhaustives pour l'UI (matrice eventType × channel). */
  getMatrix(userId: string, eventTypes: HubEventType[], channels: HubChannel[]): ChannelPreference[] {
    const out: ChannelPreference[] = [];
    for (const e of eventTypes) {
      for (const c of channels) {
        out.push({ eventType: e, channel: c, enabled: this.isEnabled(userId, e, c) });
      }
    }
    return out;
  }

  /** Active ou désactive un canal pour un event type. */
  setPreference(userId: string, eventType: HubEventType, channel: HubChannel, enabled: boolean): Promise<void> {
    const prefs: UserPrefs = this.store[userId] || {};
    prefs.muted = prefs.muted || {};
    if (enabled) {
      delete prefs.muted[this.key(eventType, channel)];
    } else {
      prefs.muted[this.key(eventType, channel)] = true;
    }
    this.store[userId] = prefs;
    return this.persist();
  }

  // ── Web Push subscriptions ─────────────────────────────────────

  listPushSubs(userId: string): WebPushSubscription[] {
    return this.store[userId]?.pushSubs || [];
  }

  async addPushSub(userId: string, sub: WebPushSubscription): Promise<void> {
    const prefs: UserPrefs = this.store[userId] || {};
    const existing = prefs.pushSubs || [];
    const already = existing.some(s => s.endpoint === sub.endpoint);
    if (already) return;
    prefs.pushSubs = [...existing, sub];
    this.store[userId] = prefs;
    await this.persist();
  }

  async removePushSub(userId: string, endpoint: string): Promise<void> {
    const prefs: UserPrefs = this.store[userId] || {};
    if (!prefs.pushSubs) return;
    prefs.pushSubs = prefs.pushSubs.filter(s => s.endpoint !== endpoint);
    this.store[userId] = prefs;
    await this.persist();
  }

  async removePushSubsByEndpoints(userId: string, endpoints: string[]): Promise<void> {
    if (!endpoints.length) return;
    const set = new Set(endpoints);
    const prefs: UserPrefs = this.store[userId] || {};
    if (!prefs.pushSubs) return;
    prefs.pushSubs = prefs.pushSubs.filter(s => !set.has(s.endpoint));
    this.store[userId] = prefs;
    await this.persist();
  }

  // ── Persistance disque (file lock séquentiel) ──────────────────

  private persist(): Promise<void> {
    const next = this.writeLock.then(async () => {
      try {
        await fs.writeFile(this.file, JSON.stringify(this.store, null, 2), "utf8");
      } catch (e: any) {
        this.log.warn(`[HubPrefs] persist failed: ${e?.message}`);
      }
    });
    this.writeLock = next;
    return next;
  }
}
