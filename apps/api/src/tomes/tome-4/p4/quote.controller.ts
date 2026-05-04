import { Body, Controller, Get, Post } from "@nestjs/common";
import { Tome } from "../../tome-at";
import { P4PricingService, P4QuoteInput } from "./pricing.service";

/**
 * P4 Quote — endpoints publics (sans auth) pour le devis.
 *  GET  /p4/packs   → liste 3 packs (BASIQUE / MOYEN / RENTABILITE)
 *  POST /p4/quote   → devis détaillé selon prix vente foncier
 */
@Tome("tome4")
@Controller("p4")
export class P4QuoteController {
  constructor(private readonly pricing: P4PricingService) {}

  @Get("packs")
  packs() {
    return { ok: true, items: this.pricing.listPacks() };
  }

  @Post("quote")
  quote(@Body() input: P4QuoteInput) {
    try {
      return this.pricing.computeQuote(input);
    } catch (e: any) {
      return { ok: false, error: e.message || "Erreur de calcul" };
    }
  }
}
