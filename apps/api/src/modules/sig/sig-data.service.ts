import { Injectable, BadRequestException, Logger, OnModuleInit } from "@nestjs/common";
import { readFileSync, existsSync, statSync } from "fs";
import { join as joinPath } from "path";

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
  /** Organisme producteur (pour l'affichage source officielle) */
  authority: string;
  /** Base URL du MapServer ArcGIS (sans /<layerId>) */
  baseUrl: string;
  /**
   * Si true, on sert TOUJOURS le snapshot statique (jamais le fetch live).
   * Utile quand on a paginé manuellement (cas maroc-admin/communes : 1505 features
   * vs 1000 max par requête live).
   */
  preferStatic?: boolean;
  /** Date de publication / dernière mise à jour de la source (ISO) */
  publishedAt?: string;
  /** Date à laquelle on a pré-fetché les couches statiques (cas geo-block) */
  staticSnapshotAt?: string;
  /** Layers disponibles (id ArcGIS → métadonnées d'affichage) */
  layers: Record<string, {
    label: string;
    geomType: "polygon" | "line" | "point";
    /** Couleur de remplissage CSS (transparence ajoutée par le frontend) */
    color: string;
    /** Description courte affichée dans le toggle UI */
    description?: string;
    /** Date spécifique de cette couche si différente du global (rare) */
    publishedAt?: string;
  }>;
};

