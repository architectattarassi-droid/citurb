import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../../tomes/tome-5/auth/roles.guard";
import { Roles } from "../../tomes/tome-5/auth/roles.decorator";
import { SeoService } from "./seo.service";

/**
 * SeoController — cockpit SEO/GEO (backoffice). Tout sous /api/cc/seo,
 * réservé ADMIN/OWNER/OPS.
 */
@Tome("tome9")
@Controller("api/cc/seo")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "OWNER", "OPS")
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Get("audit")
  async audit() { return { ok: true, audit: await this.seo.audit() }; }

  @Get("gsc")
  async gsc(@Query("days") days?: string) { return { ok: true, gsc: await this.seo.gsc(Number(days) || 28) }; }

  @Post("gsc/import")
  async gscImport(@Body() body: { queries?: string; pages?: string }) {
    return { ok: true, gsc: await this.seo.importGsc(body?.queries || "", body?.pages || "") };
  }

  @Get("audit/urls")
  async getUrls() { return { ok: true, urls: await this.seo.getAuditUrls() }; }
  @Put("audit/urls")
  async setUrls(@Body() body: { urls: string[] }) { return this.seo.setAuditUrls(body?.urls || []); }

  @Get("keywords")
  async keywords() { return { ok: true, keywords: await this.seo.listKeywords() }; }
  @Post("keywords")
  async upsertKeyword(@Body() body: any) { return { ok: true, keywords: await this.seo.upsertKeyword(body) }; }
  @Delete("keywords/:id")
  async removeKeyword(@Param("id") id: string) { return { ok: true, keywords: await this.seo.removeKeyword(id) }; }

  @Get("competitors")
  async competitors() { return { ok: true, competitors: await this.seo.listCompetitors() }; }
  @Post("competitors")
  async upsertCompetitor(@Body() body: any) { return { ok: true, competitors: await this.seo.upsertCompetitor(body) }; }
  @Post("competitors/:id/inspect")
  async inspect(@Param("id") id: string) { return { ok: true, competitors: await this.seo.inspectCompetitor(id) }; }
  @Delete("competitors/:id")
  async removeCompetitor(@Param("id") id: string) { return { ok: true, competitors: await this.seo.removeCompetitor(id) }; }
}
