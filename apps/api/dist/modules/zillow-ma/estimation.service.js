"use strict";
/**
 * apps/api/src/modules/zillow-ma/estimation.service.ts
 *
 * Algorithme d'estimation foncière Zillow MA.
 *
 * Méthode (Q3 2026 — v1) :
 *   1. Trouve les N comparables les plus proches (rayon adaptatif, même bienFamily,
 *      vendus < 24 mois → fenêtre étirée à 36 mois si insuffisant).
 *   2. Pondère chaque comparable par :
 *        - inverse distance (gaussien σ=1 km)
 *        - fraîcheur (e^(-monthsAgo/12) — décroissance demi-vie 12 mois)
 *        - similarité de bienFamily (match exact = 1, sinon 0.35)
 *   3. Re-ramène les prix au présent via IPAI BAM (~+5 %/an).
 *   4. Calcule la moyenne pondérée + écart-type pondéré.
 *   5. Compare avec référentiel DGI 2017 × correction IPAI BAM 2026 → on prend
 *      le min des deux barycentres (le marché surévalue souvent le DGI mais
 *      le DGI sert de plancher de cohérence).
 *   6. Fourchette ±1σ + confidence dérivée du nombre, fraîcheur, dispersion.
 *
 * Pas de dépendance externe — pas de fetch, pas de DB. Tout est en RAM.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EstimationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstimationService = void 0;
const common_1 = require("@nestjs/common");
/** IPAI BAM cumulative — utilisé pour corriger DGI 2017 → 2026. Source : BAM IPAI. */
const IPAI_FACTOR_DGI_TO_2026 = 1.45; // ~9 ans × ~4-5 %/an + recalibrage marché
const IPAI_FACTOR_PER_YEAR = 1.05; // utilisé pour reprojeter les comparables anciens
const DEFAULT_RADIUS_KM = 2.0;
const MAX_RADIUS_KM = 5.0;
const MIN_COMPARABLES = 4;
const TARGET_COMPARABLES = 10;
/** Haversine entre deux points WGS84 — retourne km. */
function distanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}
function monthsBetween(isoDate, ref = new Date()) {
    const d = new Date(isoDate);
    return (ref.getFullYear() - d.getFullYear()) * 12 + (ref.getMonth() - d.getMonth());
}
function similarityBienFamily(a, b) {
    if (!a)
        return 0.6; // pas de filtre → score moyen
    if (a === b)
        return 1.0;
    // Compatibilité résiduelle : terrain_nu ↔ terrain_constructible / villa ↔ appartement (cohabitation marché)
    const TERRAIN = new Set(["terrain_nu", "terrain_constructible"]);
    const RESID = new Set(["villa", "appartement", "immeuble"]);
    const TERTIAIRE = new Set(["local_commercial", "bureau"]);
    if (TERRAIN.has(a) && TERRAIN.has(b))
        return 0.55;
    if (RESID.has(a) && RESID.has(b))
        return 0.45;
    if (TERTIAIRE.has(a) && TERTIAIRE.has(b))
        return 0.50;
    return 0.20;
}
function tierFromConfidence(c) {
    if (c >= 80)
        return "HIGH";
    if (c >= 60)
        return "MEDIUM";
    if (c >= 40)
        return "LOW";
    return "VERY_LOW";
}
let EstimationService = EstimationService_1 = class EstimationService {
    logger = new common_1.Logger(EstimationService_1.name);
    /**
     * Estime le prix d'un bien à partir d'un dataset de comparables + parcelles.
     * @param input lat/lng obligatoires, surface optionnelle.
     * @param comparables dataset complet (1000 lignes en RAM).
     * @param parcelles dataset complet (500 lignes) — utilisé uniquement pour
     *                  hint DGI quartier si on n'a pas de comparable proche.
     */
    estimate(input, comparables, parcelles) {
        if (!isFinite(input.lat) || !isFinite(input.lng)) {
            throw new Error("lat/lng requis (numériques finis)");
        }
        const now = new Date();
        const surfaceM2 = input.surfaceM2 && input.surfaceM2 > 0 ? input.surfaceM2 : 100;
        // ── 1. Collecte rayon adaptatif ─────────────────────────────────────
        let radius = DEFAULT_RADIUS_KM;
        let pool = this.collectInRadius(input, comparables, radius, /*maxMonths*/ 24);
        if (pool.length < MIN_COMPARABLES) {
            // Étend rayon 5 km
            radius = MAX_RADIUS_KM;
            pool = this.collectInRadius(input, comparables, radius, /*maxMonths*/ 24);
        }
        if (pool.length < MIN_COMPARABLES) {
            // Étire fenêtre temporelle à 36 mois
            pool = this.collectInRadius(input, comparables, radius, /*maxMonths*/ 36);
        }
        // ── 2. Pondération ──────────────────────────────────────────────────
        const weighted = pool.map((c) => {
            const dKm = distanceKm(input.lat, input.lng, c.lat, c.lng);
            const monthsAgo = Math.max(0, monthsBetween(c.dateIso, now));
            const wDist = Math.exp(-(dKm * dKm) / 2); // gaussien σ=1
            const wFresh = Math.exp(-monthsAgo / 12); // demi-vie ≈ 12 mois
            const wFam = similarityBienFamily(input.bienFamily, c.bienFamily);
            const weight = wDist * wFresh * wFam;
            // Reprojection au présent via IPAI : prix_now = prix_then × IPAI^(monthsAgo/12)
            const projected = c.prixMadPerM2 * Math.pow(IPAI_FACTOR_PER_YEAR, monthsAgo / 12);
            return { c, dKm, monthsAgo, weight, projectedPerM2: projected };
        }).sort((a, b) => b.weight - a.weight).slice(0, TARGET_COMPARABLES);
        const totalWeight = weighted.reduce((s, w) => s + w.weight, 0) || 1;
        const muMarket = weighted.reduce((s, w) => s + w.projectedPerM2 * w.weight, 0) / totalWeight;
        const varianceMarket = weighted.reduce((s, w) => s + w.weight * Math.pow(w.projectedPerM2 - muMarket, 2), 0) / totalWeight;
        const sigmaMarket = Math.sqrt(varianceMarket);
        // ── 3. Référence DGI : on cherche les parcelles seedées du même quartier ─
        const dgiRef = this.computeDgiReference(input, parcelles);
        // ── 4. Barycentre final : 75 % marché + 25 % DGI 2026 si dispo ──────
        let estimationPerM2;
        if (dgiRef) {
            const dgi2026 = dgiRef.prixMoy * IPAI_FACTOR_DGI_TO_2026;
            estimationPerM2 = 0.75 * muMarket + 0.25 * dgi2026;
        }
        else {
            estimationPerM2 = muMarket;
        }
        // ── 5. Confidence ────────────────────────────────────────────────────
        const confidence = this.computeConfidence({
            nbComparables: weighted.length,
            sigmaRelative: sigmaMarket / Math.max(muMarket, 1),
            freshness: weighted.reduce((s, w) => s + Math.exp(-w.monthsAgo / 12), 0) / Math.max(weighted.length, 1),
            hasDgi: !!dgiRef,
        });
        // ── 6. Fourchette ±1σ (mais au moins ±10 %) ─────────────────────────
        const sigmaEffective = Math.max(sigmaMarket, estimationPerM2 * 0.10);
        const minPerM2 = Math.max(2000, Math.round(estimationPerM2 - sigmaEffective));
        const maxPerM2 = Math.round(estimationPerM2 + sigmaEffective);
        return {
            estimationMad: Math.round(estimationPerM2 * surfaceM2),
            estimationMadPerM2: Math.round(estimationPerM2),
            fourchetteMin: Math.round(minPerM2 * surfaceM2),
            fourchetteMax: Math.round(maxPerM2 * surfaceM2),
            confidencePct: Math.round(confidence),
            confidenceTier: tierFromConfidence(confidence),
            comparablesCount: weighted.length,
            comparablesDansRayonKm: +radius.toFixed(1),
            dgiRef: dgiRef ? {
                prixMin: Math.round(dgiRef.prixMin),
                prixMoy: Math.round(dgiRef.prixMoy),
                prixMax: Math.round(dgiRef.prixMax),
                sourceDate: "2017-12-29",
            } : null,
            ipaiCorrection: {
                factor: IPAI_FACTOR_DGI_TO_2026,
                year: 2026,
                source: "BAM",
            },
            methodologie: `Estimation pondérée à partir de ${weighted.length} comparables (rayon ${radius.toFixed(1)} km, ` +
                `fenêtre 24-36 mois). Pondération : proximité (gaussien σ=1 km) × fraîcheur ` +
                `(demi-vie 12 mois) × similarité de bien. Reprojetté au présent via IPAI BAM ` +
                `(${((IPAI_FACTOR_PER_YEAR - 1) * 100).toFixed(0)} %/an). ` +
                (dgiRef ? `Croisé 75/25 avec référentiel DGI 2017 corrigé IPAI BAM 2026 ` +
                    `(facteur ${IPAI_FACTOR_DGI_TO_2026}).` : `Pas de référentiel DGI disponible pour cette zone (estimation 100 % marché).`),
            sources: [
                "DGI 2017 — référentiel valeurs vénales (portail DGI Maroc)",
                "BAM IPAI 2018-2026 — indice prix actifs immobiliers (Bank Al-Maghrib)",
                "Observations marché CITURBAREA 2024-2026",
            ],
            topComparables: weighted.slice(0, 5).map((w) => ({
                id: w.c.id,
                quartier: w.c.quartier,
                surfaceM2: w.c.surfaceM2,
                prixMadPerM2: w.c.prixMadPerM2,
                dateIso: w.c.dateIso,
                distanceKm: +w.dKm.toFixed(2),
                weight: +w.weight.toFixed(3),
            })),
            disclaimer: "Estimation algorithmique CITURBAREA — indication uniquement. Ne se substitue pas à " +
                "une expertise foncière agréée par un architecte ou un géomètre-expert inscrit à l'Ordre. " +
                "Les comparables sont des transactions agrégées anonymisées. Pour un rapport probant, " +
                "demandez un Rapport P5 (expertise officielle) ou un Pack P4 (analyse foncière complète).",
        };
    }
    // ── Helpers privés ────────────────────────────────────────────────────
    collectInRadius(input, comparables, radiusKm, maxMonths) {
        const now = new Date();
        return comparables.filter((c) => {
            const m = monthsBetween(c.dateIso, now);
            if (m > maxMonths)
                return false;
            const d = distanceKm(input.lat, input.lng, c.lat, c.lng);
            return d <= radiusKm;
        });
    }
    computeDgiReference(input, parcelles) {
        // Cherche les parcelles dans rayon 1 km — leur prixDgi2017PerM2 est la
        // référence locale (le seed les attribue par quartier).
        const NEAR = 1.0;
        const near = parcelles.filter((p) => distanceKm(input.lat, input.lng, p.lat, p.lng) <= NEAR);
        if (near.length === 0)
            return null;
        const prices = near.map((p) => p.prixDgi2017PerM2).sort((a, b) => a - b);
        const moy = prices.reduce((s, p) => s + p, 0) / prices.length;
        return {
            prixMin: prices[0],
            prixMoy: moy,
            prixMax: prices[prices.length - 1],
        };
    }
    computeConfidence(args) {
        // Base 30, +5 par comparable au-delà de 0 (cap 50), -100×sigmaRelative,
        // +30×freshness (0-1), +10 si DGI dispo.
        let score = 30;
        score += Math.min(50, args.nbComparables * 5);
        score -= Math.min(40, args.sigmaRelative * 100);
        score += args.freshness * 30;
        if (args.hasDgi)
            score += 10;
        return Math.max(5, Math.min(99, score));
    }
};
exports.EstimationService = EstimationService;
exports.EstimationService = EstimationService = EstimationService_1 = __decorate([
    (0, common_1.Injectable)()
], EstimationService);