/** Couches utiles du PA AURS Rabat-Salé (sélection — on en exposera plus si besoin). */
const SOURCES: Record<string, SourceCfg> = {
  aurs: {
    id: "aurs",
    label: "Plan d'Aménagement — Agence Urbaine Rabat-Salé",
    region: "Rabat-Salé-Kénitra",
    authority: "AURS (Agence Urbaine de Rabat-Salé)",
    baseUrl: "https://geoportail.aurs.org.ma/server/rest/services/PA_AURS/PROD_PA_AURS/MapServer",
    // Service ArcGIS publié le 2022-01-06, dernière modification connue 2024-01-02
    // (timestamps du item ArcGIS Online : created=1641479490104 / modified=1704192066654)
    publishedAt: "2024-01-02",
    // Snapshot statique pré-fetché depuis cette machine (zone Maroc)
    staticSnapshotAt: "2026-05-22",
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

  "maroc-admin": {
    id: "maroc-admin",
    label: "Découpage administratif du Maroc — 14 Régions / 77 Provinces / 1 505 Communes",
    region: "Royaume du Maroc",
    authority: "HCP (Haut Commissariat au Plan) — diffusé via Esri Africa Geoportal",
    baseUrl: "https://services3.arcgis.com/hjUMsSJ87zgoicvl/arcgis/rest/services/DA_Maroc/FeatureServer",
    // Le service distant a maxRecordCount=1000 → impossible d'avoir les 1505 communes
    // en une requête. On a paginé manuellement à la racine et on sert le snapshot statique.
    preferStatic: true,
    publishedAt: "2018-05-31",      // item ArcGIS Online modifié le 2018-05-31
    staticSnapshotAt: "2026-05-22",
    layers: {
      "0": { label: "Régions (14)",      geomType: "polygon", color: "#0B1B3A", description: "12 régions du Maroc + 2 régions du Sahara (réforme 2015)" },
      "1": { label: "Provinces (77)",    geomType: "polygon", color: "#C9A227", description: "Provinces et préfectures avec population, ménages, marocains/étrangers" },
      "2": { label: "Communes (1 505)",  geomType: "polygon", color: "#16a34a", description: "Toutes les communes du Royaume avec noms FR/AR, population, code province/région" },
    },
  },
};

type CacheEntry = { data: any; expires: number };

@Injectable()
export class SigDataService implements OnModuleInit {
  private readonly logger = new Logger(SigDataService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 h
  private readonly MAX_FEATURES = 4000;

  onModuleInit() {
    // Diagnostic démarrage : log la taille des fichiers statiques embarqués
    // (pour détecter les soucis de cache Docker / build Railway).
    for (const [sid, src] of Object.entries(SOURCES)) {
      for (const [lid, _l] of Object.entries(src.layers)) {
        const candidates = [
          joinPath(process.cwd(), "data", "sig-static", sid, `${lid}.geojson`),
          joinPath(process.cwd(), "apps", "api", "data", "sig-static", sid, `${lid}.geojson`),
          joinPath(__dirname, "..", "..", "..", "data", "sig-static", sid, `${lid}.geojson`),
        ];
        for (const p of candidates) {
          if (existsSync(p)) {
            const sz = statSync(p).size;
            this.logger.log(`[SIG static] ${sid}/${lid} → ${p} (${(sz/1024/1024).toFixed(2)} MB)`);
            break;
          }
        }
      }
    }
  }

  listSources() {
    return Object.values(SOURCES).map(s => ({
      id: s.id,
      label: s.label,
      region: s.region,
      authority: s.authority,
      publishedAt: s.publishedAt,
      staticSnapshotAt: s.staticSnapshotAt,
      layers: Object.entries(s.layers).map(([id, l]) => ({ id, ...l, publishedAt: l.publishedAt || s.publishedAt })),
    }));
  }

  private _registryCache: any | null = null;
  private _agencesCache: any | null = null;
  private _dgiZonesCache: Map<string, any> = new Map();

  /**
   * Charge la table de correction IPAI BAM pour reprojeter les prix DGI 2017
   * → estimation 2026 (IPAI officiel + multiplicateur marché vs DGI).
   */
  private _ipaiCache: any | null = null;
  private getIpaiCorrections(): any {
    if (this._ipaiCache) return this._ipaiCache;
    this._ipaiCache = this.loadJsonStatic("ipai-corrections.json") || { _meta: {}, by_type: {} };
    return this._ipaiCache;
  }

  /**
   * Enrichit chaque zone DGI avec une estimation 2026 calculée à partir de la
   * correction IPAI BAM + facteur marché vs DGI (toujours sous-évalué).
   * Renvoie 2 fourchettes : `dgi2017Pt`/`dgi2017Pc` (référence légale immuable)
   * + `marche2026MinPt`/`marche2026MaxPt` (estimation marché actuelle).
   */
  private enrichWithMarketCorrection(zonesData: any): any {
    if (!zonesData?.zones) return zonesData;
    const ipai = this.getIpaiCorrections();
    const byType = ipai.by_type || {};
    const defaultCorr = { ipai_correction: 1.05, marche_factor_min: 1.30, marche_factor_max: 1.70 };

    const enrichedZones = zonesData.zones.map((z: any) => {
      const enrichedPrix = (z.prix || []).map((p: any) => {
        const corr = byType[p.type] || defaultCorr;
        const out: any = { ...p };
        if (p.pt && Number.isFinite(p.pt)) {
          const base2026 = Math.round(p.pt * corr.ipai_correction);
          out.pt2026Ref = base2026; // référence DGI ré-actualisée
          out.marketMinPt = Math.round(base2026 * corr.marche_factor_min);
          out.marketMaxPt = Math.round(base2026 * corr.marche_factor_max);
        }
        if (p.pc && Number.isFinite(p.pc)) {
          out.pc2026Ref = Math.round(p.pc * corr.ipai_correction);
        }
        if (p.prixUnique && Number.isFinite(p.prixUnique)) {
          const base2026 = Math.round(p.prixUnique * corr.ipai_correction);
          out.prixUnique2026Ref = base2026;
          out.marketMin = Math.round(base2026 * corr.marche_factor_min);
          out.marketMax = Math.round(base2026 * corr.marche_factor_max);
        }
        return out;
      });
      return { ...z, prix: enrichedPrix };
    });

    return {
      ...zonesData,
      _meta: {
        ...zonesData._meta,
        ipaiCorrection: ipai._meta,
      },
      zones: enrichedZones,
    };
  }

  /**
   * Catalogue DGI par ville — extrait par parsing PDF (Niveau 2 du module SIG).
   * Pour chaque ville couverte, retourne les zones avec leurs prix de référence
   * officiels, leurs délimitations géographiques et la liste des avenues.
   *
   * Villes disponibles aujourd'hui :
   *   - rabat (49 zones) — extrait DGI 2017 actualisé 29-12-2017
   *
   * À venir (parsing pipeline) : casablanca, marrakech, tanger, fes, agadir,
   * meknes, tetouan, kenitra, el-jadida, oujda, beni-mellal.
   */
  getDgiZones(cityId: string): any | null {
    const id = cityId.toLowerCase().trim();
    if (this._dgiZonesCache.has(id)) return this._dgiZonesCache.get(id);
    const raw = this.loadJsonStatic(`dgi-zones/${id}.json`);
    if (!raw) return null;
    // Enrichit avec correction IPAI BAM + estimation marché 2026
    const enriched = this.enrichWithMarketCorrection(raw);
    this._dgiZonesCache.set(id, enriched);
    return enriched;
  }

  /** Liste les villes qui ont une extraction DGI disponible. */
  listDgiZoneCities(): { id: string; name: string; totalZones: number; extractedAt: string }[] {
    const result: { id: string; name: string; totalZones: number; extractedAt: string }[] = [];
    const tried = [
      "rabat", "casablanca", "marrakech", "tanger", "fes", "agadir",
      "kenitra", "sale", "meknes", "oujda", "settat", "beni-mellal",
      "safi", "tetouan", "midelt", "nador", "berkane",
    ];
    for (const id of tried) {
      const d = this.getDgiZones(id);
      if (d?._meta) {
        result.push({
          id,
          name: d._meta.ville,
          totalZones: d._meta.totalZones,
          extractedAt: d._meta.extractedAt,
        });
      }
    }
    return result;
  }

  private loadJsonStatic(filename: string): any | null {
    const candidates = [
      joinPath(process.cwd(), "data", "sig-static", filename),
      joinPath(process.cwd(), "apps", "api", "data", "sig-static", filename),
      joinPath(__dirname, "..", "..", "..", "data", "sig-static", filename),
    ];
    for (const p of candidates) {
      if (existsSync(p)) {
        try { return JSON.parse(readFileSync(p, "utf-8")); }
        catch (e) { this.logger.warn(`[SIG] parse failed at ${p}: ${(e as Error).message}`); }
      }
    }
    return null;
  }

  /**
   * Registre des fiches officielles DGI / ANCFCC / Taamir / agences urbaines.
   *
   * Niveau 1 du module SIG-référentiels avec couverture territoriale exhaustive :
   *   - 30 villes DGI (URLs PDF vérifiées 2026-05)
   *   - 29 Agences Urbaines (couverture 100 % du territoire — loi 12-90)
   *   - Auto-mapping commune → province → AU compétente
   *   - Fallback "fiche en cours" pour les 26 provinces sans PDF DGI publié
   *     (avec lien vers la fiche AU + ANCFCC + portail DGI national)
   *
   * @param query.region — filtre par nom région HCP (fuzzy)
   * @param query.province — filtre par code/nom province HCP
   * @param query.commune — filtre par nom commune HCP (fuzzy)
   * @param query.cityId — sélectionne explicitement une ville (casablanca|rabat|…)
   */
  listReferences(query?: { region?: string; province?: string; commune?: string; cityId?: string }) {
    if (!this._registryCache) this._registryCache = this.loadJsonStatic("dgi-references.json");
    if (!this._agencesCache) this._agencesCache = this.loadJsonStatic("agences-urbaines.json");

    const registry = this._registryCache;
    const agencesReg = this._agencesCache;
    if (!registry) {
      return { ok: true, global: [], cities: [], matched: [], agences: [], roadmap: null, _meta: { warning: "registry not found" } };
    }

    const cities: any[] = Array.isArray(registry.cities) ? registry.cities : [];
    const agences: any[] = Array.isArray(agencesReg?.agences) ? agencesReg.agences : [];

    let matched = cities;
    let matchedAgences = agences;
    let placeholder: any = null;

    const hasFilter = !!(query && (query.region || query.province || query.commune || query.cityId));

    if (query?.cityId) {
      const id = query.cityId.toLowerCase().trim();
      matched = matched.filter(c => c.id === id);
    }
    if (query?.commune) {
      const needle = query.commune.toLowerCase().trim();
      matched = matched.filter(c =>
        c.name?.toLowerCase().includes(needle) ||
        (c.communeCodes || []).some((cc: string) => cc.toLowerCase() === needle),
      );
    }
    if (query?.province) {
      const needle = query.province.toLowerCase().trim();
      matched = matched.filter(c =>
        (c.provinceCodes || []).some((pc: string) => pc.toLowerCase() === needle) ||
        c.name?.toLowerCase().includes(needle),
      );
    }
    if (query?.region) {
      const needle = query.region.toLowerCase().trim();
      matched = matched.filter(c => c.region?.toLowerCase().includes(needle));
    }

    // Auto-mapping vers les agences urbaines : on garde celles qui couvrent
    // au moins une préfecture/province mentionnée dans le filtre.
    if (hasFilter && agences.length > 0) {
      const provNeedle = (query?.province || query?.commune || "").toLowerCase().trim();
      const regNeedle = (query?.region || "").toLowerCase().trim();

      matchedAgences = agences.filter(au => {
        if (regNeedle && au.region?.toLowerCase().includes(regNeedle)) return true;
        const covered = [...(au.prefecturesCouvertes || []), ...(au.provincesCouvertes || [])]
          .map((s: string) => s.toLowerCase());
        if (provNeedle && covered.some(c => c.includes(provNeedle) || provNeedle.includes(c))) return true;
        return false;
      });
    }

    // Fallback "fiche en cours" : si aucune ville DGI n'a matché mais qu'on a un
    // filtre, on génère une entrée placeholder avec lien vers la fiche AU + portail
    // DGI national. Ainsi l'utilisateur n'a JAMAIS un écran vide — il sait toujours
    // où aller chercher l'info officielle.
    if (hasFilter && matched.length === 0) {
      const targetName = query?.commune || query?.province || query?.region || "votre zone";
      placeholder = {
        id: "placeholder",
        name: targetName,
        region: query?.region || "",
        provinceCodes: [],
        communeCodes: [],
        isPlaceholder: true,
        message: "Aucun référentiel DGI propre publié pour cette commune. Utilisez les ressources officielles ci-dessous + la fiche de l'Agence Urbaine compétente.",
        fiches: [
          {
            kind: "dgi_portal",
            label: "DGI — Portail national (rechercher cette commune)",
            url: "https://portail.tax.gov.ma/wps/portal/DGI/Referentiels-des-prix-de-l_immobilier/",
            authority: "DGI",
            description: "Portail officiel — recherche interactive sur la carte ou par ville.",
          },
          {
            kind: "ancfcc_referential",
            label: "ANCFCC — Valeurs vénales (consultation)",
            url: "https://www.ancfcc.gov.ma/valeursvenales",
            authority: "ANCFCC",
            description: "Référentiel commun ANCFCC-DGI (extension nationale progressive).",
          },
          ...matchedAgences.slice(0, 3).map((au: any) => ({
            kind: "agence_urbaine",
            label: `${au.name} — Géoportail urbanisme`,
            url: au.geoportail || au.siteOfficiel,
            authority: au.code,
            description: `Plans d'Aménagement et zonage urbanistique (${au.format || "carto web"}).`,
          })),
        ],
      };
    }

    return {
      ok: true,
      _meta: registry._meta,
      global: registry.global || [],
      matched,
      matchedAgences,
      placeholder,
      cities: hasFilter ? undefined : cities,
      agences: hasFilter ? undefined : agences,
      roadmap: registry.roadmap || null,
    };
  }

  /**
   * Liste plate (sans geometry) des entités administratives du Maroc.
   * Utilisé par les wizards P1/P2/P5 pour les dropdowns en cascade
   * Région → Province → Commune (alimentés depuis le découpage HCP).
   *
   * Retourne {id, code, name, nameAr?, parentCode?, population?, type?}.
   */
  async listAdmin(level: "regions" | "provinces" | "communes", parentCode?: string): Promise<any[]> {
    const layerId = level === "regions" ? "0" : level === "provinces" ? "1" : "2";
    const data = await this.getLayerGeoJson("maroc-admin", layerId);
    const feats: any[] = data?.features || [];

    const items = feats.map(f => {
      const p = f.properties || {};
      if (level === "regions") {
        const code = String(p.Code_Region || p.CODE_REGION || "").trim();
        const name = p.Nom_Region || p.NOM_REGION || "";
        // Exclut les features artéfacts (OBJECTID 12/13 sans code ni nom propres
        // dans le découpage Esri Africa). 12 régions officielles HCP + ces 2
        // duplicats du Sahara/Aousserd → on garde uniquement celles ayant un
        // Code_Region ET un Nom_Region valides.
        if (!code || !name) return null;
        return {
          code,
          name,
          objectId: p.OBJECTID,
          population: p.Population,
          superficie: p.Superficie_Ha,
        };
      }
      if (level === "provinces") {
        const code = String(p.Code_Province || p.CODE_PROVINCE || "").trim();
        const name = p.Nom_Provinces || p.Nom_Province || p.NOM_PROVINCE || "";
        if (!code || !name) return null;
        return {
          code,
          name,
          objectId: p.OBJECTID,
          parentCode: String(p.Code_Region || p.CODE_REGION || "").trim(),
          population: p.Population,
          marocains: p.Marocains,
        };
      }
      // communes
      const code = String(p.Code_Commune || p.CODE_COMMUNE || "").trim();
      const name = p.Nom_Commune || p.NOM_COMMUNE || "";
      if (!code || !name) return null;
      return {
        code,
        name,
        objectId: p.OBJECTID,
        nameAr: p.Nom_Commune_Arabe || undefined,
        parentCode: String(p.Code_Province || p.CODE_PROVINCE || "").trim(),
        regionCode: String(p.CODE_REGION || p.Code_Region || "").trim(),
        population: p.Population,
        type: p.Type_Commune,
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    // Filtre par parent si demandé
    const filtered = parentCode
      ? items.filter(it => (it.parentCode || "").startsWith(parentCode.trim()))
      : items;

    // Tri alphabétique pour les dropdowns
    return filtered.sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr"));
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
  async getLayerGeoJson(sourceId: string, layerId: string): Promise<any> {
    const src = SOURCES[sourceId];
    if (!src) throw new BadRequestException(`Source inconnue: ${sourceId}`);
    if (!src.layers[layerId]) throw new BadRequestException(`Couche ${layerId} introuvable pour ${sourceId}`);

    const cacheKey = `${sourceId}:${layerId}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > now) {
      const fc = cached.data?.features?.length ?? -1;
      this.logger.log(`[SIG cache HIT] ${cacheKey} → ${fc} features`);
      return cached.data;
    }

    const url =
      `${src.baseUrl}/${layerId}/query` +
      `?where=1%3D1&outFields=*&f=geojson&outSR=4326` +
      `&resultRecordCount=${this.MAX_FEATURES}&returnGeometry=true`;

    // Fallback statique — chargé une fois
    const staticData = this.tryLoadStatic(sourceId, layerId);

    // Si la source préfère explicitement le statique (cas maroc-admin paginé) : on sert le
    // snapshot local et on saute le fetch live (qui retournerait des données incomplètes).
    if (src.preferStatic && staticData) {
      const fc = Array.isArray(staticData?.features) ? staticData.features.length : 0;
      this.logger.log(`[SIG preferStatic] ${cacheKey} → ${fc} features (fetch live skipped)`);
      const enriched = {
        ...staticData,
        _meta: {
          source: sourceId, layer: layerId,
          label: src.layers[layerId].label, region: src.region,
          fromStatic: true,
          preferStatic: true,
          featureCount: fc,
        },
      };
      this.cache.set(cacheKey, { data: enriched, expires: now + this.TTL_MS });
      return enriched;
    }

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
      // Fallback 1 : cache stale
      if (cached) return { ...cached.data, _meta: { ...cached.data._meta, stale: true, error: e?.message } };
      // Fallback 2 : fichier statique committé dans le repo
      if (staticData) {
        const fc = Array.isArray(staticData?.features) ? staticData.features.length : 0;
        this.logger.log(`[SIG static FALLBACK] ${cacheKey} → ${fc} features`);
        const enriched = {
          ...staticData,
          _meta: {
            source: sourceId, layer: layerId,
            label: src.layers[layerId].label, region: src.region,
            fromStatic: true,
            error: e?.message,
            featureCount: fc,
          },
        };
        this.cache.set(cacheKey, { data: enriched, expires: now + this.TTL_MS });
        return enriched;
      }
      throw new BadRequestException(`Source distante indisponible : ${e?.message || "inconnu"}`);
    }
  }

  /** Charge le GeoJSON statique committé dans le repo (fallback geo-block). */
  private tryLoadStatic(sourceId: string, layerId: string): any | null {
    try {
      // Cherche dans plusieurs racines possibles (dev vs Docker prod)
      const candidates = [
        joinPath(process.cwd(), "data", "sig-static", sourceId, `${layerId}.geojson`),
        joinPath(process.cwd(), "apps", "api", "data", "sig-static", sourceId, `${layerId}.geojson`),
        joinPath(__dirname, "..", "..", "..", "data", "sig-static", sourceId, `${layerId}.geojson`),
      ];
      for (const p of candidates) {
        if (existsSync(p)) {
          const raw = readFileSync(p, "utf8");
          return JSON.parse(raw);
        }
      }
    } catch (e: any) {
      this.logger.warn(`Static SIG load failed [${sourceId}:${layerId}]: ${e?.message}`);
    }
    return null;
  }
}
