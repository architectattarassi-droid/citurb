import { Body, Controller, Get, Post } from "@nestjs/common";
import { Tome } from "../../tome-at";
import { P5PricingService, P5QuoteInput } from "./pricing.service";

/**
 * P5 Quote — endpoints publics (sans auth) pour le devis avant inscription.
 *
 *  GET  /p5/reports        → liste des 4 types de rapports + tarifs base
 *  POST /p5/quote          → devis détaillé pour un type + délai + surface
 */
@Tome("tome6")
@Controller("p5")
export class P5QuoteController {
  constructor(private readonly pricing: P5PricingService) {}

  @Get("reports")
  reports() {
    return { ok: true, items: this.pricing.listReports() };
  }

  @Post("quote")
  quote(@Body() input: P5QuoteInput) {
    try {
      return this.pricing.computeQuote(input);
    } catch (e: any) {
      return { ok: false, error: e.message || "Erreur de calcul" };
    }
  }
}
