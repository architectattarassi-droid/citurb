import { Injectable, Logger } from "@nestjs/common";
import { SigDataService } from "./sig-data.service";

/**
 * ZoneDetectorService — auto-détection du zoning et de la fourchette de prix.
 *
 * Pipeline :
 *   1) Réception (lat, lng) + commune/région + bienFamily
 *   2) Point-in-polygon sur les couches AURS (zonage réglementaire, secteurs,
 *      lotissements, îlots) → extraction des attributs zoning officiels
 *   3) Mapping arrondissement + zoning AURS → ZoneTier CITURBAREA
 *   4) Multiplicateur destination (villa 1x / immeuble 1.4-1.6x) → fourchette
 *      finale en DH/m²
 *   5) Renvoie zoning détecté + tier suggéré + fourchette + sources
 *
 * Doctrine : tout vient des sources publiques officielles (PA AURS loi 12-90,
 * référentiel DGI miroirs Fiscamaroc/tax.gov.ma). Aucune invention — on rend
 * transparente la chaîne de raisonnement dans la propriété `reasoning`.
 */

export type ZoneTier = "RURAL" | "PERIPHERIE" | "VILLE_MOYENNE" | "URBAIN" | "BON_QUARTIER" | "PREMIUM" | "PRESTIGE" | "ULTRA";
export type BienFamily = "TERRAIN_NU" | "VILLA" | "PETIT_COLLECTIF" | "GRAND_COLLECTIF" | "EQUIPEMENT" | "AMENAGEMENT" | "AUTRE";

/** Identique à apps/api/src/tomes/tome-6/p5/pricing.service.ts (recalibré 2025-26). */
const ZONE_PRICE_RANGE: Record<ZoneTier, { min: number; max: number }> = {
  RURAL:         { min: 500,   max: 2500  },
  PERIPHERIE:    { min: 1500,  max: 4000  },
  VILLE_MOYENNE: { min: 3000,  max: 7000  },
  URBAIN:        { min: 5000,  max: 10000 },
  BON_QUARTIER:  { min: 8000,  max: 14000 },
  PREMIUM:       { min: 12000, max: 22000 },
  PRESTIGE:      { min: 20000, max: 35000 },
  ULTRA:         { min: 30000, max: 50000 },
};

const FONCIER_MULTIPLIER_BY_FAMILY: Record<BienFamily, number> = {
  TERRAIN_NU: 1.0,
  VILLA: 1.0,
  PETIT_COLLECTIF: 1.4,
  GRAND_COLLECTIF: 1.6,
  EQUIPEMENT: 1.2,
  AMENAGEMENT: 1.0,
  AUTRE: 1.0,
};

/**
 * Mapping arrondissement → ZoneTier de base (signature prix par quartier).
 * Calibré sur les fourchettes marché 2025-26 (Aykana Souissi, Sefiani Agdal,
 * KNA Marrakech, Agenz, Yakeey, Mubawab).
 *
 * Clés en minuscules + sans accents pour matcher robuste.
 */
