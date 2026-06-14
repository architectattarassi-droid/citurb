import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../../tomes/tome-5/auth/roles.guard";
import { Roles } from "../../tomes/tome-5/auth/roles.decorator";
import { ArticlesService, ArticleCreateInput, ArticleUpdateInput, ArticleStatus } from "./articles.service";

/**
 * Articles — Media / Blog endpoints
 *
 * Public (sans auth) :
 *   - GET  /api/articles            → liste PUBLISHED uniquement
 *   - GET  /api/articles/slug/:slug → lecture publique d'un article (+views++)
 *
 * Admin (auth ADMIN/OWNER/OPS) :
 *   - GET    /api/articles/admin           → liste tous statuts (DRAFT + PUBLISHED + REJECTED)
 *   - GET    /api/articles/admin/:id       → lecture par ID (peu importe le statut)
 *   - POST   /api/articles/admin           → créer article
 *   - PATCH  /api/articles/admin/:id       → mettre à jour
 *   - DELETE /api/articles/admin/:id       → supprimer
 *
 * Le slug est généré automatiquement à partir du titre si non fourni.
 * Le passage en PUBLISHED stamp publishedAt automatiquement.
 */
@Tome("tome2")
@Controller("api/articles")
export class ArticlesController {
  constructor(private readonly svc: ArticlesService) {}

  // ─── PUBLIC ──────────────────────────────────────────────────────────

  /** Liste publique : uniquement PUBLISHED, paginée. */
  @Get()
  async listPublic(
    @Query("lang") lang?: string,
    @Query("category") category?: string,
    @Query("q") q?: string,
    @Query("limit") limitStr?: string,
    @Query("offset") offsetStr?: string,
  ) {
    const limit = limitStr ? Math.min(Number(limitStr) || 20, 100) : 20;
    const offset = offsetStr ? Math.max(Number(offsetStr) || 0, 0) : 0;
    return this.svc.listPublic({ lang, category, q, limit, offset });
  }

  /** Lecture publique par slug. Incrémente le compteur de vues. */
  @Get("slug/:slug")
  async getPublic(@Param("slug") slug: string) {
    return this.svc.getBySlugPublic(slug);
  }

  // ─── ADMIN ───────────────────────────────────────────────────────────

  @Get("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER", "OPS")
  async listAdmin(
    @Query("status") status?: ArticleStatus,
    @Query("lang") lang?: string,
    @Query("category") category?: string,
    @Query("authorId") authorId?: string,
    @Query("q") q?: string,
    @Query("limit") limitStr?: string,
    @Query("offset") offsetStr?: string,
  ) {
    const limit = limitStr ? Math.min(Number(limitStr) || 20, 100) : 20;
    const offset = offsetStr ? Math.max(Number(offsetStr) || 0, 0) : 0;
    return this.svc.list({ status, lang, category, authorId, q, limit, offset });
  }

  @Get("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER", "OPS")
  async getAdmin(@Param("id") id: string) {
    return this.svc.getById(id);
  }

  @Post("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER", "OPS")
  async create(@Body() body: ArticleCreateInput, @Req() req: any) {
    if (!body) throw new BadRequestException("body manquant");
    const authorId = body.authorId ?? req.user?.userId ?? req.user?.id;
    return this.svc.create({ ...body, authorId });
  }

  @Patch("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER", "OPS")
  async update(@Param("id") id: string, @Body() body: ArticleUpdateInput) {
    if (!body) throw new BadRequestException("body manquant");
    return this.svc.update(id, body);
  }

  /**
   * Édition par l'AUTEUR du post (ou un admin) — n'importe quel user authentifié,
   * le contrôle de propriété est fait dans le service. Garde l'URL (slug) et le
   * statut de publication ; ne modifie que le contenu (texte/image/vidéo).
   */
  @Patch("mine/:id")
  @UseGuards(JwtAuthGuard)
  async updateMine(@Param("id") id: string, @Body() body: ArticleUpdateInput, @Req() req: any) {
    if (!body) throw new BadRequestException("body manquant");
    return this.svc.updateOwned(id, { userId: req.user?.userId ?? req.user?.id, role: req.user?.role }, body);
  }

  @Delete("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER", "OPS")
  async delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }
}
