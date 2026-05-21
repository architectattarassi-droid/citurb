import { Controller, Get, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { Tome } from "../../tomes/tome-at";
import { SigDataService } from "./sig-data.service";

/**
 * SigController — expose les couches SIG publiques institutionnelles
 * marocaines via notre propre origine (doctrine : aucune redirection externe).
 *
 *  GET /api/sig/sources                       — liste des sources et couches dispo
 *  GET /api/sig/:source/:layer.geojson        — couche GeoJSON (cache 24 h)
 *
 * Tous les endpoints sont publics (pas d'auth) pour permettre l'affichage
 * de la carte SIG dans les wizards P1/P2/P5 sans login. Les données servies
 * sont elles-mêmes publiques (PA homologués au sens loi 12-90).
 */
@Tome("tome0")
@Controller("api/sig")
export class SigController {
  constructor(private readonly sig: SigDataService) {}

  @Get("sources")
  listSources() {
    return { ok: true, sources: this.sig.listSources() };
  }

  @Get(":source/:layerWithExt")
  async getLayer(
    @Param("source") source: string,
    @Param("layerWithExt") layerWithExt: string,
    @Res() res: Response,
  ) {
    // layerWithExt = "28.geojson" — on retire le suffixe
    const layer = layerWithExt.replace(/\.geojson$/i, "");
    const data = await this.sig.getLayerGeoJson(source, layer);
    // Cache CDN agressif côté Railway / Cloudflare
    res.setHeader("Content-Type", "application/geo+json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.send(JSON.stringify(data));
  }
}