const ARRONDISSEMENT_TIER: Record<string, ZoneTier> = {
  // RABAT
  "hassan":             "BON_QUARTIER",
  "agdal":              "BON_QUARTIER",
  "agdal-ryad":         "BON_QUARTIER",
  "ryad":               "BON_QUARTIER",
  "hay riad":           "BON_QUARTIER",
  "souissi":            "PREMIUM",
  "el youssoufia":      "URBAIN",
  "youssoufia":         "URBAIN",
  "yaacoub el mansour": "URBAIN",
  "yacoub el mansour":  "URBAIN",
  "akkari":             "PERIPHERIE",
  "medina":             "URBAIN",
  "médina":             "URBAIN",
  "touarga":            "PRESTIGE",

  // SALÉ
  "bettana":            "URBAIN",
  "hssaine":            "URBAIN",
  "tabriquet":          "URBAIN",
  "bab lamrissa":       "BON_QUARTIER",
  "lamrissa":           "BON_QUARTIER",
  "layayda":            "PERIPHERIE",
  "shoul":              "RURAL",
  "sidi bouknadel":     "VILLE_MOYENNE",
  "bouknadel":          "VILLE_MOYENNE",
  "sale al jadida":     "URBAIN",

  // TÉMARA / SKHIRAT
  "temara":             "BON_QUARTIER",
  "témara":             "BON_QUARTIER",
  "harhoura":           "PREMIUM",
  "ain atig":           "URBAIN",
  "aïn atig":           "URBAIN",
  "skhirat":            "BON_QUARTIER",
  "mers el kheir":      "VILLE_MOYENNE",

  // KÉNITRA
  "bir rami":           "BON_QUARTIER",
  "maamoura":           "URBAIN",
  "saknia":             "URBAIN",
  "mehdia":             "VILLE_MOYENNE",

  // CASA - arrondissements clés
  "anfa":               "PREMIUM",
  "maarif":             "BON_QUARTIER",
  "gauthier":           "PREMIUM",
  "bourgogne":          "BON_QUARTIER",
  "racine":             "PREMIUM",
  "ain diab":           "PREMIUM",
  "aïn diab":           "PREMIUM",
  "ain sebaa":          "URBAIN",
  "hay hassani":        "PERIPHERIE",
  "sidi bernoussi":     "PERIPHERIE",
  "sidi maarouf":       "URBAIN",
  "californie":         "BON_QUARTIER",
  "bd d'anfa":          "ULTRA",
  "anfa superieur":     "ULTRA",
  "cfc":                "ULTRA",

  // MARRAKECH
  "gueliz":             "BON_QUARTIER",
  "guéliz":             "BON_QUARTIER",
  "hivernage":          "PREMIUM",
  "palmeraie":          "PREMIUM",
  "targa":              "URBAIN",
  "massira":            "URBAIN",
  "daoudiate":          "URBAIN",
  "sidi ghanem":        "PERIPHERIE",
  "mhamid":             "PERIPHERIE",

  // TANGER
  "marina":             "PREMIUM",
  "iberia":             "BON_QUARTIER",
  "marshan":            "BON_QUARTIER",
  "malabata":           "URBAIN",
  "boukhalef":          "URBAIN",
  "branes":             "PERIPHERIE",
  "tanger ville":       "BON_QUARTIER",
};

/**
 * Mapping zone réglementaire AURS (code `zone` ou mots-clés `definition`)
 * → ajustement du tier de base. Peut faire MONTER (centre urbain dense) ou
 * BAISSER (zone naturelle/agricole/industrielle) le tier dérivé du quartier.
 */
function adjustTierByZoning(baseTier: ZoneTier, zoning: { zone?: string; definition?: string }): { tier: ZoneTier; reasoning: string } {
  const tierOrder: ZoneTier[] = ["RURAL", "PERIPHERIE", "VILLE_MOYENNE", "URBAIN", "BON_QUARTIER", "PREMIUM", "PRESTIGE", "ULTRA"];
  const idx = tierOrder.indexOf(baseTier);
  const adjust = (delta: number, why: string): { tier: ZoneTier; reasoning: string } => {
    const newIdx = Math.max(0, Math.min(tierOrder.length - 1, idx + delta));
    return { tier: tierOrder[newIdx], reasoning: why };
  };

  const code = (zoning.zone || "").trim().toUpperCase();
  const def = (zoning.definition || "").toLowerCase();

  // Zones naturelles / protégées / agricoles → baisse à RURAL
  if (def.includes("naturelle") || def.includes("protection") || def.includes("non aedificandi") ||
      def.includes("agricole") || def.includes("forêt") || def.includes("foret") || code === "RB") {
    return adjust(-99, `Zone réglementaire ${code || "naturelle"} (protection / non constructible / agricole) — fourchette ramenée au tier RURAL.`);
  }

  // Zones industrielles → tier intermédiaire bas
  if (def.includes("industriel") || def.includes("activités économiques") || def.includes("activites economiques") ||
      def.includes("zone d'activité") || /^[IZ]A?$/.test(code)) {
    return { tier: "PERIPHERIE", reasoning: `Zone industrielle / activités économiques (${code || "code N/A"}) — fourchette ramenée à PERIPHERIE (foncier d'activité).` };
  }

  // Zones d'équipement → BON_QUARTIER (souvent en centre)
  if (def.includes("équipement") || def.includes("equipement") || /^E\d?$/.test(code)) {
    return { tier: "BON_QUARTIER", reasoning: `Zone d'équipement (${code || "code N/A"}) — alignée sur le tier BON_QUARTIER.` };
  }

  // Zones villas (R1, V) → +1 tier vs base (villa dans bon quartier = premium)
  if (/^(R1|V|VL)/.test(code) || def.includes("villa")) {
    return adjust(1, `Zone réglementaire villa (${code || "définition contient « villa »"}) — tier rehaussé d'un cran.`);
  }

  // Zones immeubles denses (R4+, COS élevé) → +1 tier (rente du COS)
  if (/^R[4-9]/.test(code) || def.includes("immeuble")) {
    return adjust(1, `Zone d'immeubles en hauteur (${code}) — COS élevé, tier rehaussé d'un cran.`);
  }

  // Centre urbain / quartier d'habitat dense
  if (def.includes("centre") || def.includes("dense") || def.includes("habitat et d'activité") || def.includes("habitat et activité")) {
    return { tier: baseTier, reasoning: `Zone d'habitat et d'activité (${code || "centre urbain"}) — tier de base conservé.` };
  }

  return { tier: baseTier, reasoning: `Zoning ${code || "non spécifique"} — fourchette basée sur la signature prix du quartier.` };
}

