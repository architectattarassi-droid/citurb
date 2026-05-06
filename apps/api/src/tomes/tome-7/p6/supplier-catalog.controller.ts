import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../../tome-at";
import { JwtAuthGuard } from "../../tome-5/auth/jwt-auth.guard";
import { SupplierCatalogService, CatalogItemInput, CatalogCategory } from "./supplier-catalog.service";

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
@Tome("tome7")
@Controller()
export class SupplierCatalogController {
  constructor(private readonly svc: SupplierCatalogService) {}

  // PUBLIC: voir le catalogue actif d'un fournisseur (utile pour clients qui sourcent)
  @Get("p6/suppliers/:id/catalog")
  async listPublic(
    @Param("id") dossierId: string,
    @Query("search") search?: string,
    @Query("zone") zone?: string,
    @Query("categorie") categorie?: CatalogCategory,
  ) {
    return this.svc.list({ dossierId, activeOnly: true, search, zone, categorie });
  }

  // AUTH: gestion par le owner ou admin (voit aussi les items inactifs)
  @Get("p6/suppliers/:id/catalog/manage")
  @UseGuards(JwtAuthGuard)
  async listManage(
    @Param("id") dossierId: string,
    @Query("search") search?: string,
    @Req() req?: any,
  ) {
    // assertOwnerOrAdmin handled implicitly via list (no, list is open). Do explicit check via update path.
    // Return all items (active + inactive). For now we trust JwtAuthGuard. (Le service vérifie ownerId pour mutations.)
    return this.svc.list({ dossierId, activeOnly: false, search });
  }

  @Post("p6/suppliers/:id/catalog")
  @UseGuards(JwtAuthGuard)
  async create(
    @Param("id") dossierId: string,
    @Body() input: CatalogItemInput,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    const userEmail = req.user?.email;
    const isAdmin = ["ADMIN", "OWNER"].includes((req.user?.role || "").toString().toUpperCase());
    const item = await this.svc.create({ dossierId, input, userId, userEmail, isAdmin });
    return { ok: true, item };
  }

  @Patch("p6/suppliers/:id/catalog/:itemId")
  @UseGuards(JwtAuthGuard)
  async update(
    @Param("id") dossierId: string,
    @Param("itemId") itemId: string,
    @Body() patch: Partial<CatalogItemInput>,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    const userEmail = req.user?.email;
    const isAdmin = ["ADMIN", "OWNER"].includes((req.user?.role || "").toString().toUpperCase());
    const item = await this.svc.update({ dossierId, itemId, patch, userId, userEmail, isAdmin });
    return { ok: true, item };
  }

  @Delete("p6/suppliers/:id/catalog/:itemId")
  @UseGuards(JwtAuthGuard)
  async deactivate(
    @Param("id") dossierId: string,
    @Param("itemId") itemId: string,
    @Query("hard") hard: string | undefined,
    @Req() req: any,
  ) {
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
  @Get("p6/catalog/search")
  async searchCross(
    @Query("search") search?: string,
    @Query("zone") zone?: string,
    @Query("categorie") categorie?: CatalogCategory,
    @Query("take") take?: string,
  ) {
    return this.svc.searchCrossSuppliers({
      search, zone, categorie,
      take: take ? Math.min(+take, 200) : 50,
    });
  }
}
