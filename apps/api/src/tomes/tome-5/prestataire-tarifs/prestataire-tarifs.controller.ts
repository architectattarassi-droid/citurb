import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import { Tome } from "../../tome-at";
import { PrestataireTarifsService } from "./prestataire-tarifs.service";
import {
  CreateTarifInput,
  SearchTarifsFilters,
  UpdateTarifInput,
} from "./prestataire-tarifs.types";

/**
 * TOME 5 — Controller Prestataire Tarifs
 *
 * Routes publiques (corpus, search, comparator) + routes "prestataire"
 * (création/édition/soumission/signature) — auth JWT déléguée au reverse-proxy
 * et au guard global pour le MVP (cf. INTEGRATION.md).
 *
 * Mount: `/api/prestataire-tarifs`
 */
@Tome("tome5")
@Controller("api/prestataire-tarifs")
export class PrestataireTarifsController {
  constructor(private readonly service: PrestataireTarifsService) {}

  /** GET /api/prestataire-tarifs/corpus — corpus 40+ prestations standardisées. */
  @Get("corpus")
  getCorpus() {
    return {
      ok: true,
      count: this.service.getCorpus().length,
      prestations: this.service.getCorpus(),
    };
  }

  /**
   * GET /api/prestataire-tarifs/search?prestation=&zone=&maxPrice=
   * Recherche client multi-critères, status=PUBLIE uniquement.
   */
  @Get("search")
  search(
    @Query("prestation") prestation?: string,
    @Query("zone") zone?: string,
    @Query("maxPrice") maxPrice?: string,
  ) {
    const filters: SearchTarifsFilters = {
      prestation,
      zone,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    };
    const results = this.service.search(filters);
    return { ok: true, count: results.length, results };
  }

  /** GET /api/prestataire-tarifs/prestataire/:id — tarifs publiés d'un prestataire. */
  @Get("prestataire/:id")
  listByPrestataire(@Param("id") prestataireId: string) {
    const tarifs = this.service.listByPrestataire(prestataireId);
    return { ok: true, prestataireId, count: tarifs.length, tarifs };
  }

  /** GET /api/prestataire-tarifs/:id — détail d'un tarif. */
  @Get(":id")
  getOne(@Param("id") id: string) {
    return { ok: true, tarif: this.service.getById(id) };
  }

  /**
   * GET /api/prestataire-tarifs/:id/comparator?clientPrice=...
   * Compare un prix client à la grille publique pour la même prestation.
   */
  @Get(":id/comparator")
  comparator(@Param("id") id: string, @Query("clientPrice") clientPrice: string) {
    const price = Number(clientPrice);
    if (!Number.isFinite(price) || price <= 0) {
      return { ok: false, error: "clientPrice doit être un nombre > 0." };
    }
    return { ok: true, comparison: this.service.comparePrice(id, price) };
  }

  /**
   * POST /api/prestataire-tarifs — création d'un tarif (status BROUILLON).
   * MVP: prestataireId fourni dans le body. En prod, source du JWT via guard.
   */
  @Post()
  create(@Body() body: CreateTarifInput) {
    const tarif = this.service.create(body);
    return { ok: true, tarif };
  }

  /** PATCH /api/prestataire-tarifs/:id — édition partielle. */
  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdateTarifInput) {
    return { ok: true, tarif: this.service.update(id, body) };
  }

  /** POST /api/prestataire-tarifs/:id/submit — soumission validation CITURBAREA. */
  @Post(":id/submit")
  submit(@Param("id") id: string) {
    return { ok: true, tarif: this.service.submit(id) };
  }

  /** POST /api/prestataire-tarifs/:id/contract — signature contrat → PUBLIE. */
  @Post(":id/contract")
  contract(@Param("id") id: string) {
    return { ok: true, tarif: this.service.signContract(id) };
  }

  /** POST /api/prestataire-tarifs/:id/suspend — suspension d'un tarif PUBLIE. */
  @Post(":id/suspend")
  suspend(@Param("id") id: string) {
    return { ok: true, tarif: this.service.suspend(id) };
  }
}
