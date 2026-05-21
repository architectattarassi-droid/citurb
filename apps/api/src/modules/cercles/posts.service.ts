import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { CerclesService } from "./cercles.service";

/**
 * PostsService — Sprint C2
 *
 * Posts root + replies (threading). Upvotes, pin, isResolved.
 * Soft delete préserve le thread (parent reste joignable).
 */
@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cercles: CerclesService,
  ) {}

  // Sanitize markdown léger : retire scripts (côté serveur, marge de sécurité).
  private sanitize(markdown: string): string {
    return markdown
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
      .replace(/on\w+="[^"]*"/gi, "");
  }

  async createRoot(cercleId: string | null, authorId: string, input: {
    title?: string;
    body: string;
    attachments?: Array<{ fileKey: string; filename: string; mimeType: string; sizeBytes: number }>;
  }) {
    if (!input.body?.trim() && (!input.attachments || input.attachments.length === 0)) {
      throw new BadRequestException("Post vide (texte ou pièce jointe requis)");
    }
    // cercleId null = post général (fil public) : aucun check membership, tout pro connecté peut poster
    if (cercleId) await this.cercles.assertMember(cercleId, authorId);
    return this.prisma.cerclePost.create({
      data: {
        cercleId,
        authorId,
        title: input.title?.trim() || null,
        body: this.sanitize((input.body || "").trim()),
        attachments: input.attachments && input.attachments.length > 0
          ? { create: input.attachments.map(a => ({
              fileKey: a.fileKey, filename: a.filename, mimeType: a.mimeType, sizeBytes: a.sizeBytes,
            })) }
          : undefined,
      },
      include: {
        author: { select: { id: true, email: true, username: true } },
        attachments: true,
      },
    });
  }

  async reply(postId: string, authorId: string, body: string) {
    if (!body?.trim()) throw new BadRequestException("Body vide");
    const parent = await this.prisma.cerclePost.findUniqueOrThrow({
      where: { id: postId },
      select: { cercleId: true, deletedAt: true },
    });
    if (parent.deletedAt) throw new BadRequestException("Post supprimé");
    if (parent.cercleId) await this.cercles.assertMember(parent.cercleId, authorId);
    const reply = await this.prisma.cerclePost.create({
      data: {
        cercleId: parent.cercleId,
        authorId,
        body: this.sanitize(body.trim()),
        parentId: postId,
      },
      include: { author: { select: { id: true, email: true, username: true } } },
    });
    // Bump replyCount du parent
    await this.prisma.cerclePost.update({ where: { id: postId }, data: { replyCount: { increment: 1 } } });
    return reply;
  }

  async list(cercleId: string, viewerId: string, opts: { page?: number; pageSize?: number } = {}) {
    await this.cercles.assertMember(cercleId, viewerId);
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));
    const where = { cercleId, parentId: null, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.cerclePost.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: { select: { id: true, email: true, username: true } },
          attachments: true,
          upvotedBy: { where: { userId: viewerId }, select: { id: true } },
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.cerclePost.count({ where }),
    ]);
    // Dérive liked flag pour chaque post
    const enriched = data.map((p) => ({
      ...p,
      liked: (p.upvotedBy?.length || 0) > 0,
    }));
    return { data: enriched, meta: { page, pageSize, total } };
  }

  async detail(postId: string, viewerId: string) {
    const post = await this.prisma.cerclePost.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, email: true, username: true } },
        attachments: true,
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, email: true, username: true } },
            attachments: true,
            // 2 niveaux de threading max
            replies: {
              where: { deletedAt: null },
              orderBy: { createdAt: "asc" },
              include: { author: { select: { id: true, email: true, username: true } } },
            },
          },
        },
      },
    });
    if (!post || post.deletedAt) throw new NotFoundException("Post introuvable");
    if (post.cercleId) await this.cercles.assertMember(post.cercleId, viewerId);
    return post;
  }

  async edit(postId: string, userId: string, input: { title?: string; body?: string }) {
    const post = await this.prisma.cerclePost.findUniqueOrThrow({ where: { id: postId } });
    if (post.deletedAt) throw new BadRequestException("Post supprimé");
    const isAuthor = post.authorId === userId;
    const isMod = post.cercleId ? await this.cercles.isModerator(post.cercleId, userId) : false;
    if (!isAuthor && !isMod) throw new ForbiddenException("Auteur ou modérateur requis");
    const data: any = {};
    if (input.title !== undefined) data.title = input.title?.trim() || null;
    if (input.body !== undefined) {
      if (!input.body.trim()) throw new BadRequestException("Body vide");
      data.body = this.sanitize(input.body.trim());
    }
    return this.prisma.cerclePost.update({ where: { id: postId }, data });
  }

  async softDelete(postId: string, userId: string, viewerRole?: string) {
    const post = await this.prisma.cerclePost.findUniqueOrThrow({ where: { id: postId } });
    const isAuthor = post.authorId === userId;
    const isMod = post.cercleId ? await this.cercles.isModerator(post.cercleId, userId) : false;
    const isAdmin = viewerRole === "ADMIN" || viewerRole === "OWNER" || viewerRole === "OPS";
    if (!isAuthor && !isMod && !isAdmin) {
      throw new ForbiddenException("Suppression réservée à l'auteur, à un modérateur ou à un administrateur");
    }
    await this.prisma.cerclePost.update({ where: { id: postId }, data: { deletedAt: new Date() } });
    if (post.parentId) {
      try {
        await this.prisma.cerclePost.update({
          where: { id: post.parentId },
          data: { replyCount: { decrement: 1 } },
        });
      } catch { /* best effort */ }
    }
    return { ok: true };
  }

  /**
   * Upvote toggle. Si l'user a déjà liké → unlike (suppression + decrement).
   * Sinon → like (création + increment). Counter dénormalisé sur le post,
   * et tracking par user via PostUpvote.
   */
  async upvote(postId: string, userId: string) {
    const post = await this.prisma.cerclePost.findUniqueOrThrow({ where: { id: postId } });
    if (post.deletedAt) throw new BadRequestException("Post supprimé");
    if (post.cercleId) await this.cercles.assertMember(post.cercleId, userId);

    const existing = await this.prisma.postUpvote.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      const [, updated] = await this.prisma.$transaction([
        this.prisma.postUpvote.delete({ where: { id: existing.id } }),
        this.prisma.cerclePost.update({
          where: { id: postId },
          data: { upvotes: { decrement: 1 } },
          select: { id: true, upvotes: true },
        }),
      ]);
      return { liked: false, id: updated.id, upvotes: Math.max(0, updated.upvotes) };
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.postUpvote.create({ data: { postId, userId } }),
      this.prisma.cerclePost.update({
        where: { id: postId },
        data: { upvotes: { increment: 1 } },
        select: { id: true, upvotes: true },
      }),
    ]);
    return { liked: true, id: updated.id, upvotes: updated.upvotes };
  }

  async pin(postId: string, userId: string, pinned = true) {
    const post = await this.prisma.cerclePost.findUniqueOrThrow({ where: { id: postId } });
    if (!post.cercleId) throw new ForbiddenException("Épinglage réservé aux posts de cercle");
    await this.cercles.assertModerator(post.cercleId, userId);
    return this.prisma.cerclePost.update({ where: { id: postId }, data: { isPinned: pinned } });
  }

  async resolve(postId: string, userId: string, resolved = true) {
    const post = await this.prisma.cerclePost.findUniqueOrThrow({ where: { id: postId } });
    const isAuthor = post.authorId === userId;
    const isMod = post.cercleId ? await this.cercles.isModerator(post.cercleId, userId) : false;
    if (!isAuthor && !isMod) throw new ForbiddenException("Auteur ou modérateur requis");
    return this.prisma.cerclePost.update({ where: { id: postId }, data: { isResolved: resolved } });
  }

  // ── Fil GÉNÉRAL (posts publics, cercleId NULL) ─────────────────

  private readonly authorSelect = {
    select: {
      id: true, email: true, username: true,
      proProfile: { select: { displayName: true, avatarUrl: true, metier: true, isVerified: true } },
    },
  };

  /** Fil général pour un utilisateur connecté (avec flag `liked`). */
  async generalFeed(viewerId: string, opts: { page?: number; pageSize?: number } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));
    const where = { cercleId: null, parentId: null, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.cerclePost.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: this.authorSelect,
          attachments: true,
          upvotedBy: { where: { userId: viewerId }, select: { id: true } },
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.cerclePost.count({ where }),
    ]);
    return {
      data: data.map((p) => ({ ...p, liked: (p.upvotedBy?.length || 0) > 0 })),
      meta: { page, pageSize, total },
    };
  }

  /** Fil général PUBLIC (sans authentification — pour le SEO / partage). */
  async publicFeed(opts: { page?: number; pageSize?: number } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));
    const where = { cercleId: null, parentId: null, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.cerclePost.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: this.authorSelect,
          attachments: true,
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.cerclePost.count({ where }),
    ]);
    return { data, meta: { page, pageSize, total } };
  }

  /** Détail PUBLIC d'un post général (sans auth). Refuse les posts de cercle. */
  async publicDetail(postId: string) {
    const post = await this.prisma.cerclePost.findUnique({
      where: { id: postId },
      include: {
        author: this.authorSelect,
        attachments: true,
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: { author: this.authorSelect, attachments: true },
        },
      },
    });
    if (!post || post.deletedAt) throw new NotFoundException("Post introuvable");
    if (post.cercleId) throw new ForbiddenException("Ce post appartient à un cercle privé — connexion requise");
    return post;
  }
}
