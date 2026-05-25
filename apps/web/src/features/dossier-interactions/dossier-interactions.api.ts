/**
 * dossier-interactions.api.ts
 *
 * Client API du fil d'interactions Dossier (front).
 * - cursor-based pagination
 * - upload multipart (FormData) pour fichiers + notes audio
 * - JWT depuis localStorage (clé canonique `cit:auth:jwt`, fallback `token`)
 */

export type InteractionType =
  | "COMMENT"
  | "FILE_UPLOADED"
  | "STATUS_CHANGE"
  | "PHASE_COMPLETED"
  | "PAYMENT_RECEIVED"
  | "SIGNATURE"
  | "MENTION"
  | "AUDIO_NOTE"
  | "DECISION";

export type InteractionVisibility = "PUBLIC" | "INTERNE_OPS" | "PRIVATE";

export type InteractionAttachment = {
  url: string;
  mime: string;
  size: number;
  filename: string;
};

export type InteractionReaction = {
  emoji: string;
  userIds: string[];
};

export type DossierInteraction = {
  id: string;
  dossierId: string;
  parentId?: string | null;
  authorUserId: string;
  authorRole: string;
  type: InteractionType;
  contentMD: string;
  attachments: InteractionAttachment[];
  mentions: string[];
  metadata: Record<string, unknown>;
  reactions: InteractionReaction[];
  isPinned: boolean;
  visibility: InteractionVisibility;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  readBy: string[];
  /** présent uniquement dans /me/mentions */
  dossierTitle?: string;
};

export type TimelinePage = {
  items: DossierInteraction[];
  nextCursor: string | null;
};

const API_BASE = (typeof window !== "undefined" && (window as any).__API_BASE__) || "";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem("cit:auth:jwt") ||
    window.localStorage.getItem("token") ||
    null
  );
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const t = getToken();
  return {
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

export const dossierInteractionsApi = {
  async list(dossierId: string, cursor?: string, limit = 20): Promise<TimelinePage> {
    const qs = new URLSearchParams();
    if (cursor) qs.set("cursor", cursor);
    qs.set("limit", String(limit));
    const r = await fetch(`${API_BASE}/api/dossier/${encodeURIComponent(dossierId)}/timeline?${qs}`, {
      headers: authHeaders(),
    });
    const data = await jsonOrThrow<{ ok: boolean; items: DossierInteraction[]; nextCursor: string | null }>(r);
    return { items: data.items, nextCursor: data.nextCursor };
  },

  /**
   * Create — supporte JSON simple ou multipart (avec files[] + audio note).
   */
  async create(
    dossierId: string,
    input: {
      contentMD: string;
      type?: InteractionType;
      parentId?: string | null;
      mentions?: string[];
      visibility?: InteractionVisibility;
      metadata?: Record<string, unknown>;
      files?: File[];
      audioBlob?: Blob | null;
    },
  ): Promise<DossierInteraction> {
    const url = `${API_BASE}/api/dossier/${encodeURIComponent(dossierId)}/timeline`;

    const hasFiles = (input.files && input.files.length > 0) || !!input.audioBlob;
    if (!hasFiles) {
      const r = await fetch(url, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          contentMD: input.contentMD,
          type: input.type,
          parentId: input.parentId ?? null,
          mentions: input.mentions ?? [],
          visibility: input.visibility ?? "PUBLIC",
          metadata: input.metadata ?? {},
        }),
      });
      const data = await jsonOrThrow<{ ok: boolean; item: DossierInteraction }>(r);
      return data.item;
    }

    const fd = new FormData();
    fd.append("contentMD", input.contentMD);
    if (input.type) fd.append("type", input.type);
    if (input.parentId) fd.append("parentId", input.parentId);
    fd.append("mentions", JSON.stringify(input.mentions ?? []));
    fd.append("visibility", input.visibility ?? "PUBLIC");
    fd.append("metadata", JSON.stringify(input.metadata ?? {}));
    for (const f of input.files ?? []) fd.append("files", f, f.name);
    if (input.audioBlob) {
      const filename = `audio-${Date.now()}.webm`;
      fd.append("files", input.audioBlob, filename);
    }

    const r = await fetch(url, {
      method: "POST",
      headers: authHeaders(), // pas de Content-Type → boundary auto par fetch
      body: fd,
    });
    const data = await jsonOrThrow<{ ok: boolean; item: DossierInteraction }>(r);
    return data.item;
  },

  async edit(dossierId: string, id: string, patch: { contentMD?: string; mentions?: string[] }): Promise<DossierInteraction> {
    const r = await fetch(`${API_BASE}/api/dossier/${encodeURIComponent(dossierId)}/timeline/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(patch),
    });
    const data = await jsonOrThrow<{ ok: boolean; item: DossierInteraction }>(r);
    return data.item;
  },

  async remove(dossierId: string, id: string): Promise<void> {
    const r = await fetch(`${API_BASE}/api/dossier/${encodeURIComponent(dossierId)}/timeline/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await jsonOrThrow<{ ok: true }>(r);
  },

  async react(dossierId: string, id: string, emoji: string): Promise<DossierInteraction> {
    const r = await fetch(`${API_BASE}/api/dossier/${encodeURIComponent(dossierId)}/timeline/${encodeURIComponent(id)}/react`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ emoji }),
    });
    const data = await jsonOrThrow<{ ok: boolean; item: DossierInteraction }>(r);
    return data.item;
  },

  async pin(dossierId: string, id: string, pinned: boolean): Promise<DossierInteraction> {
    const r = await fetch(`${API_BASE}/api/dossier/${encodeURIComponent(dossierId)}/timeline/${encodeURIComponent(id)}/pin`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ pinned }),
    });
    const data = await jsonOrThrow<{ ok: boolean; item: DossierInteraction }>(r);
    return data.item;
  },

  async markRead(dossierId: string, id: string): Promise<void> {
    const r = await fetch(`${API_BASE}/api/dossier/${encodeURIComponent(dossierId)}/timeline/${encodeURIComponent(id)}/mark-read`, {
      method: "POST",
      headers: authHeaders(),
    });
    await jsonOrThrow<{ ok: true }>(r);
  },

  async myMentions(opts: { unread?: boolean; limit?: number } = {}): Promise<{ items: DossierInteraction[]; count: number }> {
    const qs = new URLSearchParams();
    if (opts.unread) qs.set("unread", "true");
    if (opts.limit) qs.set("limit", String(opts.limit));
    const r = await fetch(`${API_BASE}/api/me/mentions?${qs}`, { headers: authHeaders() });
    return jsonOrThrow<{ ok: boolean; items: DossierInteraction[]; count: number }>(r).then(d => ({ items: d.items, count: d.count }));
  },
};

export const FAST_EMOJIS = ["👍", "❤️", "🎉", "🤔", "⚠️"] as const;
