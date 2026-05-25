"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SigController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const sig_data_service_1 = require("./sig-data.service");
const zone_detector_service_1 = require("./zone-detector.service");
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
let SigController = class SigController {
    sig;
    detector;
    constructor(sig, detector) {
        this.sig = sig;
        this.detector = detector;
    }
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
    getDgiZones(cityId, res) {
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
    getOsmQuartiers(res) {
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
    getDgiZonesGeo(cityFile, res) {
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
        const polyCodes = new Set((osmPolys?.features || []).map((f) => f.properties?.code));
        const mergedFeatures = [
            ...(osmPolys?.features || []),
            ...(nominatimPoints?.features || []).filter((f) => !polyCodes.has(f.properties?.code)),
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
    async autoDetectZone(lat, lng, commune, region, bienFamily, address, res) {
        const result = await this.detector.detect({
            lat: lat != null ? +lat : undefined,
            lng: lng != null ? +lng : undefined,
            commune,
            region,
            bienFamily: bienFamily,
            address,
        });
        res?.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
        res?.json(result);
    }
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
    listReferences(region, province, commune, cityId, res) {
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
    async listAdmin(level, region, province, res) {
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
    async getLayer(source, layerWithExt, res) {
        // layerWithExt = "28.geojson" — on retire le suffixe
        const layer = layerWithExt.replace(/\.geojson$/i, "");
        const data = await this.sig.getLayerGeoJson(source, layer);
        // Cache CDN agressif côté Railway / Cloudflare
        res.setHeader("Content-Type", "application/geo+json; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
        res.send(JSON.stringify(data));
    }
};
exports.SigController = SigController;
__decorate([
    (0, common_1.Get)("dgi-cities"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SigController.prototype, "listDgiCities", null);
__decorate([
    (0, common_1.Get)("dgi-zones/:cityId"),
    __param(0, (0, common_1.Param)("cityId")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SigController.prototype, "getDgiZones", null);
__decorate([
    (0, common_1.Get)("osm-quartiers.geojson"),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SigController.prototype, "getOsmQuartiers", null);
__decorate([
    (0, common_1.Get)("dgi-zones-geo/:cityFile"),
    __param(0, (0, common_1.Param)("cityFile")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SigController.prototype, "getDgiZonesGeo", null);
__decorate([
    (0, common_1.Get)("auto-detect-zone"),
    __param(0, (0, common_1.Query)("lat")),
    __param(1, (0, common_1.Query)("lng")),
    __param(2, (0, common_1.Query)("commune")),
    __param(3, (0, common_1.Query)("region")),
    __param(4, (0, common_1.Query)("bienFamily")),
    __param(5, (0, common_1.Query)("address")),
    __param(6, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], SigController.prototype, "autoDetectZone", null);
__decorate([
    (0, common_1.Get)("sources"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SigController.prototype, "listSources", null);
__decorate([
    (0, common_1.Get)("references"),
    __param(0, (0, common_1.Query)("region")),
    __param(1, (0, common_1.Query)("province")),
    __param(2, (0, common_1.Query)("commune")),
    __param(3, (0, common_1.Query)("cityId")),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], SigController.prototype, "listReferences", null);
__decorate([
    (0, common_1.Get)("admin/:level"),
    __param(0, (0, common_1.Param)("level")),
    __param(1, (0, common_1.Query)("region")),
    __param(2, (0, common_1.Query)("province")),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], SigController.prototype, "listAdmin", null);
__decorate([
    (0, common_1.Get)(":source/:layerWithExt"),
    __param(0, (0, common_1.Param)("source")),
    __param(1, (0, common_1.Param)("layerWithExt")),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SigController.prototype, "getLayer", null);
exports.SigController = SigController = __decorate([
    (0, tome_at_1.Tome)("tome0"),
    (0, common_1.Controller)("api/sig"),
    __metadata("design:paramtypes", [sig_data_service_1.SigDataService,
        zone_detector_service_1.ZoneDetectorService])
], SigController);
