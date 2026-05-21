import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { ProAccessGuard } from "./pro-access.guard";
import { PostsService } from "./posts.service";

/**
 * GeneralFeedController — Sprint M : séparation feed général / posts de cercle.
 *
 * Posts généraux = CerclePost avec cercleId NULL.
 *  - Visibles + partageables par TOUS (même non connectés) → SEO / promotion
 *  - Tout pro connecté peut publier dans le fil général
 *  - Like / commentaire : authentification requise
 *
 * Routes :
 *  - GET  /api/feed                 (auth)  fil général + flag `liked`
 *  - POST /api/feed/posts           (auth)  créer un post général
 *  - GET  /api/feed/posts/:id       (auth)  détail (avec replies) pour membre connecté
 *  - POST /api/feed/posts/:id/upvote  (auth)
 *  - POST /api/feed/posts/:id/replies (auth)
 *  - GET  /api/feed/public          (PUBLIC) fil général sans auth (SEO)
 *  - GET  /api/feed/public/:id      (PUBLIC) détail post général sans auth (partage)
 */
@Tome("tome8")
@Controller("api/feed")
export class GeneralFeedController {
  constructor(private readonly posts: PostsService) {}

  private uid(req: any): string {
    return req?.user?.userId || req?.user?.sub;
  }

  // ── Connecté ───────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, ProAccessGuard)
  async generalFeed(@Req() req: any, @Query("page") page?: string) {
    return { ok: true, ...(await this.posts.generalFeed(this.uid(req), { page: page ? Number(page) : 1 })) };
  }

  @Post("posts")
  @UseGuards(JwtAuthGuard, ProAccessGuard)
  async create(@Req() req: any, @Body() body: { title?: string; body: string; attachments?: any[] }) {
    return { ok: true, data: await this.posts.createRoot(null, this.uid(req), body) };
  }

  @Get("posts/:id")
  @UseGuards(JwtAuthGuard, ProAccessGuard)
  async detail(@Req() req: any, @Param("id") id: string) {
    return { ok: true, data: await this.posts.detail(id, this.uid(req)) };
  }

  @Post("posts/:id/upvote")
  @UseGuards(JwtAuthGuard, ProAccessGuard)
  async upvote(@Req() req: any, @Param("id") id: string) {
    return { ok: true, data: await this.posts.upvote(id, this.uid(req)) };
  }

  @Post("posts/:id/replies")
  @UseGuards(JwtAuthGuard, ProAccessGuard)
  async reply(@Req() req: any, @Param("id") id: string, @Body() body: { body: string }) {
    return { ok: true, data: await this.posts.reply(id, this.uid(req), body?.body) };
  }

  /** Suppression d'un post / commentaire (auteur OU admin/owner). */
  @Delete("posts/:id")
  @UseGuards(JwtAuthGuard, ProAccessGuard)
  async delete(@Req() req: any, @Param("id") id: string) {
    return this.posts.softDelete(id, this.uid(req), req?.user?.role);
  }

  // ── Public (sans authentification) ─────────────────────────────

  @Get("public")
  async publicFeed(@Query("page") page?: string) {
    return { ok: true, ...(await this.posts.publicFeed({ page: page ? Number(page) : 1 })) };
  }

  @Get("public/:id")
  async publicDetail(@Param("id") id: string) {
    return { ok: true, data: await this.posts.publicDetail(id) };
  }
}
