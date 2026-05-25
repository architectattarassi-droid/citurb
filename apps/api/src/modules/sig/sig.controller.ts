import { Controller, Get, Param, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { Tome } from "../../tomes/tome-at";
import { SigDataService } from "./sig-data.service";
import { ZoneDetectorService } from "./zone-detector.service";

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
  constructor(
    private readonly sig: SigDataService,
    private readonly detector: ZoneDetectorService,
  ) {}

  /**
   * Auto-détection du zoning + fourchette de prix pour un terrain donné.
   *
   *   GET /api/sig/auto-detect-zone?lat=&lng=&commune=&region=&bienFamily=
   *
   * Renvoie le zoning officiel détecté (PA AURS si dans la zone couverte),
   * le tier de prix suggéré + fourchette DH/m² (avec multiplicateur destination),
   * la chaîne de raisonnement et les sources officielles (PA + DGI + AU).
   *
   * Endpoint public (utilisé dans les wizards P1/P2/P5 dès qu'on a une géoloc).
   * GET car c'est une lecture pure (pas une mutation) — évite la MutationGate.
   */
  /**
   * Catalogue des villes ayant un référentiel DGI extrait (parsing PDF).
   *
   *   GET /api/sig/dgi-cities
   */
  @Get("dgi-cities")
  listDgiCities() {
    return { ok: true, cities: this.sig.listDgiZoneCities() };
  }

  /**
   * Détail des zones DGI d'une ville (parsing PDF Niveau 2).
   *
   *   GET /api/sig/dgi-zones/rabat
   *
   * Retourne : _meta (source PDF + dates), arrondissements, zones[] avec
   * code, délimitations textuelles, avenues extraites, prix DGI complets
   * (terrain/villa/appartement × ancien/récent/neuf × superficie).
   */
  @Get("dgi-zones/:cityId")
  getDgiZones(@Param("cityId") cityId: string, @Res() res: Response) {
    const data = this.sig.getDgiZones(cityId);
    if (!data) {
      res.status(404).json({ ok: false, error: `Aucune extraction DGI disponible pour « ${cityId} ». Voir /api/sig/dgi-cities pour la liste.` });
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.json({ ok: true, ...data });
  }

  /**
   * Catalogue OSM des quartiers du Maroc (admin_level 9-10 + place=suburb/quarter/
   * neighbourhood). Extrait via Overpass API — 1 835 quartiers / suburbs / arrondissements
   * couvrant tout le territoire. Source ODbL, indépendante (pas de convention).
   *
   *   GET /api/sig/osm-quartiers.geojson
   */
  @Get("osm-quartiers.geojson")
  getOsmQuartiers(@Res() res: Response) {
    const data = this.sig["loadJsonStatic"]("osm-quartiers-ma.geojson");
    if (!data) {
      res.status(404).json({ ok: false, error: "OSM quartiers MA non disponible" });
      return;
    }
    res.setHeader("Content-Type", "application/geo+json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.send(JSON.stringify(data));
  }

  /**
   * Zones DGI géocodées par ville — markers GeoJSON aux centroïdes Nominatim
   * des avenues délimitantes. Permet d'AFFICHER les zones DGI sur la carte
   * (pas juste un dropdown texte).
   *
   *   GET /api/sig/dgi-zones-geo/rabat.geojson
   *   GET /api/sig/dgi-zones-geo/casablanca.geojson
   *   etc.
   *
   * Chaque feature = 1 zone DGI avec ses propriétés (code, prix DGI 2017,
   * délimitations textuelles, etc.). Coordonnées approximatives (~100-500m).
   */
  @Get("dgi-zones-geo/:cityFile")
  getDgiZonesGeo(@Param("cityFile") cityFile: string, @Res() res: Response) {
    // cityFile = "rabat.geojson" — on garde l'extension pour l'URL
    const id = cityFile.replace(/\.geojson$/i, "");
    // Préfère les POLYGONES OSM matchés (~20% des zones, précision 10-30m)
    // Fallback sur les POINTS Nominatim (~14% supplémentaires, précision 100-500m)
    // Idéalement on fusionne les deux dans une seule FeatureCollection.
    const osmPolys = this.sig["loadJsonStatic"](`dgi-zones-osm/${id}.geojson`);
    const nominatimPoints = this.sig["loadJsonStatic"](`dgi-zones-geo/${id}.geojson`);

    if (!osmPolys && !nominatimPoints) {
      res.status(404).json({ ok: false, error: `Aucune géocodification disponible pour « ${id} »` });
      return;
    }

    // Fusion : OSM polygones prioritaires, points Nominatim en complément
    const polyCodes = new Set((osmPolys?.features || []).map((f: any) => f.properties?.code));
    const mergedFeatures = [
      ...(osmPolys?.features || []),
      ...(nominatimPoints?.features || []).filter((f: any) => !polyCodes.has(f.properties?.code)),
    ];

    const merged = {
      type: "FeatureCollection",
      _meta: {
        city: osmPolys?._meta?.city || nominatimPoints?._meta?.city || id,
        sources: {
          osmPolygons: osmPolys?._meta?.stats || null,
          nominatimPoints: nominatimPoints?._meta?.stats || null,
        },
        totalFeatures: mergedFeatures.length,
        polygons: (osmPolys?.features || []).length,
        points: mergedFeatures.length - (osmPolys?.features || []).length,
      },
      features: mergedFeatures,
    };

    res.setHeader("Content-Type", "application/geo+json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.send(JSON.stringify(merged));
  }

  @Get("auto-detect-zone")
  async autoDetectZone(
    @Query("lat") lat?: string,
    @Query("lng") lng?: string,
    @Query("commune") commune?: string,
    @Query("region") region?: string,
    @Query("bienFamily") bienFamily?: string,
    @Query("address") address?: string,
    @Res() res?: Response,
  ) {
    const result = await this.detector.detect({
      lat: lat != null ? +lat : undefined,
      lng: lng != null ? +lng : undefined,
      commune,
      region,
      bienFamily: bienFamily as any,
      address,
    });
    res?.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
    res?.json(result);
  }

  @Get("sources")
  listSources() {
    return { ok: true, sources: this.sig.listSources() };
  }

  /**
   * Référentiels officiels DGI / ANCFCC / Taamir / agences urbaines par ville.
   *
   *   GET /api/sig/references                            — registre complet
   *   GET /api/sig/references?cityId=casablanca          — filtrage par ville
   *   GET /api/sig/references?region=Casablanca-Settat   — filtrage par région
   *   GET /api/sig/references?commune=Rabat              — filtrage fuzzy commune
   *
   * Niveau 1 du module SIG-référentiels : aucun fichier hébergé, uniquement
   * les URLs canoniques (DGI portail.tax.gov.ma, ANCFCC, Fiscamaroc miroir,
   * Taamir, AURS/AUC). Niveau 2 (parsing PDFs → polygones zones tarifaires)
   * et Niveau 3 (convention B2B ANCFCC) sont dans le champ roadmap retourné.
   */
  @Get("references")
  listReferences(
    @Query("region") region?: string,
    @Query("province") province?: string,
    @Query("commune") commune?: string,
    @Query("cityId") cityId?: string,
    @Res() res?: Response,
  ) {
    const result = this.sig.listReferences({ region, province, commune, cityId });
    res?.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    res?.json(result);
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
