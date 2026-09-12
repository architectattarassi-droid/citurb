import { BadRequestException, Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ErreurDevis } from "@citurbarea/pricing-cnoa";
import { Tome } from "../../tome-at";
import { P2PricingService, P2QuoteInput, P2Section } from "./pricing.service";

/**
 * QuoteController — Devis publique P2 (sans auth, comme P1 packs/quote)
 *
 * Endpoints:
 *  - GET  /p2/categories?section=IMM|GR|EPIG|AMG  → catégories du barème,
 *         avec leurs niveaux et fourchettes de coût réel
 *  - POST /p2/quote                                → calcul honoraires
 *
 * Une saisie invalide (catégorie inconnue, niveau absent ou étranger à la
 * catégorie, surface manquante) sort en 400 : le front ne doit jamais recevoir
 * un devis calculé sur une valeur de repli silencieuse.
 */
@Tome("tome2")
@Controller("p2")
export class QuoteController {
  constructor(private readonly pricing: P2PricingService) {}

  @Get("categories")
  categories(@Query("section") section: P2Section) {
    if (!section || !["IMM", "GR", "LOT", "EPIG", "AMG"].includes(section)) {
      return { ok: false, error: "section invalide (IMM|GR|LOT|EPIG|AMG)" };
    }
    return { ok: true, section, items: this.pricing.listCategories(section) };
  }

  @Post("quote")
  quote(@Body() input: P2QuoteInput) {
    try {
      return this.pricing.computeQuote(input);
    } catch (e: any) {
      if (e instanceof ErreurDevis) {
        throw new BadRequestException({ ok: false, error: e.code, message: e.message });
      }
      return { ok: false, error: e?.message || "Erreur de calcul" };
    }
  }
}
