import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";

export type ArticleStatus = "DRAFT" | "PUBLISHED" | "REJECTED";

export type ArticleCreateInput = {
  slug?: string;
  title: string;
  lang?: string;
  category: string;
  tags?: string[];
  excerpt: string;
  content: string;
  cover?: string;
  coverWidth?: number;
  coverHeight?: number;
  status?: ArticleStatus;
  authorId?: string;
  authorName?: string;
};

export type ArticleUpdateInput = Partial<ArticleCreateInput> & { status?: ArticleStatus };

export type ArticleListFilters = {
  status?: ArticleStatus;
  lang?: string;
  category?: string;
  authorId?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

/**
 * Articles service — CRUD + publication des articles Media/Blog.
 * Stockage Postgres (model `Article` du schema principal).
 *
 * Le slug est généré automatiquement depuis le titre si non fourni.
 * Le passage en PUBLISHED stamp `publishedAt` automatiquement.
 */
@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Génère un slug kebab-case depuis un titre (FR/AR/EN), unique en DB. */
  async generateUniqueSlug(title: string, langHint?: string, excludeId?: string): Promise<string> {
    const base = slugify(title, langHint);
    if (!base) return `article-${Date.now()}`;
    let slug = base;
    let i = 1;
    // Boucle bornée pour éviter slugs trop longs
    while (i < 100) {
      const existing = await this.prisma.article.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) } });
      if (!existing) return slug;
      i++;
      slug = `${base}-${i}`;
    }
    return `${base}-${Date.now()}`;
  }

  async create(input: ArticleCreateInput) {
    if (!input.title?.trim()) throw new BadRequestException("title requis");
    if (!input.excerpt?.trim()) throw new BadRequestException("excerpt requis");
    if (!input.content?.trim()) throw new BadRequestException("content requis");
    if (!input.category?.trim()) throw new BadRequestException("category requis");

    const slug = input.slug?.trim() || (await this.generateUniqueSlug(input.title, input.lang));
    const status = input.status || "DRAFT";

    return this.prisma.article.create({
      data: {
        slug,
        title: input.title.trim(),
        lang: input.lang || "fr",
        category: input.category.trim(),
        tags: input.tags || [],
        excerpt: input.excerpt.trim(),
        content: input.content,
        cover: input.cover,
        coverWidth: input.coverWidth,
        coverHeight: input.coverHeight,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        authorId: input.authorId,
        authorName: input.authorName,
      },
    });
  }

  async update(id: string, input: ArticleUpdateInput) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Article introuvable");

    // Si le statut passe à PUBLISHED et qu'on n'avait pas encore publié, stamp publishedAt
    const newStatus = input.status ?? existing.status;
    const publishedAt =
      newStatus === "PUBLISHED" && !existing.publishedAt
        ? new Date()
        : input.status === "DRAFT" || input.status === "REJECTED"
          ? null
          : existing.publishedAt;

    // Régénérer le slug si le titre change ET le slug n'est pas explicitement fourni
    let slug = input.slug ?? existing.slug;
    if (input.title && input.title !== existing.title && !input.slug) {
      slug = await this.generateUniqueSlug(input.title, input.lang || existing.lang, id);
    }

    return this.prisma.article.update({
      where: { id },
      data: {
        slug,
        title: input.title ?? existing.title,
        lang: input.lang ?? existing.lang,
        category: input.category ?? existing.category,
        tags: input.tags ?? existing.tags,
        excerpt: input.excerpt ?? existing.excerpt,
        content: input.content ?? existing.content,
        cover: input.cover ?? existing.cover,
        coverWidth: input.coverWidth ?? existing.coverWidth,
        coverHeight: input.coverHeight ?? existing.coverHeight,
        status: newStatus,
        publishedAt,
        authorId: input.authorId ?? existing.authorId,
        authorName: input.authorName ?? existing.authorName,
      },
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Article introuvable");
    await this.prisma.article.delete({ where: { id } });
    return { ok: true };
  }

  async getBySlug(slug: string) {
    const a = await this.prisma.article.findUnique({ where: { slug } });
    if (!a) throw new NotFoundException("Article introuvable");
    return a;
  }

  /** Lecture publique : ne renvoie que PUBLISHED + incrémente le compteur de vues. */
  async getBySlugPublic(slug: string) {
    const a = await this.prisma.article.findUnique({ where: { slug } });
    if (!a || a.status !== "PUBLISHED") throw new NotFoundException("Article introuvable");
    // Best-effort : on ne bloque pas la lecture si l'increment échoue
    this.prisma.article.update({ where: { id: a.id }, data: { views: { increment: 1 } } }).catch(() => {});
    return a;
  }

  async getById(id: string) {
    const a = await this.prisma.article.findUnique({ where: { id } });
    if (!a) throw new NotFoundException("Article introuvable");
    return a;
  }

  async list(filters: ArticleListFilters = {}) {
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = Math.max(filters.offset ?? 0, 0);

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.lang) where.lang = filters.lang;
    if (filters.category) where.category = filters.category;
    if (filters.authorId) where.authorId = filters.authorId;
    if (filters.q?.trim()) {
      const q = filters.q.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { excerpt: { contains: q, mode: "insensitive" } },
        { tags: { hasSome: [q] } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
      }),
      this.prisma.article.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  /** Liste publique : uniquement les PUBLISHED, ordonnés par date de publication décroissante. */
  async listPublic(filters: Omit<ArticleListFilters, "status" | "authorId"> = {}) {
    return this.list({ ...filters, status: "PUBLISHED" });
  }
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

/**
 * Slugify titre → kebab-case ASCII-friendly.
 * Pour AR, garde les lettres arabes (les robots gèrent l'IDN, Twitter/FB OK avec UTF-8).
 */
function slugify(text: string, langHint?: string): string {
  if (!text) return "";
  let s = text.toLowerCase().trim();
  // Normalisation Unicode pour gérer les accents FR
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  // Si arabe, on garde les caractères arabes (U+0600 to U+06FF)
  if (langHint === "ar" || /[؀-ۿ]/.test(s)) {
    s = s.replace(/[^؀-ۿa-z0-9\s-]/g, "");
  } else {
    s = s.replace(/[^a-z0-9\s-]/g, "");
  }
  s = s.replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  // Limite à 80 chars pour éviter URLs trop longues
  return s.slice(0, 80);
}
