/**
 * notifications-hub.api.ts — Client REST du Notifications Hub.
 *
 * - JWT lu depuis localStorage (clé canonique `cit:auth:jwt`, fallback `token`)
 * - Toutes les routes sous `/api/notifications-hub`
 * - Web Push helpers (subscribe / unsubscribe via `serviceWorker.pushManager`)
 */

export type HubChannel = "EMAIL" | "SMS" | "WHATSAPP" | "PUSH" | "IN_APP";
export type HubLang = "fr" | "ar" | "en";
export type HubEventType = string;

export type InboxItem = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  actionUrl?: string | null;
  refType?: string | null;
  refId?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type InboxResponse = {
  items: InboxItem[];
  unreadCount: number;
};

export type ChannelPreference = {
  eventType: HubEventType;
  channel: HubChannel;
  enabled: boolean;
};

export type PreferencesResponse = {
  lang: HubLang;
  channels: HubChannel[];
  eventTypes: HubEventType[];
  matrix: ChannelPreference[];
};

const API_BASE = (typeof window !== "undefined" && (window as any).__API_BASE__) || "";

function token(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("cit:auth:jwt") || window.localStorage.getItem("token") || null;
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const t = token();
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...extra,
  };
}

async function jsonOrThrow<T>(r: Response): Promise<T> {
  const txt = await r.text();
  let data: any;
  try { data = txt ? JSON.parse(txt) : {}; } catch { data = { raw: txt }; }
  if (!r.ok) {
    const msg = data?.error || data?.message || `HTTP ${r.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data as T;
}

export const notificationsHubApi = {
  // ── Inbox ─────────────────────────────────────────────────────
  async inbox(opts: { unread?: boolean; limit?: number } = {}): Promise<InboxResponse> {
    const qs = new URLSearchParams();
    if (opts.unread) qs.set("unread", "true");
    if (opts.limit) qs.set("limit", String(opts.limit));
    const r = await fetch(`${API_BASE}/api/notifications-hub/inbox?${qs}`, { headers: authHeaders() });
    const j = await jsonOrThrow<{ ok: boolean; data: InboxResponse }>(r);
    return j.data;
  },

  async markRead(notifId: string): Promise<void> {
    const r = await fetch(`${API_BASE}/api/notifications-hub/${encodeURIComponent(notifId)}/mark-read`, {
      method: "POST",
      headers: authHeaders(),
    });
    await jsonOrThrow(r);
  },

  async markAllRead(): Promise<void> {
    const r = await fetch(`${API_BASE}/api/notifications-hub/mark-all-read`, {
      method: "POST",
      headers: authHeaders(),
    });
    await jsonOrThrow(r);
  },

  // ── Préférences ──────────────────────────────────────────────
  async getPreferences(): Promise<PreferencesResponse> {
    const r = await fetch(`${API_BASE}/api/notifications-hub/preferences`, { headers: authHeaders() });
    const j = await jsonOrThrow<{ ok: boolean; data: PreferencesResponse }>(r);
    return j.data;
  },

  async setPreference(eventType: HubEventType, channel: HubChannel, enabled: boolean): Promise<void> {
    const r = await fetch(`${API_BASE}/api/notifications-hub/preferences`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ eventType, channel, enabled }),
    });
    await jsonOrThrow(r);
  },

  async setLang(lang: HubLang): Promise<void> {
    const r = await fetch(`${API_BASE}/api/notifications-hub/preferences/lang`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ lang }),
    });
    await jsonOrThrow(r);
  },

  // ── Web Push ──────────────────────────────────────────────────
  async vapidPublicKey(): Promise<string | null> {
    try {
      const r = await fetch(`${API_BASE}/api/notifications-hub/push/vapid-public-key`, { headers: authHeaders() });
      const j = await jsonOrThrow<{ ok: boolean; data: { publicKey: string | null } }>(r);
      return j.data?.publicKey || null;
    } catch {
      return null;
    }
  },

  async subscribePush(subscription: PushSubscriptionJSON): Promise<void> {
    const r = await fetch(`${API_BASE}/api/notifications-hub/push/subscribe`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ subscription }),
    });
    await jsonOrThrow(r);
  },

  async unsubscribePush(endpoint: string): Promise<void> {
    const r = await fetch(`${API_BASE}/api/notifications-hub/push/unsubscribe`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ endpoint }),
    });
    await jsonOrThrow(r);
  },
};

// ── Web Push helpers (browser-side) ────────────────────────────

/** Convertit la VAPID public key base64-url en Uint8Array attendu par pushManager. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Tente de souscrire l'utilisateur aux notifications push.
 * - Demande la permission (no-op si déjà accordée/refusée)
 * - Récupère la clé VAPID publique
 * - Souscrit via `pushManager` du service worker existant
 * - Pousse la subscription au backend
 *
 * Retourne `true` si abouti, `false` sinon (silent).
 */
export async function ensurePushSubscription(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await notificationsHubApi.subscribePush(existing.toJSON() as PushSubscriptionJSON);
      return true;
    }
    const vapid = await notificationsHubApi.vapidPublicKey();
    if (!vapid) return false;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    });
    await notificationsHubApi.subscribePush(sub.toJSON() as PushSubscriptionJSON);
    return true;
  } catch (e) {
    // silent — l'utilisateur peut avoir bloqué, ou navigateur non compatible
    // eslint-disable-next-line no-console
    console.warn("[NotificationsHub] subscribePush failed:", e);
    return false;
  }
}

/** Désabonne l'utilisateur des push (révoque sub navigateur + serveur). */
export async function disablePushSubscription(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await notificationsHubApi.unsubscribePush(sub.endpoint);
      await sub.unsubscribe().catch(() => undefined);
    }
  } catch {
    // silent
  }
}
