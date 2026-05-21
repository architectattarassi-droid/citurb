import { Injectable, BadRequestException, Logger } from "@nestjs/common";

/**
 * SigDataService — proxy + cache des couches SIG provenant de portails
 * institutionnels marocains diffusant leurs données publiques.
 *
 * Doctrine CITURBAREA : aucune redirection externe côté client. Toutes les
 * requêtes vers les MapServer/FeatureServer/WMS distants sont effectuées
 * côté serveur ; le résultat est mis en cache et servi via nos endpoints
 * /api/sig/:source/:layer.geojson.
 *
 * Sources confirmées en production (testées 2026-05) :
 *   - AURS Rabat-Salé : ArcGIS MapServer public, 36 couches du PA en vecteur
 *     (Lotissements, Zonages, Voiries, Espaces Verts, Équipements, etc.)
 *
 * À étendre quand on a validé d'autres sources :
 *   - AUDRSO, CSRNO, VSH (ArcGIS Hub)
 *   - Karaz GeoServer multi-tenant (à reconfirmer techniquement)
 *   - docurbainonline (PDF — pipeline géoréférencement séparé)
 */

type SourceCfg = {
  /** Identifiant court utilisé dans l'URL */
  id: string;
  /** Nom lisible */
  label: string;
  /** Région couverte (info pour affichage / filtrage) */
  region: string;
  /** Base URL du MapServer ArcGIS (sans /<layerId>) */
  baseUrl: string;
  /** Layers disponibles (id ArcGIS → métadonnées d'affichage) */
  layers: Record<string, {
    label: string;
    geomType: "polygon" | "line" | "point";
    /** Couleur de remplissage CSS (transparence ajoutée par le frontend) */
    color: string;
    /** Description courte affichée dans le toggle UI */
    description?: string;
  }>;
};

/** Couches utiles du PA AURS Rabat-Salé (sélection — on en exposera plus si besoin). */
const SOURCES: Record<string, SourceCfg> = {
  aurs: {
    id: "aurs",
    label: "Plan d'Aménagement — Agence Urbaine Rabat-Salé",
    region: "Rabat-Salé-Kénitra",
    baseUrl: "https://geoportail.aurs.org.ma/server/rest/services/PA_AURS/PROD_PA_AURS/MapServer",
    layers: {
      "28": { label: "Lotissements",                 geomType: "polygon", color: "#f59e0b", description: "Lotissements existants et projetés (PA Rabat-Salé)" },
      "32": { label: "Zonage réglementaire",         geomType: "polygon", color: "#3b82f6", description: "Zonage du PA (urbain, industriel, équipements, etc.)" },
      "31": { label: "Secteurs urbains",             geomType: "polygon", color: "#8b5cf6", description: "Sectorisation du PA" },
      "29": { label: "Îlots",                        geomType: "polygon", color: "#06b6d4", description: "Découpage par îlots" },
      "10": { label: "Limite du PA",                 geomType: "polygon", color: "#0B1B3A", description: "Périmètre du Plan d'Aménagement" },
      "1":  { label: "Zones non aedificandi",        geomType: "polygon", color: "#ef4444", description: "Zones non constructibles" },
      "25": { label: "Espaces verts",                geomType: "polygon", color: "#22c55e", description: "Espaces verts publics" },
      "23": { label: "Équipements publics",          geomType: "polygon", color: "#a855f7", description: "Équipements publics planifiés" },
      "27": { label: "Voiries",                      geomType: "line",    color: "#dc2626", description: "Voiries projetées et existantes" },
    },
  },
};

type CacheEntry = { data: any; expires: number };

@Injectable()
export class SigDataService {
  private readonly logger = new Logger(SigDataService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 h
  private readonly MAX_FEATURES = 4000;

  listSources() {
    return Object.values(SOURCES).map(s => ({
      id: s.id,
      label: s.label,
      region: s.region,
      layers: Object.entries(s.layers).map(([id, l]) => ({ id, ...l })),
    }));
  }

  /**
   * Récupère une couche en GeoJSON, en cache 24 h.
   * Si la source distante est down, on sert le cache stale s'il existe.
   */
  async getLayerGeoJson(sourceId: string, layerId: string): Promise<any> {
    const src = SOURCES[sourceId];
    if (!src) throw new BadRequestException(`Source inconnue: ${sourceId}`);
    if (!src.layers[layerId]) throw new BadRequestException(`Couche ${layerId} introuvable pour ${sourceId}`);

    const cacheKey = `${sourceId}:${layerId}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > now) return cached.data;

    const url =
      `${src.baseUrl}/${layerId}/query` +
      `?where=1%3D1&outFields=*&f=geojson&outSR=4326` +
      `&resultRecordCount=${this.MAX_FEATURES}&returnGeometry=true`;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "CITURBAREA-SIG-Proxy/1.0", "Accept": "application/json" },
        // 30 s — les services ArcGIS peuvent être lents sur les gros polygones
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
    } catch (e: any) {
      this.logger.warn(`SIG fetch failed [${cacheKey}]: ${e?.message || e}`);
      // Fallback : si on a un cache stale, on le sert avec une note
      if (cached) return { ...cached.data, _meta: { ...cached.data._meta, stale: true, error: e?.message } };
      throw new BadRequestException(`Source distante indisponible : ${e?.message || "inconnu"}`);
    }
  }
}
