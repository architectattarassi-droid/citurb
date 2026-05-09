/**
 * apps/web/src/features/cercles/api.ts
 *
 * Client API REST pour le module Cercles. Réutilise le helper apiFetch
 * existant (qui gère JWT + erreurs).
 */

import { apiFetch, apiBase, getToken } from "../../tomes/tome4/apiClient";

export type CercleVisibility = "PUBLIC" | "MEMBERS_ONLY" | "PRIVATE";
export type CercleRole = "MEMBER" | "CONTRIBUTOR" | "MODERATOR" | "OWNER";
export type MembershipStatus = "PENDING_REQUEST" | "PENDING_INVITE" | "ACTIVE" | "BANNED" | "LEFT";
export type RoomStatus = "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";

export type CercleListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: CercleVisibility;
  region: string | null;
  themes: string[];
  ownerId: string;
  firmId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { members: number; posts: number; rooms: number };
  members: { role: CercleRole; status: MembershipStatus }[];
};

export type CercleDetail = CercleListItem & {
  owner: { id: string; email: string; username: string | null };
};

export type CerclePost = {
  id: string;
  cercleId: string;
  authorId: string;
  author: { id: string; email: string; username: string | null };
  title: string | null;
  body: string;
  parentId: string | null;
  upvotes: number;
  replyCount: number;
  isPinned: boolean;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  attachments?: { id: string; filename: string; mimeType: string; sizeBytes: number; fileKey: string }[];
  replies?: CerclePost[];
};

export type RoomProvider = "LIVEKIT" | "JITSI";

export type LiveRoom = {
  id: string;
  cercleId: string;
  hostId: string;
  host: { id: string; email: string; username: string | null };
  slug: string;
  title: string;
  description: string | null;
  provider: RoomProvider;
  livekitRoomName: string;
  jitsiRoomName: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  maxParticipants: number;
  isRecording: boolean;
  isLiveBroadcast: boolean;
  status: RoomStatus;
  recordingUrl: string | null;
};

export type JoinRoomLivekitResponse = {
  provider: "LIVEKIT";
  token: string;
  wsUrl: string;
  roomName: string;
  role: "host" | "speaker" | "viewer";
};
export type JoinRoomJitsiResponse = {
  provider: "JITSI";
  role: "host" | "speaker" | "viewer";
  mode: "jaas" | "public";
  domain: string;
  roomName: string;
  jwt?: string;
  appId?: string;
  parentNodeId: string;
};
export type JoinRoomResponse = JoinRoomLivekitResponse | JoinRoomJitsiResponse;

// ── Invitations email (Sprint F2) ──

export type InviteResultItem = {
  email: string;
  status: "sent" | "link" | "already-member" | "failed";
  link: string;
  error?: string;
};
export type InvitePreview = {
  email: string;
  message: string | null;
  expiresAt: string;
  cercle: { id: string; slug: string; name: string; description: string | null };
  invitedBy: { id: string; email: string; username: string | null };
};

// ── Annuaire / Feed types ──

export type ProMetier =
  | "ARCHITECTE" | "BET_STRUCTURE" | "BET_FLUIDES" | "BET_VRD"
  | "TOPOGRAPHE" | "GEOMETRE" | "CONTROLE_TECHNIQUE" | "LABORATOIRE"
  | "ENTREPRISE_GO" | "ENTREPRISE_SECOND_OEUVRE" | "FOURNISSEUR_MATERIAUX"
  | "PROMOTEUR" | "MOA_PUBLIQUE" | "MOA_PRIVEE" | "ARTISAN_QUALIFIE";

export type ProClasseBTP = "CL1" | "CL2" | "CL3" | "CL4" | "CL5" | "HC";

export type ProProfile = {
  id: string;
  userId: string;
  displayName: string;
  title: string | null;
  bio: string | null;
  avatarUrl: string | null;
  metier: ProMetier;
  classeBTP: ProClasseBTP | null;
  agrements: string[];
  specialites: string[];
  regions: string[];
  villePrincipale: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  phonePublic: string | null;
  emailPublic: string | null;
  isVerified: boolean;
  connectionsCount: number;
  user?: { id: string; email: string; username: string | null };
};

