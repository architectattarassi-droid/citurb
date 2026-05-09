/**
 * apps/web/src/features/cercles/api.ts
 *
 * Client API REST pour le module Cercles. Réutilise le helper apiFetch
 * existant (qui gère JWT + erreurs).
 */

import { apiFetch } from "../../tomes/tome4/apiClient";

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

export type LiveRoom = {
  id: string;
  cercleId: string;
  hostId: string;
  host: { id: string; email: string; username: string | null };
  slug: string;
  title: string;
  description: string | null;
  livekitRoomName: string;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  maxParticipants: number;
  isRecording: boolean;
  isLiveBroadcast: boolean;
  status: RoomStatus;
  recordingUrl: string | null;
};

export type JoinRoomResponse = { token: string; wsUrl: string; roomName: string; role: "host" | "speaker" | "viewer" };

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
  createRoom: (cercleId: string, body: { title: string; description?: string; scheduledAt?: string; maxParticipants?: number }) =>
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
