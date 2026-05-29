/**
 * CabinetController — endpoints fiche cabinet (publics + owner).
 *
 *  Publics (sans auth) :
 *    GET  /api/pro/sitemap.xml             → sitemap cabinets + projets publiés (XML)
 *    GET  /api/pro/:slug                   → fiche cabinet + projets publiés + médias
 *    GET  /api/pro/:slug/schema.json       → JSON-LD agrégé (ProfessionalService + CreativeWork + Image/VideoObject)
 *    GET  /api/pro/:slug/projet/:projectSlug → projet public + médias
 *
 *  Owner (JWT, owner = userId du ProProfile) :
 *    POST   /api/pro/me/slug                          → assure/retourne le slug public
 *    GET    /api/pro/me/projects
 *    POST   /api/pro/me/projects
 *    PATCH  /api/pro/me/projects/:id
 *    DELETE /api/pro/me/projects/:id
 *    PATCH  /api/pro/me/projects/:id/publish          { published: boolean }
 *    POST   /api/pro/me/projects/:id/media
 *    DELETE /api/pro/me/projects/:id/media/:mid
 *    PATCH  /api/pro/me/projects/:id/media/reorder    [{id, position}]
 */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { JwtAuthGuard, Tome } from "../../tomes/tome-at";
import { CabinetService, MediaInput, ProjectInput } from "./cabinet.service";

type AuthedRequest = Request & { user?: { userId?: string; sub?: string; id?: string } };
const uid = (req: AuthedRequest) => String(req.user?.userId ?? req.user?.sub ?? req.user?.id ?? "");

@Tome("tome2")
@Controller("api/pro")
export class CabinetController {
  constructor(private readonly svc: CabinetService) {}

  // ── PUBLIC ──────────────────────────────────────────────────────────

  @Get("sitemap.xml")
  @Header("Content-Type", "application/xml; charset=utf-8")
  async sitemap(@Res() res: Response) {
    const xml = await this.svc.getSitemapXml();
    res.send(xml);
  }

  @Get(":slug")
  async publicCabinet(@Param("slug") slug: string) {
    return { ok: true, data: await this.svc.getPublicCabinet(slug) };
  }

  @Get(":slug/schema.json")
  @Header("Content-Type", "application/ld+json; charset=utf-8")
  async schemaJson(@Param("slug") slug: string, @Res() res: Response) {
    const data = await this.svc.getSchemaJsonForCabinet(slug);
    res.send(JSON.stringify(data, null, 2));
  }

  @Get(":slug/projet/:projectSlug")
  async publicProject(@Param("slug") slug: string, @Param("projectSlug") projectSlug: string) {
    return { ok: true, data: await this.svc.getPublicProject(slug, projectSlug) };
  }

  // ── OWNER (JWT) ─────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post("me/slug")
  async ensureMySlug(@Req() req: AuthedRequest) {
    return { ok: true, data: await this.svc.ensureCabinetSlug(uid(req)) };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me/projects")
  async listMyProjects(@Req() req: AuthedRequest) {
    return { ok: true, data: await this.svc.listMyProjects(uid(req)) };
  }

  @UseGuards(JwtAuthGuard)
  @Post("me/projects")
  async createMyProject(@Req() req: AuthedRequest, @Body() body: ProjectInput) {
    if (!body) throw new BadRequestException("body requis");
    return { ok: true, data: await this.svc.createMyProject(uid(req), body) };
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me/projects/:id")
  async updateMyProject(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: Partial<ProjectInput>) {
    return { ok: true, data: await this.svc.updateMyProject(uid(req), id, body || {}) };
  }

  @UseGuards(JwtAuthGuard)
  @Delete("me/projects/:id")
  async deleteMyProject(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.svc.deleteMyProject(uid(req), id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me/projects/:id/publish")
  async publishMyProject(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: { published: boolean }) {
    if (typeof body?.published !== "boolean") throw new BadRequestException("published: boolean requis");
    return { ok: true, data: await this.svc.setPublished(uid(req), id, body.published) };
  }

  @UseGuards(JwtAuthGuard)
  @Post("me/projects/:id/media")
  async addMyMedia(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: MediaInput) {
    if (!body) throw new BadRequestException("body requis");
    return { ok: true, data: await this.svc.addMyProjectMedia(uid(req), id, body) };
  }

  @UseGuards(JwtAuthGuard)
  @Delete("me/projects/:id/media/:mid")
  async deleteMyMedia(@Req() req: AuthedRequest, @Param("id") id: string, @Param("mid") mid: string) {
    return this.svc.deleteMyMedia(uid(req), id, mid);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me/projects/:id/media/reorder")
  async reorderMyMedia(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Body() body: { order: Array<{ id: string; position: number }> },
  ) {
    if (!Array.isArray(body?.order)) throw new BadRequestException("order: array requis");
    return this.svc.reorderMyMedia(uid(req), id, body.order);
  }
}
