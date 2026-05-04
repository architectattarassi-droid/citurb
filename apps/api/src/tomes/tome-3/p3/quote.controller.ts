import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { Tome } from "../../tome-at";
import { P3PricingService, P3QuoteInput } from "./pricing.service";
import { listCorpsMetiersGrouped, maxCorpsMetiers, CORPS_METIERS } from "./corps-metiers";

/**
 * P3 Quote — endpoints publics (sans auth) pour le devis MOD.
 *  GET  /p3/corps-metiers           → liste des corps de métiers (groupés)
 *  GET  /p3/corps-metiers/count     → nombre total
 *  POST /p3/quote                    → devis P3 (10% du coût de réalisation)
 *
 * Note: pour le formulaire, on réutilise le /p2/categories et /p2/quote
 * pour récupérer les catégories CNOA (source de vérité unique).
 */
@Tome("tome3")
@Controller("p3")
export class P3QuoteController {
  constructor(private readonly pricing: P3PricingService) {}

  @Get("corps-metiers")
  corpsMetiers(@Query("groupe") groupe?: string) {
    if (groupe) {
      const filtered = CORPS_METIERS.filter(c => c.groupe === groupe);
      return { ok: true, items: filtered };
    }
    return { ok: true, groupes: listCorpsMetiersGrouped(), max: maxCorpsMetiers() };
  }

  @Post("quote")
  quote(@Body() input: P3QuoteInput) {
    try {
      return this.pricing.computeQuote(input);
    } catch (e: any) {
      return { ok: false, error: e.message || "Erreur de calcul" };
    }
  }
}