export type FeedResponse = {
  posts: (CerclePost & { cercle: { id: string; slug: string; name: string } })[];
  liveRooms: LiveRoom[];
  myCercleIds: string[];
};

export type AnnuaireFacets = {
  total: number;
  metiers: { name: string; count: number }[];
  classesBTP: { name: string; count: number }[];
  verified: { name: string; count: number }[];
};

export const cerclesApi = {
  // Cercles
  list: (page = 1, pageSize = 20) =>
    apiFetch<{ ok: boolean; data: CercleListItem[]; meta: { page: number; pageSize: number; total: number } }>(
      `/api/cercles?page=${page}&pageSize=${pageSize}`,
    ),
  detail: (slug: string) =>
    apiFetch<{ ok: boolean; data: CercleDetail }>(`/api/cercles/${encodeURIComponent(slug)}`),
  create: (input: { name: string; description?: string; visibility?: CercleVisibility; region?: string; themes?: string[] }) =>
    apiFetch<{ ok: boolean; data: CercleDetail }>(`/api/cercles`, { method: "POST", body: input }),
  update: (id: string, patch: Partial<{ name: string; description: string; visibility: CercleVisibility; region: string; themes: string[] }>) =>
    apiFetch<{ ok: boolean; data: CercleDetail }>(`/api/cercles/${id}`, { method: "PATCH", body: patch }),

  // Memberships
  join: (cercleId: string) => apiFetch(`/api/cercles/${cercleId}/join`, { method: "POST", body: {} }),
  leave: (cercleId: string) => apiFetch(`/api/cercles/${cercleId}/leave`, { method: "POST", body: {} }),
  invite: (cercleId: string, userId: string, role?: CercleRole) =>
    apiFetch(`/api/cercles/${cercleId}/invitations`, { method: "POST", body: { userId, role } }),
  members: (cercleId: string) =>
    apiFetch<{ ok: boolean; data: any[] }>(`/api/cercles/${cercleId}/members`),

  // Posts
  listPosts: (cercleId: string, page = 1, pageSize = 20) =>
    apiFetch<{ ok: boolean; data: CerclePost[]; meta: { page: number; pageSize: number; total: number } }>(
      `/api/cercles/${cercleId}/posts?page=${page}&pageSize=${pageSize}`,
    ),
  postDetail: (cercleId: string, postId: string) =>
    apiFetch<{ ok: boolean; data: CerclePost }>(`/api/cercles/${cercleId}/posts/${postId}`),
  createPost: (cercleId: string, body: { title?: string; body: string }) =>
    apiFetch<{ ok: boolean; data: CerclePost }>(`/api/cercles/${cercleId}/posts`, { method: "POST", body }),
  reply: (cercleId: string, postId: string, body: string) =>
    apiFetch<{ ok: boolean; data: CerclePost }>(`/api/cercles/${cercleId}/posts/${postId}/replies`, { method: "POST", body: { body } }),
  upvote: (cercleId: string, postId: string) =>
    apiFetch(`/api/cercles/${cercleId}/posts/${postId}/upvote`, { method: "POST", body: {} }),
  pin: (cercleId: string, postId: string, pinned: boolean) =>
    apiFetch(`/api/cercles/${cercleId}/posts/${postId}/pin`, { method: "POST", body: { pinned } }),

  // Rooms
  listRooms: (cercleId: string) =>
    apiFetch<{ ok: boolean; data: LiveRoom[] }>(`/api/cercles/${cercleId}/rooms`),
  createRoom: (cercleId: string, body: { title: string; description?: string; scheduledAt?: string; maxParticipants?: number; provider?: RoomProvider }) =>
    apiFetch<{ ok: boolean; data: LiveRoom }>(`/api/cercles/${cercleId}/rooms`, { method: "POST", body }),
  startRoom: (cercleId: string, roomId: string) =>
    apiFetch<{ ok: boolean; data: LiveRoom }>(`/api/cercles/${cercleId}/rooms/${roomId}/start`, { method: "POST", body: {} }),
  endRoom: (cercleId: string, roomId: string) =>
    apiFetch<{ ok: boolean; data: LiveRoom }>(`/api/cercles/${cercleId}/rooms/${roomId}/end`, { method: "POST", body: {} }),
  joinRoom: (cercleId: string, roomId: string) =>
    apiFetch<{ ok: boolean; data: JoinRoomResponse }>(`/api/cercles/${cercleId}/rooms/${roomId}/join`, { method: "POST", body: {} }),

  // Feed (D2)
  feed: () => apiFetch<{ ok: boolean; data: FeedResponse }>(`/api/cercles/feed`),
  discovery: () => apiFetch<{ ok: boolean; data: CercleListItem[] }>(`/api/cercles/discovery`),

  // Annuaire (D1)
  annuaireFacets: () => apiFetch<{ ok: boolean; data: AnnuaireFacets }>(`/api/cercles/annuaire/facets`),
  annuaireSearch: (params: { q?: string; metier?: string; classeBTP?: string; region?: string; specialite?: string; verified?: boolean; page?: number; pageSize?: number }) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") sp.append(k, String(v)); });
    return apiFetch<{ ok: boolean; data: ProProfile[]; meta: { page: number; pageSize: number; total: number } }>(`/api/cercles/annuaire/search?${sp.toString()}`);
  },
  annuaireSuggestions: () => apiFetch<{ ok: boolean; data: ProProfile[] }>(`/api/cercles/annuaire/suggestions`),
  myProfile: () => apiFetch<{ ok: boolean; data: ProProfile | null }>(`/api/cercles/me/profile`),
  upsertMyProfile: (input: any) => apiFetch<{ ok: boolean; data: ProProfile }>(`/api/cercles/me/profile`, { method: "POST", body: input }),
  publicProfile: (userIdOrId: string) => apiFetch<{ ok: boolean; data: ProProfile }>(`/api/cercles/profile/${userIdOrId}`),

  // Connections
  sendConnection: (toUserId: string, message?: string) => apiFetch(`/api/cercles/connections/${toUserId}`, { method: "POST", body: { message } }),
  acceptConnection: (fromUserId: string) => apiFetch(`/api/cercles/connections/${fromUserId}/accept`, { method: "POST", body: {} }),
  rejectConnection: (fromUserId: string) => apiFetch(`/api/cercles/connections/${fromUserId}/reject`, { method: "POST", body: {} }),
  connections: () => apiFetch<{ ok: boolean; data: any[] }>(`/api/cercles/connections`),
  pendingConnections: () => apiFetch<{ ok: boolean; data: any[] }>(`/api/cercles/connections/pending`),
};

