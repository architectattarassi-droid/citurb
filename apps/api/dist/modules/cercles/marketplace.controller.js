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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { diskStorage } = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const supplier_products_service_1 = require("./supplier-products.service");
const UPLOAD_BASE = process.env.UPLOADS_DIR || (0, path_1.join)(process.cwd(), "uploads");
const PRODUCT_DIR = (0, path_1.join)(UPLOAD_BASE, "supplier-products");
try {
    (0, fs_1.mkdirSync)(PRODUCT_DIR, { recursive: true });
}
catch { }
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
let MarketplaceController = class MarketplaceController {
    products;
    constructor(products) {
        this.products = products;
    }
    uid(req) {
        return req?.user?.userId || req?.user?.sub;
    }
    // ── Public ─────────────────────────────────────────────────────
    meta() {
        return { ok: true, data: { categories: supplier_products_service_1.SupplierProductsService.CATEGORIES, units: supplier_products_service_1.SupplierProductsService.UNITS } };
    }
    async browse(q, category, region, page) {
        return { ok: true, ...(await this.products.browse({ q, category, region, page: page ? Number(page) : 1 })) };
    }
    async detail(id) {
        return { ok: true, data: await this.products.detail(id) };
    }
    async storefront(supplierId) {
        return { ok: true, data: await this.products.storefront(supplierId) };
    }
    // ── Fournisseur connecté ───────────────────────────────────────
    async myProducts(req) {
        return { ok: true, data: await this.products.myProducts(this.uid(req)) };
    }
    async create(req, body) {
        return { ok: true, data: await this.products.create(this.uid(req), body) };
    }
    async update(req, id, body) {
        return { ok: true, data: await this.products.update(id, this.uid(req), body) };
    }
    async remove(req, id) {
        return { ok: true, data: await this.products.remove(id, this.uid(req)) };
    }
    async uploadPhotos(req, files) {
        if (!files || files.length === 0)
            throw new common_1.BadRequestException("Aucun fichier");
        const userId = this.uid(req);
        const out = files.map((f) => {
            if (!PHOTO_MIMES.has(f.mimetype)) {
                throw new common_1.BadRequestException(`Type ${f.mimetype} non autorisé (JPG/PNG/WebP/GIF)`);
            }
            return { url: `/uploads/supplier-products/${userId}/${f.filename}`, filename: f.originalname, sizeBytes: f.size };
        });
        return { ok: true, data: out };
    }
};
exports.MarketplaceController = MarketplaceController;
__decorate([
    (0, common_1.Get)("meta"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MarketplaceController.prototype, "meta", null);
__decorate([
    (0, common_1.Get)("products"),
    __param(0, (0, common_1.Query)("q")),
    __param(1, (0, common_1.Query)("category")),
    __param(2, (0, common_1.Query)("region")),
    __param(3, (0, common_1.Query)("page")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "browse", null);
__decorate([
    (0, common_1.Get)("products/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "detail", null);
__decorate([
    (0, common_1.Get)("storefront/:supplierId"),
    __param(0, (0, common_1.Param)("supplierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "storefront", null);
__decorate([
    (0, common_1.Get)("my-products"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "myProducts", null);
__decorate([
    (0, common_1.Post)("products"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)("products/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)("products/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)("products/photos"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)("files", 12, {
        storage: diskStorage({
            destination: (req, _file, cb) => {
                const userId = req?.user?.userId || req?.user?.sub || "unknown";
                const dir = (0, path_1.join)(PRODUCT_DIR, userId);
                try {
                    (0, fs_1.mkdirSync)(dir, { recursive: true });
                }
                catch { }
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const ext = (file.originalname.match(/\.(jpg|jpeg|png|webp|gif)$/i) || [".jpg"])[0];
                cb(null, `prod-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
            },
        }),
        limits: { fileSize: PHOTO_MAX_BYTES },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "uploadPhotos", null);
exports.MarketplaceController = MarketplaceController = __decorate([
    (0, tome_at_1.Tome)("tome8"),
    (0, common_1.Controller)("api/marketplace"),
    __metadata("design:paramtypes", [supplier_products_service_1.SupplierProductsService])
], MarketplaceController);
