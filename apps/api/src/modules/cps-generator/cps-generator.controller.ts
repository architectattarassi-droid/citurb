import { Body, Controller, Get, Header, HttpCode, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { Tome } from "../../tomes/tome-at";
import { CpsGenerateInput, CpsGeneratorService, CpsLang } from "./cps-generator.service";
import { CpsMarketplaceService } from "./cps-marketplace.service";

function coerceLang(v?: string): CpsLang {
  return v === "ar" || v === "en" ? v : "fr";
}

/**
 * Tome 2 — Générateur de CPS (Cahier des Prescriptions Spéciales).
 *
 *  - GET  /api/cps/project-types     liste des types de projet disponibles
 *  - GET  /api/cps/lots              liste des lots techniques rédigés
 *  - POST /api/cps/generate          génère le CPS (markdown + html + méta)
 *  - POST /api/cps/generate/html     génère et renvoie le HTML imprimable
 */
@Tome("tome2")
@Controller("api/cps")
export class CpsGeneratorController {
  constructor(
    private readonly service: CpsGeneratorService,
    private readonly marketplace: CpsMarketplaceService,
  ) {}

  @Get("project-types")
  async projectTypes(@Query("lang") lang?: string) {
    const items = await this.service.listProjectTypes(coerceLang(lang));
    return { items, total: items.length };
  }

  @Get("lots")
  async lots(@Query("lang") lang?: string) {
    const items = await this.service.listLots(coerceLang(lang));
    return { items, total: items.length };
  }

  @Post("generate")
  @HttpCode(200)
  async generate(@Body() body: CpsGenerateInput) {
    return this.service.generate(body);
  }

  @Post("generate/html")
  @HttpCode(200)
  @Header("Content-Type", "text/html; charset=utf-8")
  async generateHtml(@Body() body: CpsGenerateInput, @Res() res: Response) {
    const doc = await this.service.generate(body);
    res.send(doc.html);
  }

  // ── Pont marketplace ──────────────────────────────────────────

  /** Recherche fédérée catalogue + marketplace pour un poste de CPS. */
  @Post("marketplace/match")
  @HttpCode(200)
  async match(
    @Body()
    body: { query: string; famille?: string; unite?: string; region?: string; limit?: number },
  ) {
    if (!body?.query) return { keywords: [], matches: [] };
    return this.marketplace.match(body);
  }

  /**
   * Génère le CPS puis renvoie le bordereau chiffré (produits + prix de
   * référence par poste, suivant les spécifications pré-rédigées).
   */
  @Post("bordereau-chiffre")
  @HttpCode(200)
  async bordereauChiffre(@Body() body: CpsGenerateInput & { region?: string }) {
    const doc = await this.service.generate(body);
    const priced = await this.marketplace.priceBordereau(doc.bordereau, body.region);
    return {
      projectTypeCode: doc.projectTypeCode,
      projectTypeLabel: doc.projectTypeLabel,
      projectName: doc.projectName,
      lang: doc.lang,
      region: body.region || "06_CASABLANCA_SETTAT",
      postesCount: priced.length,
      postesChiffres: priced.filter((r) => r.best).length,
      bordereau: priced,
    };
  }
}
