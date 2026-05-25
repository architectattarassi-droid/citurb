/**
 * dossier-interactions.types.ts
 *
 * Types canoniques du fil d'interactions Dossier (Tome 6).
 *
 * Modèle conçu pour matcher 1:1 la proposition Prisma `DossierInteraction`
 * (voir INTEGRATION.md). En attendant la migration Prisma, la persistence est
 * faite dans `Dossier.payload.interactions[]` (compat sans casser la prod).
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

/**
 * Une interaction (row du fil) — shape stable, partagé front/back.
 */
export type DossierInteraction = {
  /** ID stable (cuid-like) */
  id: string;
  dossierId: string;
  /** Pour réponses en thread (peut être null) */
  parentId?: string | null;
  authorUserId: string;
  authorRole: string;
  type: InteractionType;
  /** Markdown libre. Anti-désint scan s'applique dessus. */
  contentMD: string;
  attachments: InteractionAttachment[];
  /** userIds explicitement mentionnés (@name) */
  mentions: string[];
  /** Métadonnées libres selon type (ex: STATUS_CHANGE = { from, to }) */
  metadata: Record<string, unknown>;
  reactions: InteractionReaction[];
  isPinned: boolean;
  visibility: InteractionVisibility;
  createdAt: string; // ISO
  editedAt?: string | null;
  deletedAt?: string | null; // soft-delete
  /** Liste des userIds ayant marqué cette interaction comme lue */
  readBy: string[];
};

export type CreateInteractionInput = {
  type?: InteractionType;
  contentMD: string;
  parentId?: string | null;
  mentions?: string[];
  attachments?: InteractionAttachment[];
  visibility?: InteractionVisibility;
  metadata?: Record<string, unknown>;
};

export type TimelinePage = {
  items: DossierInteraction[];
  nextCursor: string | null;
};

/** Allow-list emojis rapides (UX commande) — refusés sinon. */
export const FAST_EMOJIS = ["👍", "❤️", "🎉", "🤔", "⚠️"] as const;
export type FastEmoji = typeof FAST_EMOJIS[number];

/** Durée d'édition autorisée pour l'auteur après création. */
export const EDIT_WINDOW_MS = 15 * 60 * 1000;
