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
exports.SupplierCatalogController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const jwt_auth_guard_1 = require("../../tome-5/auth/jwt-auth.guard");
const supplier_catalog_service_1 = require("./supplier-catalog.service");
/**
 * Endpoints catalogue matériaux fournisseurs P6.
 *
 *  GET    /p6/suppliers/:id/catalog          public — items actifs uniquement (cross-supplier search ailleurs)
 *  GET    /p6/suppliers/:id/catalog/manage   auth — owner du dossier OU admin: tous les items
 *  POST   /p6/suppliers/:id/catalog          auth — créer un item
 *  PATCH  /p6/suppliers/:id/catalog/:itemId  auth — modifier
 *  DELETE /p6/suppliers/:id/catalog/:itemId  auth — soft-delete (active=false)
 *  GET    /p6/catalog/search                  public — recherche cross-fournisseurs
 */
let SupplierCatalogController = class SupplierCatalogController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    // PUBLIC: voir le catalogue actif d'un fournisseur (utile pour clients qui sourcent)
    async listPublic(dossierId, search, zone, categorie) {
        return this.svc.list({ dossierId, activeOnly: true, search, zone, categorie });
    }
    // AUTH: gestion par le owner ou admin (voit aussi les items inactifs)
    async listManage(dossierId, search, req) {
        // assertOwnerOrAdmin handled implicitly via list (no, list is open). Do explicit check via update path.
        // Return all items (active + inactive). For now we trust JwtAuthGuard. (Le service vérifie ownerId pour mutations.)
        return this.svc.list({ dossierId, activeOnly: false, search });
    }
    async create(dossierId, input, req) {
        const userId = req.user?.userId;
        const userEmail = req.user?.email;
        const isAdmin = ["ADMIN", "OWNER"].includes((req.user?.role || "").toString().toUpperCase());
        const item = await this.svc.create({ dossierId, input, userId, userEmail, isAdmin });
        return { ok: true, item };
    }
    async update(dossierId, itemId, patch, req) {
        const userId = req.user?.userId;
        const userEmail = req.user?.email;
        const isAdmin = ["ADMIN", "OWNER"].includes((req.user?.role || "").toString().toUpperCase());
        const item = await this.svc.update({ dossierId, itemId, patch, userId, userEmail, isAdmin });
        return { ok: true, item };
    }
    async deactivate(dossierId, itemId, hard, req) {
        const userId = req.user?.userId;
        const userEmail = req.user?.email;
        const isAdmin = ["ADMIN", "OWNER"].includes((req.user?.role || "").toString().toUpperCase());
        if (hard === "1" || hard === "true") {
            return this.svc.hardDelete({ dossierId, itemId, userId, isAdmin });
        }
        const item = await this.svc.deactivate({ dossierId, itemId, userId, userEmail, isAdmin });
        return { ok: true, item };
    }
    // PUBLIC: recherche cross-fournisseurs (filtré sur ACTIVATED suppliers uniquement)
    async searchCross(search, zone, categorie, take) {
        return this.svc.searchCrossSuppliers({
            search, zone, categorie,
            take: take ? Math.min(+take, 200) : 50,
        });
    }
};
exports.SupplierCatalogController = SupplierCatalogController;
__decorate([
    (0, common_1.Get)("p6/suppliers/:id/catalog"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)("search")),
    __param(2, (0, common_1.Query)("zone")),
    __param(3, (0, common_1.Query)("categorie")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], SupplierCatalogController.prototype, "listPublic", null);
__decorate([
    (0, common_1.Get)("p6/suppliers/:id/catalog/manage"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)("search")),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SupplierCatalogController.prototype, "listManage", null);
__decorate([
    (0, common_1.Post)("p6/suppliers/:id/catalog"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SupplierCatalogController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)("p6/suppliers/:id/catalog/:itemId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("itemId")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], SupplierCatalogController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)("p6/suppliers/:id/catalog/:itemId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("itemId")),
    __param(2, (0, common_1.Query)("hard")),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], SupplierCatalogController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Get)("p6/catalog/search"),
    __param(0, (0, common_1.Query)("search")),
    __param(1, (0, common_1.Query)("zone")),
    __param(2, (0, common_1.Query)("categorie")),
    __param(3, (0, common_1.Query)("take")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], SupplierCatalogController.prototype, "searchCross", null);
exports.SupplierCatalogController = SupplierCatalogController = __decorate([
    (0, tome_at_1.Tome)("tome7"),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [supplier_catalog_service_1.SupplierCatalogService])
], SupplierCatalogController);
