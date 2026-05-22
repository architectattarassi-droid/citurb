"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SigDataService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SigDataService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
/** Couches utiles du PA AURS Rabat-Salé (sélection — on en exposera plus si besoin). */
const SOURCES = {
    aurs: {
        id: "aurs",
        label: "Plan d'Aménagement — Agence Urbaine Rabat-Salé",
        region: "Rabat-Salé-Kénitra",
        baseUrl: "https://geoportail.aurs.org.ma/server/rest/services/PA_AURS/PROD_PA_AURS/MapServer",
        layers: {
            "28": { label: "Lotissements", geomType: "polygon", color: "#f59e0b", description: "Lotissements existants et projetés (PA Rabat-Salé)" },
            "32": { label: "Zonage réglementaire", geomType: "polygon", color: "#3b82f6", description: "Zonage du PA (urbain, industriel, équipements, etc.)" },
            "31": { label: "Secteurs urbains", geomType: "polygon", color: "#8b5cf6", description: "Sectorisation du PA" },
            "29": { label: "Îlots", geomType: "polygon", color: "#06b6d4", description: "Découpage par îlots" },
            "10": { label: "Limite du PA", geomType: "polygon", color: "#0B1B3A", description: "Périmètre du Plan d'Aménagement" },
            "1": { label: "Zones non aedificandi", geomType: "polygon", color: "#ef4444", description: "Zones non constructibles" },
            "25": { label: "Espaces verts", geomType: "polygon", color: "#22c55e", description: "Espaces verts publics" },
            "23": { label: "Équipements publics", geomType: "polygon", color: "#a855f7", description: "Équipements publics planifiés" },
            "27": { label: "Voiries", geomType: "line", color: "#dc2626", description: "Voiries projetées et existantes" },
        },
    },
};
let SigDataService = SigDataService_1 = class SigDataService {
    logger = new common_1.Logger(SigDataService_1.name);
    cache = new Map();
    TTL_MS = 24 * 60 * 60 * 1000; // 24 h
    MAX_FEATURES = 4000;
    listSources() {
        return Object.values(SOURCES).map(s => ({
            id: s.id,
            label: s.label,
            region: s.region,
            layers: Object.entries(s.layers).map(([id, l]) => ({ id, ...l })),
        }));
    }
    /**
     * Récupère une couche en GeoJSON. Stratégie :
     *   1. Cache RAM (24 h)
     *   2. Tentative fetch live vers la source (PA homologué fraîcheur ↑)
     *   3. Fallback fichier statique committé dans le repo
     *      (apps/api/data/sig-static/<source>/<layer>.geojson)
     *
     * Les fichiers statiques sont pré-fetchés depuis une machine en zone
     * autorisée (Maroc), car certains services IIS bloquent les IP étrangères
     * (cas observé pour geoportail.aurs.org.ma depuis Railway US-West).
     */
    async getLayerGeoJson(sourceId, layerId) {
        const src = SOURCES[sourceId];
        if (!src)
            throw new common_1.BadRequestException(`Source inconnue: ${sourceId}`);
        if (!src.layers[layerId])
            throw new common_1.BadRequestException(`Couche ${layerId} introuvable pour ${sourceId}`);
        const cacheKey = `${sourceId}:${layerId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expires > now)
            return cached.data;
        const url = `${src.baseUrl}/${layerId}/query` +
            `?where=1%3D1&outFields=*&f=geojson&outSR=4326` +
            `&resultRecordCount=${this.MAX_FEATURES}&returnGeometry=true`;
        // Fallback statique (priorité 3) — chargé une fois et mis en cache RAM
        const staticData = this.tryLoadStatic(sourceId, layerId);
        try {
            const res = await fetch(url, {
                headers: {
                    // IIS/ASP.NET filtre certains User-Agent non-navigateur en retournant
                    // Content-Length:0. On passe un User-Agent Mozilla réaliste pour
                    // garantir une réponse complète.
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    "Accept": "application/json, application/geo+json, */*",
                    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
                },
                // 30 s — les services ArcGIS peuvent être lents sur les gros polygones
                signal: AbortSignal.timeout(30_000),
            });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            // Tag métadonnée pour traçabilité côté front (attribution, source, fraîcheur)
            const enriched = {
                ...data,
                _meta: {
                    source: sourceId,
                    layer: layerId,
                    label: src.layers[layerId].label,
                    region: src.region,
                    fetchedAt: new Date(now).toISOString(),
                    featureCount: Array.isArray(data?.features) ? data.features.length : 0,
                },
            };
            this.cache.set(cacheKey, { data: enriched, expires: now + this.TTL_MS });
            return enriched;
        }
        catch (e) {
            this.logger.warn(`SIG fetch failed [${cacheKey}]: ${e?.message || e}`);
            // Fallback 1 : cache stale
            if (cached)
                return { ...cached.data, _meta: { ...cached.data._meta, stale: true, error: e?.message } };
            // Fallback 2 : fichier statique committé dans le repo
            if (staticData) {
                const enriched = {
                    ...staticData,
                    _meta: {
                        source: sourceId, layer: layerId,
                        label: src.layers[layerId].label, region: src.region,
                        fromStatic: true,
                        error: e?.message,
                        featureCount: Array.isArray(staticData?.features) ? staticData.features.length : 0,
                    },
                };
                this.cache.set(cacheKey, { data: enriched, expires: now + this.TTL_MS });
                return enriched;
            }
            throw new common_1.BadRequestException(`Source distante indisponible : ${e?.message || "inconnu"}`);
        }
    }
    /** Charge le GeoJSON statique committé dans le repo (fallback geo-block). */
    tryLoadStatic(sourceId, layerId) {
        try {
            // Cherche dans plusieurs racines possibles (dev vs Docker prod)
            const candidates = [
                (0, path_1.join)(process.cwd(), "data", "sig-static", sourceId, `${layerId}.geojson`),
                (0, path_1.join)(process.cwd(), "apps", "api", "data", "sig-static", sourceId, `${layerId}.geojson`),
                (0, path_1.join)(__dirname, "..", "..", "..", "data", "sig-static", sourceId, `${layerId}.geojson`),
            ];
            for (const p of candidates) {
                if ((0, fs_1.existsSync)(p)) {
                    const raw = (0, fs_1.readFileSync)(p, "utf8");
                    return JSON.parse(raw);
                }
            }
        }
        catch (e) {
            this.logger.warn(`Static SIG load failed [${sourceId}:${layerId}]: ${e?.message}`);
        }
        return null;
    }
};
exports.SigDataService = SigDataService;
exports.SigDataService = SigDataService = SigDataService_1 = __decorate([
    (0, common_1.Injectable)()
], SigDataService);
