import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../../tomes/tome-5/auth/roles.guard";
import { Roles } from "../../tomes/tome-5/auth/roles.decorator";
import { AdsService } from "./ads.service";

/**
 * AdsController — régie pub "promo fournisseurs matériaux".
 *  - Public : cartes sponsorisées par lot (devis client) + clic.
 *  - Fournisseur (JWT) : demander une mise en avant sur une de ses offres.
 *  - Admin (ADMIN/OWNER/OPS) : modérer (activer/pauser/rejeter).
 */
@Tome("tome9")
@Controller("api/ads")
export class AdsController {
  constructor(private readonly ads: AdsService) {}

  /** Public — cartes sponsorisées pour une liste de lots (ex. ?lots=REV,PEI). */
  @Get("materials")
  async materials(@Query("lots") lots?: string) {
    const list = (lots || "").split(",").map((s) => s.trim()).filter(Boolean);
    return { ok: true, byLot: await this.ads.materials(list) };
  }

  /** Public — enregistre un clic sur une carte sponsorisée. */
  @Post("click/:offerId")
  async click(@Param("offerId") offerId: string) {
    return this.ads.click(offerId);
  }

  /** Fournisseur — demande une mise en avant (modération admin ensuite). */
  @Post("promos/:offerId")
  @UseGuards(JwtAuthGuard)
  async requestPromo(@Param("offerId") offerId: string, @Body() body: { lot: string }, @Req() req: any) {
    return this.ads.requestPromo(req.user.userId, offerId, body?.lot);
  }

  /** Fournisseur — ses mises en avant + stats. */
  @Get("promos/mine")
  @UseGuards(JwtAuthGuard)
  async mine(@Req() req: any) {
    return { ok: true, promos: await this.ads.myPromos(req.user.userId) };
  }

  /** Admin — liste à modérer + actives. */
  @Get("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER", "OPS")
  async adminList() {
    return { ok: true, promos: await this.ads.adminList() };
  }

  /** Admin — activer (days) / pauser / rejeter. */
  @Patch("admin/:offerId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER", "OPS")
  async adminUpdate(@Param("offerId") offerId: string, @Body() body: { action: string; days?: number }) {
    return this.ads.adminUpdate(offerId, body?.action, body?.days);
  }
}