function normalizeArrondissement(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip accents
    .trim();
}

/**
 * Point-in-polygon par ray casting (suffisant pour polygones simples + multi).
 */
function pointInRing(point: [number, number], ring: number[][]): boolean {
  let inside = false;
  const [px, py] = point;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInFeature(point: [number, number], feature: any): boolean {
  const geom = feature?.geometry;
  if (!geom) return false;
  if (geom.type === "Polygon") {
    // Premier ring = outer, suivants = trous
    if (!pointInRing(point, geom.coordinates[0])) return false;
    for (let k = 1; k < geom.coordinates.length; k++) {
      if (pointInRing(point, geom.coordinates[k])) return false;
    }
    return true;
  }
  if (geom.type === "MultiPolygon") {
    return geom.coordinates.some((poly: number[][][]) => {
      if (!pointInRing(point, poly[0])) return false;
      for (let k = 1; k < poly.length; k++) {
        if (pointInRing(point, poly[k])) return false;
      }
      return true;
    });
  }
  return false;
}

@Injectable()
export class ZoneDetectorService {
  private readonly logger = new Logger(ZoneDetectorService.name);

  constructor(private readonly sig: SigDataService) {}

  /**
   * Auto-détection complète à partir d'une géolocalisation + métadonnées.
   *
   * Renvoie toujours un résultat exploitable :
   *  - Si GPS + zone AURS trouvée → fourchette précise basée sur zoning réel
   *  - Si GPS seul → fourchette basée sur arrondissement détecté par AURS
   *  - Si commune seule (pas de GPS) → fourchette basée sur mapping commune
   *  - Si rien (pas de GPS ni commune) → tier par défaut URBAIN + warning
   */
  async detect(input: {
    lat?: number;
    lng?: number;
    commune?: string;
    region?: string;
    bienFamily?: BienFamily;
  }) {
    const family = input.bienFamily || "VILLA";
    const familyMult = FONCIER_MULTIPLIER_BY_FAMILY[family] ?? 1.0;

    let detected: any = { source: "default" };
    let baseTier: ZoneTier = "URBAIN";
    let reasoning: string[] = [];

    // 1) Si on a des coords GPS, on tente le point-in-polygon sur les couches AURS
    if (input.lat != null && input.lng != null
        && Number.isFinite(+input.lat) && Number.isFinite(+input.lng)) {
      const point: [number, number] = [+input.lng, +input.lat]; // GeoJSON = [lng, lat]
      const aursMatch = await this.queryAursLayers(point);

      if (aursMatch) {
        detected = { source: "aurs_point_in_polygon", ...aursMatch };
        const arrondNorm = normalizeArrondissement(aursMatch.arrondissement);
        baseTier = ARRONDISSEMENT_TIER[arrondNorm] || "URBAIN";
        reasoning.push(`Point GPS (${(+input.lat).toFixed(5)}, ${(+input.lng).toFixed(5)}) localisé dans l'arrondissement « ${aursMatch.arrondissement || "—"} » via PA AURS.`);
        reasoning.push(`Tier de base déduit de l'arrondissement : ${baseTier} (signature prix marché 2025-26).`);

        if (aursMatch.zoning) {
          const adj = adjustTierByZoning(baseTier, aursMatch.zoning);
          baseTier = adj.tier;
          reasoning.push(adj.reasoning);
        }
      } else {
        reasoning.push(`Point GPS hors couverture des PA AURS — fallback sur la commune renseignée.`);
      }
    }

    // 2) Fallback commune si pas de hit GPS
    if (detected.source === "default" && input.commune) {
      const communeNorm = normalizeArrondissement(input.commune);
      const tierFromCommune = ARRONDISSEMENT_TIER[communeNorm];
      if (tierFromCommune) {
        baseTier = tierFromCommune;
        detected = { source: "commune_mapping", commune: input.commune };
        reasoning.push(`Pas de GPS — tier déduit du nom de commune « ${input.commune} » : ${baseTier}.`);
      } else {
        reasoning.push(`Commune « ${input.commune} » non dans le mapping fin — tier par défaut URBAIN appliqué.`);
        detected = { source: "default_fallback", commune: input.commune };
      }
    }

    if (detected.source === "default") {
      reasoning.push("Aucune géolocalisation ni commune exploitable — tier URBAIN par défaut.");
    }

    // 3) Calcul de la fourchette finale (× multiplicateur destination)
    const range = ZONE_PRICE_RANGE[baseTier];
    const finalMin = Math.round(range.min * familyMult);
    const finalMax = Math.round(range.max * familyMult);
    const finalMid = Math.round(((range.min + range.max) / 2) * familyMult);

    if (familyMult !== 1.0) {
      reasoning.push(`Multiplicateur destination ${family} ×${familyMult} appliqué (rente COS pour immeubles vs villa).`);
    }

    // 4) Détermine la fiche DGI/AU pertinente
    const refs = this.sig.listReferences({
      region: input.region,
      commune: input.commune,
    });

    return {
      ok: true,
      detected,
      suggested: {
        zoneTier: baseTier,
        priceRangeMinMAD: finalMin,
        priceRangeMaxMAD: finalMax,
        priceMidMAD: finalMid,
        bienFamily: family,
        familyMultiplier: familyMult,
        reasoning,
      },
      sources: {
        pa: detected.source === "aurs_point_in_polygon" ? {
          name: "PA AURS — Plan d'Aménagement Rabat-Salé",
          layer: detected.layerLabel,
          publishedAt: "2024-01-02",
        } : null,
        dgi: refs.matched && refs.matched[0] ? {
          name: refs.matched[0].name,
          fiches: refs.matched[0].fiches,
        } : null,
        agences: refs.matchedAgences && refs.matchedAgences.length > 0 ? refs.matchedAgences.map(au => ({
          name: au.name,
          code: au.code,
          geoportail: au.geoportail,
        })) : [],
      },
    };
  }

  /**
   * Teste le point successivement contre les couches AURS dans l'ordre de
   * pertinence (zonage réglementaire d'abord, puis secteurs, puis lotissements,
   * puis îlots). Renvoie les attributs de la PREMIÈRE couche qui matche.
   */
  private async queryAursLayers(point: [number, number]) {
    // Ordre : zonage régl (31) > secteurs (32) > lotissements (28) > îlots (29)
    const layerPriority: Array<{ id: string; label: string; isZoning: boolean }> = [
      { id: "31", label: "Zonage réglementaire", isZoning: true },
      { id: "32", label: "Secteurs urbains",     isZoning: true },
      { id: "28", label: "Lotissements",         isZoning: false },
      { id: "29", label: "Îlots",                isZoning: false },
    ];

    for (const layer of layerPriority) {
      try {
        const data = await this.sig.getLayerGeoJson("aurs", layer.id);
        const feats: any[] = data?.features || [];
        for (const f of feats) {
          if (pointInFeature(point, f)) {
            const p = f.properties || {};
            const zoning = layer.isZoning ? {
              zone: p.zone || p.Zone,
              secteur: p.secteur || p.Secteur,
              definition: p.definition || p.Definition,
              cos: p.cos,
              hauteurMax: p.hauteur_max,
              empriseMax: p.emprise_max,
              surfaceMini: p.surface_mini,
              utilisationsInterdites: p.utilisations_interdites,
              occupationPermise: p.occupation_permise,
            } : null;
            return {
              layerId: layer.id,
              layerLabel: layer.label,
              prefecture: p.prefecture || p.Prefecture,
              arrondissement: p.arrondissement || p.Arrondissement,
              pa: p.pa || p.PA,
              nom: p.nom || p.Nom,
              zoning,
            };
          }
        }
      } catch (e) {
        this.logger.warn(`[zone-detector] AURS layer ${layer.id} failed: ${(e as Error).message}`);
      }
    }
    return null;
  }
}
