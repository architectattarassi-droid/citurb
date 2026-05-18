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
const marketplace_service_1 = require("./marketplace.service");
const UPLOAD_BASE = process.env.UPLOADS_DIR || (0, path_1.join)(process.cwd(), "uploads");
const MKT_PHOTO_DIR = (0, path_1.join)(UPLOAD_BASE, "marketplace");
try {
    (0, fs_1.mkdirSync)(MKT_PHOTO_DIR, { recursive: true });
}
catch { }
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
let MarketplaceController = class MarketplaceController {
    market;
    constructor(market) {
        this.market = market;
    }
    uid(req) {
        return req?.user?.userId || req?.user?.sub;
    }
    // ── Public ─────────────────────────────────────────────────────
    meta() {
        return { ok: true, data: { corpsMetier: marketplace_service_1.MarketplaceService.CORPS_METIER, units: marketplace_service_1.MarketplaceService.UNITS } };
    }
    async taxonomy() {
        return { ok: true, data: await this.market.taxonomy() };
    }
    async browse(corpsMetier, famille, q, page) {
        return { ok: true, ...(await this.market.browse({ corpsMetier, famille, q, page: page ? Number(page) : 1 })) };
    }
    async productDetail(id) {
        return { ok: true, data: await this.market.productDetail(id) };
    }
    // ── Fournisseur connecté ───────────────────────────────────────
    async searchReferentiel(q) {
        return { ok: true, data: await this.market.searchReferentiel(q || "") };
    }
    async myOffers(req) {
        return { ok: true, data: await this.market.myOffers(this.uid(req)) };
    }
    async createOffer(req, body) {
        return { ok: true, data: await this.market.createOffer(this.uid(req), body) };
    }
    async updateOffer(req, id, body) {
        return { ok: true, data: await this.market.updateOffer(id, this.uid(req), body) };
    }
    async removeOffer(req, id) {
        return { ok: true, data: await this.market.removeOffer(id, this.uid(req)) };
    }
    // Attribution des vraies photos via Pixabay (admin, one-shot, idempotent)
    async populatePhotos(body) {
        const key = body?.pixabayKey || process.env.PIXABAY_KEY || "55917807-c7aecf704e7ec32d0e89d2c1e";
        return this.market.populateReferentielPhotos(key, { force: body?.force, familles: body?.familles });
    }
    async adminFamilles() {
        return { ok: true, data: await this.market.adminFamilles() };
    }
    async setFamillePhoto(body) {
        return this.market.setFamillePhoto(body?.corpsMetier, body?.famille, body?.photoUrl);
    }
    // Upload photos générique (offres marketplace, portfolio pro…)
    async uploadPhotos(req, files) {
        if (!files || files.length === 0)
            throw new common_1.BadRequestException("Aucun fichier");
        const userId = req?.user?.userId || req?.user?.sub;
        return {
            ok: true,
            data: files.map((f) => {
                if (!PHOTO_MIMES.has(f.mimetype))
                    throw new common_1.BadRequestException(`Type ${f.mimetype} non autorisé`);
                return { url: `/uploads/marketplace/${userId}/${f.filename}`, filename: f.originalname, sizeBytes: f.size };
            }),
        };
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
    (0, common_1.Get)("taxonomy"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "taxonomy", null);
__decorate([
    (0, common_1.Get)("products"),
    __param(0, (0, common_1.Query)("corpsMetier")),
    __param(1, (0, common_1.Query)("famille")),
    __param(2, (0, common_1.Query)("q")),
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
], MarketplaceController.prototype, "productDetail", null);
__decorate([
    (0, common_1.Get)("referentiel/search"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)("q")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "searchReferentiel", null);
__decorate([
    (0, common_1.Get)("my-offers"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "myOffers", null);
__decorate([
    (0, common_1.Post)("offers"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "createOffer", null);
__decorate([
    (0, common_1.Patch)("offers/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "updateOffer", null);
__decorate([
    (0, common_1.Delete)("offers/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "removeOffer", null);
__decorate([
    (0, common_1.Post)("admin/populate-photos"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "populatePhotos", null);
__decorate([
    (0, common_1.Get)("admin/familles"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "adminFamilles", null);
__decorate([
    (0, common_1.Post)("admin/famille-photo"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "setFamillePhoto", null);
__decorate([
    (0, common_1.Post)("photos"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)("files", 12, {
        storage: diskStorage({
            destination: (req, _file, cb) => {
                const userId = req?.user?.userId || req?.user?.sub || "unknown";
                const dir = (0, path_1.join)(MKT_PHOTO_DIR, userId);
                try {
                    (0, fs_1.mkdirSync)(dir, { recursive: true });
                }
                catch { }
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const ext = (file.originalname.match(/\.(jpg|jpeg|png|webp|gif)$/i) || [".jpg"])[0];
                cb(null, `mkt-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
            },
        }),
        limits: { fileSize: 8 * 1024 * 1024 },
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
    __metadata("design:paramtypes", [marketplace_service_1.MarketplaceService])
], MarketplaceController);
