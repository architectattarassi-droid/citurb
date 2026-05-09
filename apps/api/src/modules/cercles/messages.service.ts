import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { CerclesService } from "./cercles.service";
import { MessagesStreamService } from "./messages-stream.service";

/**
 * MessagesService — Sprint E1-E3
 *
 * Chat temps réel par cercle (style WhatsApp/Messenger groupe) :
 *  - send / edit / delete soft / list cursor-based
 *  - reply 1 niveau, attachements (image/vidéo/audio/file)
 *  - réactions emoji whitelisted, lecture (✓✓), recherche
 *  - mentions @user parsées serveur (renvoie ids dans la payload)
 *
 * Diffusion : à chaque mutation, push event au stream pour SSE.
 */

export type SendMessageInput = {
  body: string;
  replyToId?: string;
  attachments?: Array<{
    type: "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
    fileKey: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    durationSec?: number;
    posterKey?: string;
  }>;
};

export type ListMessagesOpts = {
  beforeId?: string; // pagination cursor (récupère les plus anciens)
  take?: number; // 1..100
};

const REACTION_WHITELIST = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const MAX_BODY_LEN = 4000;
const MENTION_RE = /(?:^|\s)@([a-zA-Z0-9_.-]{2,32})/g;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cercles: CerclesService,
    private readonly stream: MessagesStreamService,
  ) {}

  // ── List ───────────────────────────────────────────────────────

  async list(cercleId: string, userId: string, opts: ListMessagesOpts = {}) {
    await this.cercles.assertMember(cercleId, userId);
    const take = Math.min(100, Math.max(1, opts.take ?? 40));

    let cursorAt: Date | undefined;
    if (opts.beforeId) {
      const cursor = await this.prisma.cercleMessage.findUnique({
        where: { id: opts.beforeId },
        select: { createdAt: true, cercleId: true },
      });
      if (cursor && cursor.cercleId === cercleId) cursorAt = cursor.createdAt;
    }

    const messages = await this.prisma.cercleMessage.findMany({
      where: {
        cercleId,
        deletedAt: null,
        ...(cursorAt ? { createdAt: { lt: cursorAt } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        author: { select: { id: true, username: true, email: true } },
        attachments: true,
        reactions: { select: { id: true, userId: true, emoji: true } },
        reads: { select: { userId: true, readAt: true } },
        replyTo: {
          select: {
            id: true,
            body: true,
            authorId: true,
            deletedAt: true,
            author: { select: { id: true, username: true, email: true } },
          },
        },
        _count: { select: { replies: true } },
      },
    });

    return {
      data: messages.reverse(), // ordre chronologique ASC pour le client
      meta: {
        hasMore: messages.length === take,
        oldestId: messages[0]?.id ?? null,
      },
    };
  }

  // ── Send ───────────────────────────────────────────────────────

  async send(cercleId: string, authorId: string, input: SendMessageInput) {
    await this.cercles.assertMember(cercleId, authorId);
    const body = (input.body ?? "").trim();
    if (!body && !(input.attachments && input.attachments.length > 0)) {
      throw new BadRequestException("Message vide");
    }
    if (body.length > MAX_BODY_LEN) {
      throw new BadRequestException(`Message trop long (>${MAX_BODY_LEN} caractères)`);
    }

    if (input.replyToId) {
      const parent = await this.prisma.cercleMessage.findUnique({
        where: { id: input.replyToId },
        select: { cercleId: true, deletedAt: true },
      });
      if (!parent || parent.cercleId !== cercleId || parent.deletedAt) {
        throw new BadRequestException("Message parent introuvable");
      }
    }

    const created = await this.prisma.cercleMessage.create({
      data: {
        cercleId,
        authorId,
        body,
        replyToId: input.replyToId ?? null,
        attachments: input.attachments && input.attachments.length > 0
          ? {
              create: input.attachments.map((a) => ({
                type: a.type,
                fileKey: a.fileKey,
                filename: a.filename,
                mimeType: a.mimeType,
                sizeBytes: a.sizeBytes,
                width: a.width ?? null,
                height: a.height ?? null,
                durationSec: a.durationSec ?? null,
                posterKey: a.posterKey ?? null,
              })),
            }
          : undefined,
      },
      include: {
        author: { select: { id: true, username: true, email: true } },
        attachments: true,
        reactions: true,
        reads: true,
        replyTo: {
          select: {
            id: true,
            body: true,
            authorId: true,
            deletedAt: true,
            author: { select: { id: true, username: true, email: true } },
          },
        },
      },
    });

    this.stream.publish(cercleId, { type: "message:new", payload: created });
    return { data: created, mentions: this.extractMentions(body) };
  }

  // ── Edit / Delete ──────────────────────────────────────────────

  async edit(cercleId: string, messageId: string, userId: string, body: string) {
    const msg = await this.prisma.cercleMessage.findUnique({
      where: { id: messageId },
      select: { cercleId: true, authorId: true, deletedAt: true },
    });
    if (!msg || msg.cercleId !== cercleId || msg.deletedAt) {
      throw new NotFoundException("Message introuvable");
    }
    if (msg.authorId !== userId) throw new ForbiddenException("Auteur uniquement");
    const trimmed = (body ?? "").trim();
    if (!trimmed) throw new BadRequestException("Corps requis");
    if (trimmed.length > MAX_BODY_LEN) throw new BadRequestException("Trop long");

    const updated = await this.prisma.cercleMessage.update({
      where: { id: messageId },
      data: { body: trimmed, editedAt: new Date() },
      include: { attachments: true },
    });
    this.stream.publish(cercleId, { type: "message:edit", payload: updated });
    return updated;
  }

  async softDelete(cercleId: string, messageId: string, userId: string) {
    const msg = await this.prisma.cercleMessage.findUnique({
      where: { id: messageId },
      select: { cercleId: true, authorId: true, deletedAt: true },
    });
    if (!msg || msg.cercleId !== cercleId || msg.deletedAt) {
      throw new NotFoundException("Message introuvable");
    }
    const isAuthor = msg.authorId === userId;
    const isMod = await this.cercles.isModerator(cercleId, userId);
    if (!isAuthor && !isMod) throw new ForbiddenException("Auteur ou modérateur uniquement");

    await this.prisma.cercleMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), body: "" },
    });
    this.stream.publish(cercleId, { type: "message:delete", payload: { id: messageId } });
    return { id: messageId, deleted: true };
  }

  // ── Reactions ──────────────────────────────────────────────────

  async toggleReaction(cercleId: string, messageId: string, userId: string, emoji: string) {
    if (!REACTION_WHITELIST.includes(emoji)) {
      throw new BadRequestException("Emoji non autorisé");
    }
    const msg = await this.prisma.cercleMessage.findUnique({
      where: { id: messageId },
      select: { cercleId: true, deletedAt: true },
    });
    if (!msg || msg.cercleId !== cercleId || msg.deletedAt) {
      throw new NotFoundException("Message introuvable");
    }
    await this.cercles.assertMember(cercleId, userId);

    const existing = await this.prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });
    let action: "added" | "removed";
    if (existing) {
      await this.prisma.messageReaction.delete({ where: { id: existing.id } });
      action = "removed";
    } else {
      await this.prisma.messageReaction.create({
        data: { messageId, userId, emoji },
      });
      action = "added";
    }

    const reactions = await this.prisma.messageReaction.findMany({
      where: { messageId },
      select: { id: true, userId: true, emoji: true },
    });
    this.stream.publish(cercleId, {
      type: "message:reaction",
      payload: { messageId, reactions, action, userId, emoji },
    });
    return { messageId, reactions, action };
  }

  // ── Read receipts ──────────────────────────────────────────────

  async markRead(cercleId: string, userId: string, upToMessageId: string) {
    await this.cercles.assertMember(cercleId, userId);
    const upTo = await this.prisma.cercleMessage.findUnique({
      where: { id: upToMessageId },
      select: { cercleId: true, createdAt: true },
    });
    if (!upTo || upTo.cercleId !== cercleId) {
      throw new NotFoundException("Message introuvable");
    }

    // Récupère tous les messages non lus jusqu'à ce point (sauf les siens)
    const unread = await this.prisma.cercleMessage.findMany({
      where: {
        cercleId,
        deletedAt: null,
        createdAt: { lte: upTo.createdAt },
        authorId: { not: userId },
        reads: { none: { userId } },
      },
      select: { id: true },
    });
    if (unread.length === 0) return { count: 0 };

    await this.prisma.messageRead.createMany({
      data: unread.map((m) => ({ messageId: m.id, userId })),
      skipDuplicates: true,
    });

    this.stream.publish(cercleId, {
      type: "message:read",
      payload: { userId, messageIds: unread.map((m) => m.id), readAt: new Date() },
    });
    return { count: unread.length };
  }

  // ── Search ─────────────────────────────────────────────────────

  async search(cercleId: string, userId: string, q: string, take = 30) {
    await this.cercles.assertMember(cercleId, userId);
    const term = (q ?? "").trim();
    if (term.length < 2) return { data: [] };
    const results = await this.prisma.cercleMessage.findMany({
      where: {
        cercleId,
        deletedAt: null,
        body: { contains: term, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(100, take),
      include: {
        author: { select: { id: true, username: true, email: true } },
        attachments: { select: { id: true, type: true, filename: true } },
      },
    });
    return { data: results };
  }

  // ── Mentions ───────────────────────────────────────────────────

  private extractMentions(body: string): string[] {
    const mentions = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = MENTION_RE.exec(body)) !== null) mentions.add(m[1]);
    return Array.from(mentions);
  }
}
