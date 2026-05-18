import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, UseInterceptors, UploadedFiles, BadRequestException } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { diskStorage } = require("multer");
import { join } from "path";
import { mkdirSync } from "fs";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { SupplierProductsService, SupplierProductInput } from "./supplier-products.service";

const UPLOAD_BASE = process.env.UPLOADS_DIR || join(process.cwd(), "uploads");
const PRODUCT_DIR = join(UPLOAD_BASE, "supplier-products");
try { mkdirSync(PRODUCT_DIR, { recursive: true }); } catch {}
const PHOTO_MAX_BYTES = 8 * 1024 * 1024; // 8 MB / photo
const PHOTO_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * MarketplaceController — Marketplace BTP Phase 1.
 *
 *  - GET  /api/marketplace/meta                       (public)  catégories + unités
 *  - GET  /api/marketplace/products                   (public)  recherche transversale
 *  - GET  /api/marketplace/products/:id               (public)  détail produit
 *  - GET  /api/marketplace/storefront/:supplierId     (public)  vitrine d'un fournisseur
 *  - GET  /api/marketplace/my-products                (auth)    mes produits (fournisseur)
 *  - POST /api/marketplace/products                   (auth)    créer un produit
 *  - PATCH  /api/marketplace/products/:id             (auth)    modifier
 *  - DELETE /api/marketplace/products/:id             (auth)    supprimer
 *  - POST /api/marketplace/products/photos            (auth)    upload photos produit
 */
@Tome("tome8")
@Controller("api/marketplace")
export class MarketplaceController {
  constructor(private readonly products: SupplierProductsService) {}

  private uid(req: any): string {
    return req?.user?.userId || req?.user?.sub;
  }

  // ── Public ─────────────────────────────────────────────────────

  @Get("meta")
  meta() {
    return { ok: true, data: { categories: SupplierProductsService.CATEGORIES, units: SupplierProductsService.UNITS } };
  }

  @Get("products")
  async browse(@Query("q") q?: string, @Query("category") category?: string, @Query("region") region?: string, @Query("page") page?: string) {
    return { ok: true, ...(await this.products.browse({ q, category, region, page: page ? Number(page) : 1 })) };
  }

  @Get("products/:id")
  async detail(@Param("id") id: string) {
    return { ok: true, data: await this.products.detail(id) };
  }

  @Get("storefront/:supplierId")
  async storefront(@Param("supplierId") supplierId: string) {
    return { ok: true, data: await this.products.storefront(supplierId) };
  }

  // ── Fournisseur connecté ───────────────────────────────────────

  @Get("my-products")
  @UseGuards(JwtAuthGuard)
  async myProducts(@Req() req: any) {
    return { ok: true, data: await this.products.myProducts(this.uid(req)) };
  }

  @Post("products")
  @UseGuards(JwtAuthGuard)
  async create(@Req() req: any, @Body() body: SupplierProductInput) {
    return { ok: true, data: await this.products.create(this.uid(req), body) };
  }

  @Patch("products/:id")
  @UseGuards(JwtAuthGuard)
  async update(@Req() req: any, @Param("id") id: string, @Body() body: SupplierProductInput) {
    return { ok: true, data: await this.products.update(id, this.uid(req), body) };
  }

  @Delete("products/:id")
  @UseGuards(JwtAuthGuard)
  async remove(@Req() req: any, @Param("id") id: string) {
    return { ok: true, data: await this.products.remove(id, this.uid(req)) };
  }

  @Post("products/photos")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor("files", 12, {
      storage: diskStorage({
        destination: (req: any, _file: any, cb: any) => {
          const userId = req?.user?.userId || req?.user?.sub || "unknown";
          const dir = join(PRODUCT_DIR, userId);
          try { mkdirSync(dir, { recursive: true }); } catch {}
          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const ext = (file.originalname.match(/\.(jpg|jpeg|png|webp|gif)$/i) || [".jpg"])[0];
          cb(null, `prod-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
        },
      }),
      limits: { fileSize: PHOTO_MAX_BYTES },
    }),
  )
  async uploadPhotos(@Req() req: any, @UploadedFiles() files: any[]) {
    if (!files || files.length === 0) throw new BadRequestException("Aucun fichier");
    const userId = this.uid(req);
    const out = files.map((f) => {
      if (!PHOTO_MIMES.has(f.mimetype)) {
        throw new BadRequestException(`Type ${f.mimetype} non autorisé (JPG/PNG/WebP/GIF)`);
      }
      return { url: `/uploads/supplier-products/${userId}/${f.filename}`, filename: f.originalname, sizeBytes: f.size };
    });
    return { ok: true, data: out };
  }
}