// ── Chat (Sprint E1-E3) ──────────────────────────────────────────

export type AttachmentType = "IMAGE" | "VIDEO" | "AUDIO" | "FILE";

export type MessageAttachment = {
  id: string;
  type: AttachmentType;
  fileKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  posterKey: string | null;
};

export type ChatMessage = {
  id: string;
  cercleId: string;
  authorId: string;
  author: { id: string; email: string; username: string | null };
  body: string;
  replyToId: string | null;
  replyTo: {
    id: string;
    body: string;
    authorId: string;
    deletedAt: string | null;
    author: { id: string; email: string; username: string | null };
  } | null;
  attachments: MessageAttachment[];
  reactions: { id: string; userId: string; emoji: string }[];
  reads: { userId: string; readAt: string }[];
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  _count?: { replies: number };
};

export type UploadResult = {
  type: AttachmentType;
  fileKey: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export const messagesApi = {
  list: (cercleId: string, opts?: { beforeId?: string; take?: number }) => {
    const sp = new URLSearchParams();
    if (opts?.beforeId) sp.append("beforeId", opts.beforeId);
    if (opts?.take) sp.append("take", String(opts.take));
    const qs = sp.toString();
    return apiFetch<{ ok: boolean; data: ChatMessage[]; meta: { hasMore: boolean; oldestId: string | null } }>(
      `/api/cercles/${cercleId}/messages${qs ? "?" + qs : ""}`,
    );
  },

  send: (cercleId: string, body: { body: string; replyToId?: string; attachments?: any[] }) =>
    apiFetch<{ ok: boolean; data: ChatMessage; mentions: string[] }>(
      `/api/cercles/${cercleId}/messages`,
      { method: "POST", body },
    ),

  edit: (cercleId: string, messageId: string, body: string) =>
    apiFetch<{ ok: boolean; data: ChatMessage }>(
      `/api/cercles/${cercleId}/messages/${messageId}`,
      { method: "PATCH", body: { body } },
    ),

  remove: (cercleId: string, messageId: string) =>
    apiFetch<{ ok: boolean; data: { id: string; deleted: true } }>(
      `/api/cercles/${cercleId}/messages/${messageId}`,
      { method: "DELETE" },
    ),

  react: (cercleId: string, messageId: string, emoji: string) =>
    apiFetch<{ ok: boolean; data: { messageId: string; reactions: any[]; action: "added" | "removed" } }>(
      `/api/cercles/${cercleId}/messages/${messageId}/reactions`,
      { method: "POST", body: { emoji } },
    ),

  markRead: (cercleId: string, upToMessageId: string) =>
    apiFetch<{ ok: boolean; data: { count: number } }>(
      `/api/cercles/${cercleId}/messages/read`,
      { method: "POST", body: { upToMessageId } },
    ),

  search: (cercleId: string, q: string) =>
    apiFetch<{ ok: boolean; data: ChatMessage[] }>(
      `/api/cercles/${cercleId}/messages/search?q=${encodeURIComponent(q)}`,
    ),

  typing: (cercleId: string, isTyping: boolean) =>
    apiFetch<{ ok: boolean }>(
      `/api/cercles/${cercleId}/messages/typing`,
      { method: "POST", body: { isTyping } },
    ),

  /** Upload multipart (XMLHttpRequest pour suivre la progression). */
  upload: (
    cercleId: string,
    files: File[],
    onProgress?: (pct: number) => void,
  ): Promise<UploadResult[]> => {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${apiBase()}/api/cercles/${cercleId}/messages/upload`);
      const tok = getToken();
      if (tok) xhr.setRequestHeader("Authorization", `Bearer ${tok}`);
      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        try {
          const j = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && j.ok) resolve(j.data as UploadResult[]);
          else reject(new Error(j?.message || `Upload échoué (${xhr.status})`));
        } catch (err) {
          reject(new Error("Réponse upload invalide"));
        }
      };
      xhr.onerror = () => reject(new Error("Erreur réseau upload"));
      xhr.send(fd);
    });
  },

  /** URL absolue d'un fichier servi par /uploads/<fileKey>. */
  fileUrl: (fileKey: string) => `${apiBase()}/uploads/${fileKey}`,

  /** URL EventSource (SSE) pour le stream d'un cercle. */
  streamUrl: (cercleId: string) => {
    const tok = getToken() || "";
    return `${apiBase()}/api/cercles/${cercleId}/messages/stream?access_token=${encodeURIComponent(tok)}`;
  },
};

// ── Invitations API (Sprint F2) ──

export const invitationsApi = {
  inviteByEmail: (cercleId: string, emails: string[], message?: string) =>
    apiFetch<{ ok: boolean; data: { sent: number; links: number; failed: number; results: InviteResultItem[] } }>(
      `/api/cercles/${cercleId}/invite-email`,
      { method: "POST", body: { emails, message } },
    ),

  list: (cercleId: string) =>
    apiFetch<{ ok: boolean; data: any[] }>(`/api/cercles/${cercleId}/invitations`),

  lookup: (token: string) =>
    apiFetch<{ ok: boolean; data: InvitePreview; error?: string }>(`/api/cercles/invitations/lookup?token=${encodeURIComponent(token)}`),

  signup: (input: {
    token: string;
    password: string;
    displayName: string;
    metier?: string;
    title?: string;
    villePrincipale?: string;
    phonePublic?: string;
  }) =>
    apiFetch<{ ok: boolean; data: { userId: string; cercleSlug: string; email: string; access_token: string } }>(
      `/api/cercles/invitations/signup`,
      { method: "POST", body: input },
    ),
};
