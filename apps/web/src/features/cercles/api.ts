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
};
