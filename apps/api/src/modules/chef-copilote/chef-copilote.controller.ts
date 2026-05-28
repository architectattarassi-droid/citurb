import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { ChefCopiloteService } from "./chef-copilote.service";

/**
 * ChefCopiloteController — copilote IA chef de chantier (Tome 3).
 */
@Tome("tome3")
@Controller("api/chef-copilote")
export class ChefCopiloteController {
  constructor(private readonly svc: ChefCopiloteService) {}

  @Post("ask")
  @UseGuards(JwtAuthGuard)
  async ask(@Body() body: { dossierId: string; query: string; queryLang?: "darija" | "fr" | "ar" }) {
    const r = await this.svc.ask(body.dossierId, body.query, body.queryLang || "darija");
    return { ok: true, ...r };
  }

  @Get("suggestions/:dossierId")
  @UseGuards(JwtAuthGuard)
  async suggestions(@Param("dossierId") dossierId: string) {
    const suggestions = await this.svc.suggestions(dossierId);
    return { ok: true, suggestions };
  }
}
