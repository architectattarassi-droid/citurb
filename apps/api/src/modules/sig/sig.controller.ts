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
  /**
   * Polygones DGI VECTORISÉS depuis les PDFs cartographiques (PoC interne).
   *
   *   GET /api/sig/dgi-zones-poc/rabat-souissi.geojson
   *
   * Pipeline : mupdf-js → segmentation HSV → Moore-Neighbor tracing →
   * Douglas-Peucker → affine pixel→WGS84. Précision actuelle ~200m (bbox
   * approx.) — itération suivante : homographie 4-GCPs pour <30m.
   *
   * Sert directement les fichiers GeoJSON déposés dans
   * `apps/api/data/sig-static/dgi-zones-poc/`.
   */
  @Get("dgi-zones-poc/:file")
  getDgiZonesPoc(@Param("file") file: string, @Res() res: Response) {
    const name = file.replace(/\.geojson$/i, "");
    const data = this.sig["loadJsonStatic"](`dgi-zones-poc/${name}.geojson`);
    if (!data) {
      res.status(404).json({ ok: false, error: `Aucun PoC vectorisation disponible pour « ${name} »` });
      return;
    }
    res.setHeader("Content-Type", "application/geo+json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.send(JSON.stringify(data));
  }

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

  /**
   * Détecteur d'anomalies prix — "Trop beau pour être vrai" (Shield anti-arnaque).
   *
   *   GET /api/sig/price-anomaly?lat=&lng=&priceMad=&surfaceM2=&bienFamily=
   *
   * Pour un terrain/bien donné, compare le prix déclaré au prix de marché 2026
   * estimé (DGI 2017 × IPAI BAM × multiplicateur destination). Calcule un
   * z-score local et flag les anomalies :
   *   - SUSPICIOUS_LOW  : prix < -2σ (sous-évaluation > 40% — risque arnaque, faux titre, vice caché)
   *   - UNDERPRICED     : prix < -1σ (sous-évaluation 20-40% — bonne affaire ou problème ?)
   *   - NORMAL          : prix dans ±1σ
   *   - OVERPRICED      : prix > +1σ (surévaluation 20-40% — marge négociation)
   *   - SUSPICIOUS_HIGH : prix > +2σ (surévaluation > 40% — risque escroquerie, manipulation)
   *
   * Endpoint public (utilisable depuis wizards et explorateur SIG).
   */
  @Get("price-anomaly")
  async detectPriceAnomaly(
    @Query("lat") lat?: string,
    @Query("lng") lng?: string,
    @Query("priceMad") priceMad?: string,
    @Query("surfaceM2") surfaceM2?: string,
    @Query("bienFamily") bienFamily?: string,
    @Query("commune") commune?: string,
    @Res() res?: Response,
  ) {
    const latNum = lat ? +lat : undefined;
    const lngNum = lng ? +lng : undefined;
    const priceNum = priceMad ? +priceMad : NaN;
    const surfaceNum = surfaceM2 ? +surfaceM2 : NaN;

    if (!isFinite(priceNum) || priceNum <= 0 || !isFinite(surfaceNum) || surfaceNum <= 0) {
      res?.status(400).json({ ok: false, error: "priceMad et surfaceM2 sont requis et doivent être > 0" });
      return;
    }

    // 1. Détecter la zone via le service existant
    const zone = await this.detector.detect({
      lat: latNum, lng: lngNum, commune,
      bienFamily: bienFamily as any,
    });

    // 2. Extraire le prix de référence 2026 estimé (DH/m²)
    const ref = (zone as any)?.suggestion?.pt2026Ref
              || (zone as any)?.suggestion?.midRef
              || (zone as any)?.pt2026Ref
              || null;

    if (!ref || !isFinite(+ref)) {
      res?.json({
        ok: true,
        verdict: "INSUFFICIENT_DATA",
        message: "Pas de référentiel DGI disponible pour cette zone — impossible de calculer l'anomalie.",
        zone,
      });
      return;
    }

    const refPerM2 = +ref;
    const declaredPerM2 = priceNum / surfaceNum;
    const ratio = declaredPerM2 / refPerM2;
    // Hypothèse : σ = 20% de la moyenne marché (volatilité typique foncier MA)
    const sigmaPct = 0.20;
    const zScore = (ratio - 1) / sigmaPct;
    const deviationPct = (ratio - 1) * 100;

    let verdict: string;
    let severity: "info" | "warning" | "danger";
    let message: string;
    let recommendation: string;
    let emoji: string;

    if (zScore < -2) {
      verdict = "SUSPICIOUS_LOW";
      severity = "danger";
      emoji = "🚨";
      message = `Prix déclaré ${Math.abs(deviationPct).toFixed(0)}% SOUS le marché — anomalie majeure.`;
      recommendation = `Vérifications urgentes : (1) authentifier le titre foncier auprès de l'ANCFCC, (2) lire avec attention les charges et servitudes, (3) faire un état des lieux contradictoire avant signature. Ce niveau d'écart cache souvent un vice caché, un litige successoral ou un faux titre.`;
    } else if (zScore < -1) {
      verdict = "UNDERPRICED";
      severity = "warning";
      emoji = "⚠️";
      message = `Prix déclaré ${Math.abs(deviationPct).toFixed(0)}% sous le marché — bonne affaire à vérifier.`;
      recommendation = `Avantage compétitif notable, mais à valider : raison de la baisse (héritage urgent, départ vendeur, contentieux ?), état réel, zone à risque (érosion, urbanisme en révision) ?`;
    } else if (zScore <= 1) {
      verdict = "NORMAL";
      severity = "info";
      emoji = "✅";
      message = `Prix déclaré aligné avec le marché 2026 (écart ${deviationPct >= 0 ? "+" : ""}${deviationPct.toFixed(0)}%).`;
      recommendation = `Niveau de prix cohérent avec la zone. Marge de négociation typique : ±10%.`;
    } else if (zScore <= 2) {
      verdict = "OVERPRICED";
      severity = "warning";
      emoji = "💰";
      message = `Prix déclaré ${deviationPct.toFixed(0)}% au-dessus du marché — marge de négociation.`;
      recommendation = `Potentiel de négociation important. Préparez un dossier d'arguments : comparables récents de la zone, écart vs DGI 2017 × IPAI 2026, défauts à charge du vendeur.`;
    } else {
      verdict = "SUSPICIOUS_HIGH";
      severity = "danger";
      emoji = "🚩";
      message = `Prix déclaré ${deviationPct.toFixed(0)}% au-dessus du marché — anomalie majeure.`;
      recommendation = `Plusieurs scénarios possibles : (1) bien d'exception non capté par le référentiel (résidence haut-standing, vue exceptionnelle), (2) survalorisation pour blanchiment / surfacturation immobilière, (3) tentative d'escroquerie. Faites évaluer indépendamment par un expert agréé avant tout engagement.`;
    }

    res?.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
    res?.json({
      ok: true,
      verdict,
      severity,
      emoji,
      message,
      recommendation,
      details: {
        declaredPriceMad: priceNum,
        declaredPerM2,
        marketRefPerM2: refPerM2,
        deviationPct: +deviationPct.toFixed(1),
        zScore: +zScore.toFixed(2),
        sigmaAssumed: sigmaPct,
      },
      zone: {
        code: (zone as any)?.suggestion?.zoneCode || (zone as any)?.zoneCode,
        source: (zone as any)?.suggestion?.source || "DGI 2017 × IPAI BAM 2026",
      },
      _disclaimer: "Détecteur statistique CITURBAREA basé sur référentiels DGI 2017 corrigés IPAI BAM 2026. Indication uniquement — ne se substitue pas à une expertise foncière agréée.",
    });
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
