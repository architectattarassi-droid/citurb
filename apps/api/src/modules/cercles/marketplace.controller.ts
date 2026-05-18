import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, UseInterceptors, UploadedFiles, BadRequestException } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { diskStorage } = require("multer");
import { join } from "path";
import { mkdirSync } from "fs";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { MarketplaceService, OfferInput } from "./marketplace.service";

const UPLOAD_BASE = process.env.UPLOADS_DIR || join(process.cwd(), "uploads");
const MKT_PHOTO_DIR = join(UPLOAD_BASE, "marketplace");
try { mkdirSync(MKT_PHOTO_DIR, { recursive: true }); } catch {}
const PHOTO_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * MarketplaceController — Marketplace BTP (référentiel + offres).
 *
 *  Public :
 *   - GET /api/marketplace/meta                    corps de métier + unités
 *   - GET /api/marketplace/taxonomy                arbo corps de métier → familles
 *   - GET /api/marketplace/products                browse référentiel (filtres)
 *   - GET /api/marketplace/products/:id            fiche produit + offres
 *
 *  Fournisseur connecté :
 *   - GET    /api/marketplace/referentiel/search   chercher un produit du référentiel
 *   - GET    /api/marketplace/my-offers            mes offres
 *   - POST   /api/marketplace/offers               créer une offre
 *   - PATCH  /api/marketplace/offers/:id           modifier
 *   - DELETE /api/marketplace/offers/:id           supprimer
 */
@Tome("tome8")
@Controller("api/marketplace")
export class MarketplaceController {
  constructor(private readonly market: MarketplaceService) {}

  private uid(req: any): string {
    return req?.user?.userId || req?.user?.sub;
  }

  // ── Public ─────────────────────────────────────────────────────

  @Get("meta")
  meta() {
    return { ok: true, data: { corpsMetier: MarketplaceService.CORPS_METIER, units: MarketplaceService.UNITS } };
  }

  @Get("taxonomy")
  async taxonomy() {
    return { ok: true, data: await this.market.taxonomy() };
  }

  @Get("products")
  async browse(
    @Query("corpsMetier") corpsMetier?: string,
    @Query("famille") famille?: string,
    @Query("q") q?: string,
    @Query("page") page?: string,
  ) {
    return { ok: true, ...(await this.market.browse({ corpsMetier, famille, q, page: page ? Number(page) : 1 })) };
  }

  @Get("products/:id")
  async productDetail(@Param("id") id: string) {
    return { ok: true, data: await this.market.productDetail(id) };
  }

  // ── Fournisseur connecté ───────────────────────────────────────

  @Get("referentiel/search")
  @UseGuards(JwtAuthGuard)
  async searchReferentiel(@Query("q") q: string) {
    return { ok: true, data: await this.market.searchReferentiel(q || "") };
  }

  @Get("my-offers")
  @UseGuards(JwtAuthGuard)
  async myOffers(@Req() req: any) {
    return { ok: true, data: await this.market.myOffers(this.uid(req)) };
  }

  @Post("offers")
  @UseGuards(JwtAuthGuard)
  async createOffer(@Req() req: any, @Body() body: OfferInput) {
    return { ok: true, data: await this.market.createOffer(this.uid(req), body) };
  }

  @Patch("offers/:id")
  @UseGuards(JwtAuthGuard)
  async updateOffer(@Req() req: any, @Param("id") id: string, @Body() body: OfferInput) {
    return { ok: true, data: await this.market.updateOffer(id, this.uid(req), body) };
  }

  @Delete("offers/:id")
  @UseGuards(JwtAuthGuard)
  async removeOffer(@Req() req: any, @Param("id") id: string) {
    return { ok: true, data: await this.market.removeOffer(id, this.uid(req)) };
  }

  // Attribution des vraies photos via Pixabay (admin, one-shot, idempotent)
  @Post("admin/populate-photos")
  @UseGuards(JwtAuthGuard)
  async populatePhotos(@Body() body: { pixabayKey: string; force?: boolean; familles?: string[] }) {
    return this.market.populateReferentielPhotos(body?.pixabayKey, { force: body?.force, familles: body?.familles });
  }

  // Upload photos générique (offres marketplace, portfolio pro…)
  @Post("photos")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor("files", 12, {
      storage: diskStorage({
        destination: (req: any, _file: any, cb: any) => {
          const userId = req?.user?.userId || req?.user?.sub || "unknown";
          const dir = join(MKT_PHOTO_DIR, userId);
          try { mkdirSync(dir, { recursive: true }); } catch {}
          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const ext = (file.originalname.match(/\.(jpg|jpeg|png|webp|gif)$/i) || [".jpg"])[0];
          cb(null, `mkt-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
        },
      }),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async uploadPhotos(@Req() req: any, @UploadedFiles() files: any[]) {
    if (!files || files.length === 0) throw new BadRequestException("Aucun fichier");
    const userId = req?.user?.userId || req?.user?.sub;
    return {
      ok: true,
      data: files.map((f) => {
        if (!PHOTO_MIMES.has(f.mimetype)) throw new BadRequestException(`Type ${f.mimetype} non autorisé`);
        return { url: `/uploads/marketplace/${userId}/${f.filename}`, filename: f.originalname, sizeBytes: f.size };
      }),
    };
  }
}
