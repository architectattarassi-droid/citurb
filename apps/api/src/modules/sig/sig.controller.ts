import { Controller, Get, Param, Query, Res } from "@nestjs/common";
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

  /**
   * Liste plate (sans geometry) des régions / provinces / communes.
   * Utilisée par les wizards P1/P2/P5 pour les dropdowns en cascade.
   *
   *   GET /api/sig/admin/regions
   *   GET /api/sig/admin/provinces?region=01
   *   GET /api/sig/admin/communes?province=01.001
   */
  @Get("admin/:level")
  async listAdmin(
    @Param("level") level: "regions" | "provinces" | "communes",
    @Query("region") region?: string,
    @Query("province") province?: string,
    @Res() res?: Response,
  ) {
    if (!["regions", "provinces", "communes"].includes(level)) {
      res?.status(400).json({ ok: false, error: "level must be regions|provinces|communes" });
      return;
    }
    const parent = level === "provinces" ? region : level === "communes" ? province : undefined;
    const items = await this.sig.listAdmin(level, parent);
    // Court — les artéfacts peuvent être ajustés en cours d'exploitation,
    // on ne veut pas qu'un cache CDN serve la liste pendant 24 h.
    res?.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
    res?.json({ ok: true, level, count: items.length, items });
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
