"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArticlesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
/**
 * Articles service — CRUD + publication des articles Media/Blog.
 * Stockage Postgres (model `Article` du schema principal).
 *
 * Le slug est généré automatiquement depuis le titre si non fourni.
 * Le passage en PUBLISHED stamp `publishedAt` automatiquement.
 */
let ArticlesService = class ArticlesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /** Génère un slug kebab-case depuis un titre (FR/AR/EN), unique en DB. */
    async generateUniqueSlug(title, langHint, excludeId) {
        const base = slugify(title, langHint);
        if (!base)
            return `article-${Date.now()}`;
        let slug = base;
        let i = 1;
        // Boucle bornée pour éviter slugs trop longs
        while (i < 100) {
            const existing = await this.prisma.article.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) } });
            if (!existing)
                return slug;
            i++;
            slug = `${base}-${i}`;
        }
        return `${base}-${Date.now()}`;
    }
    async create(input) {
        if (!input.title?.trim())
            throw new common_1.BadRequestException("title requis");
        if (!input.excerpt?.trim())
            throw new common_1.BadRequestException("excerpt requis");
        if (!input.content?.trim())
            throw new common_1.BadRequestException("content requis");
        if (!input.category?.trim())
            throw new common_1.BadRequestException("category requis");
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
    async update(id, input) {
        const existing = await this.prisma.article.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException("Article introuvable");
        // Si le statut passe à PUBLISHED et qu'on n'avait pas encore publié, stamp publishedAt
        const newStatus = input.status ?? existing.status;
        const publishedAt = newStatus === "PUBLISHED" && !existing.publishedAt
            ? new Date()
            : input.status === "DRAFT" || input.status === "REJECTED"
                ? null
                : existing.publishedAt;
        // URL STABLE : le slug ne change JAMAIS automatiquement quand on édite (titre,
        // texte, image, vidéo…). Il n'est modifié que si un nouveau slug est fourni
        // EXPLICITEMENT — et dans ce cas on garantit son unicité. Sans ça, partager un
        // article puis l'éditer casserait le lien déjà diffusé (WhatsApp, LinkedIn…).
        let slug = existing.slug;
        if (input.slug && input.slug.trim() && input.slug.trim() !== existing.slug) {
            slug = await this.generateUniqueSlug(input.slug.trim(), input.lang || existing.lang, id);
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
    /**
     * Édition par le PROPRIÉTAIRE du post (son auteur) ou un admin.
     *
     * Contraintes :
     *  - Garde l'URL : le slug n'est jamais modifié ici.
     *  - Garde le statut/publishedAt : on n'édite que le contenu (texte/image/vidéo),
     *    pas le cycle de publication.
     *  - Seuls les champs de contenu sont modifiables (titre, chapeau, contenu,
     *    cover, tags, catégorie, langue). authorId/authorName ne bougent pas.
     *
     * @throws ForbiddenException si l'utilisateur n'est ni l'auteur ni un admin.
     */
    async updateOwned(id, user, input) {
        const existing = await this.prisma.article.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException("Article introuvable");
        const isAdmin = ["ADMIN", "OWNER", "OPS"].includes((user.role || "").toUpperCase());
        const isAuthor = !!existing.authorId && existing.authorId === user.userId;
        if (!isAdmin && !isAuthor) {
            throw new common_1.ForbiddenException("Seul l'auteur du post peut le modifier");
        }
        return this.prisma.article.update({
            where: { id },
            data: {
                // slug, status, publishedAt, authorId, authorName : INCHANGÉS (URL stable)
                title: input.title?.trim() || existing.title,
                lang: input.lang ?? existing.lang,
                category: input.category?.trim() || existing.category,
                tags: input.tags ?? existing.tags,
                excerpt: input.excerpt?.trim() || existing.excerpt,
                content: input.content ?? existing.content,
                cover: input.cover !== undefined ? input.cover : existing.cover,
                coverWidth: input.coverWidth ?? existing.coverWidth,
                coverHeight: input.coverHeight ?? existing.coverHeight,
            },
        });
    }
    async delete(id) {
        const existing = await this.prisma.article.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException("Article introuvable");
        await this.prisma.article.delete({ where: { id } });
        return { ok: true };
    }
    async getBySlug(slug) {
        const a = await this.prisma.article.findUnique({ where: { slug } });
        if (!a)
            throw new common_1.NotFoundException("Article introuvable");
        return a;
    }
    /** Lecture publique : ne renvoie que PUBLISHED + incrémente le compteur de vues. */
    async getBySlugPublic(slug) {
        const a = await this.prisma.article.findUnique({ where: { slug } });
        if (!a || a.status !== "PUBLISHED")
            throw new common_1.NotFoundException("Article introuvable");
        // Best-effort : on ne bloque pas la lecture si l'increment échoue
        this.prisma.article.update({ where: { id: a.id }, data: { views: { increment: 1 } } }).catch(() => { });
        return a;
    }
    async getById(id) {
        const a = await this.prisma.article.findUnique({ where: { id } });
        if (!a)
            throw new common_1.NotFoundException("Article introuvable");
        return a;
    }
    async list(filters = {}) {
        const limit = Math.min(filters.limit ?? 20, 100);
        const offset = Math.max(filters.offset ?? 0, 0);
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.lang)
            where.lang = filters.lang;
        if (filters.category)
            where.category = filters.category;
        if (filters.authorId)
            where.authorId = filters.authorId;
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
    async listPublic(filters = {}) {
        return this.list({ ...filters, status: "PUBLISHED" });
    }
};
exports.ArticlesService = ArticlesService;
exports.ArticlesService = ArticlesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ArticlesService);
// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────
/**
 * Slugify titre → kebab-case ASCII-friendly.
 * Pour AR, garde les lettres arabes (les robots gèrent l'IDN, Twitter/FB OK avec UTF-8).
 */
function slugify(text, langHint) {
    if (!text)
        return "";
    let s = text.toLowerCase().trim();
    // Normalisation Unicode pour gérer les accents FR
    s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    // Si arabe, on garde les caractères arabes (U+0600 to U+06FF)
    if (langHint === "ar" || /[؀-ۿ]/.test(s)) {
        s = s.replace(/[^؀-ۿa-z0-9\s-]/g, "");
    }
    else {
        s = s.replace(/[^a-z0-9\s-]/g, "");
    }
    s = s.replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    // Limite à 80 chars pour éviter URLs trop longues
    return s.slice(0, 80);
}
