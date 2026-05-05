import { Body, Controller, Get, Post } from "@nestjs/common";
import { Tome } from "../../tome-at";
import {
  P6_TYPES, CLASSES_BTP, CATEGORIES_AGREMENT, SPECIALITES_PRESTATAIRE,
  DOCUMENTS_REQUIS_PRESTATAIRE, DOCUMENTS_REQUIS_FOURNISSEUR,
  P6_STATUS_LABELS,
} from "./registry";
import { P6ScoringService, P6FicheInput } from "./scoring.service";

/**
 * P6 endpoints publics — registry + scoring
 *  GET  /p6/types               → 2 types fiche (PRESTATAIRE_SERVICE / FOURNISSEUR_MATERIAUX)
 *  GET  /p6/classes-btp         → 7 classes BTP Maroc
 *  GET  /p6/categories-agrement → catégories METLE (A/B/C/D/E)
 *  GET  /p6/specialites         → spécialités hors BTP (architecte, géomètre…)
 *  GET  /p6/documents-requis    → liste docs par type fiche
 *  POST /p6/scoring             → calcule le score d'une fiche P6 (preview)
 */
@Tome("tome7")
@Controller("p6")
export class P6RegistryController {
  constructor(private readonly scoring: P6ScoringService) {}

  @Get("types")
  types() {
    return { ok: true, items: P6_TYPES };
  }

  @Get("classes-btp")
  classesBtp() {
    return { ok: true, items: CLASSES_BTP };
  }

  @Get("categories-agrement")
  categoriesAgrement() {
    return { ok: true, items: CATEGORIES_AGREMENT };
  }

  @Get("specialites")
  specialites() {
    return { ok: true, items: SPECIALITES_PRESTATAIRE };
  }

  @Get("documents-requis")
  documentsRequis() {
    return {
      ok: true,
      PRESTATAIRE_SERVICE: DOCUMENTS_REQUIS_PRESTATAIRE,
      FOURNISSEUR_MATERIAUX: DOCUMENTS_REQUIS_FOURNISSEUR,
    };
  }

  @Get("status-labels")
  statusLabels() {
    return { ok: true, items: P6_STATUS_LABELS };
  }

  @Post("scoring")
  scoringPreview(@Body() input: P6FicheInput) {
    try {
      return { ok: true, ...this.scoring.computeScore(input) };
    } catch (e: any) {
      return { ok: false, error: e.message || "Erreur scoring" };
    }
  }
}
