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
var ZoneDetectorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZoneDetectorService = void 0;
const common_1 = require("@nestjs/common");
const sig_data_service_1 = require("./sig-data.service");
/** Identique à apps/api/src/tomes/tome-6/p5/pricing.service.ts (recalibré 2025-26). */
const ZONE_PRICE_RANGE = {
    RURAL: { min: 500, max: 2500 },
    PERIPHERIE: { min: 1500, max: 4000 },
    VILLE_MOYENNE: { min: 3000, max: 7000 },
    URBAIN: { min: 5000, max: 10000 },
    BON_QUARTIER: { min: 8000, max: 14000 },
    PREMIUM: { min: 12000, max: 22000 },
    PRESTIGE: { min: 20000, max: 35000 },
    ULTRA: { min: 30000, max: 50000 },
};
const FONCIER_MULTIPLIER_BY_FAMILY = {
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
const ARRONDISSEMENT_TIER = {
    // RABAT
    "hassan": "BON_QUARTIER",
    "agdal": "BON_QUARTIER",
    "agdal-ryad": "BON_QUARTIER",
    "ryad": "BON_QUARTIER",
    "hay riad": "BON_QUARTIER",
    "souissi": "PREMIUM",
    "el youssoufia": "URBAIN",
    "youssoufia": "URBAIN",
    "yaacoub el mansour": "URBAIN",
    "yacoub el mansour": "URBAIN",
    "akkari": "PERIPHERIE",
    "medina": "URBAIN",
    "médina": "URBAIN",
    "touarga": "PRESTIGE",
    // SALÉ
    "bettana": "URBAIN",
    "hssaine": "URBAIN",
    "tabriquet": "URBAIN",
    "bab lamrissa": "BON_QUARTIER",
    "lamrissa": "BON_QUARTIER",
    "layayda": "PERIPHERIE",
    "shoul": "RURAL",
    "sidi bouknadel": "VILLE_MOYENNE",
    "bouknadel": "VILLE_MOYENNE",
    "sale al jadida": "URBAIN",
    // TÉMARA / SKHIRAT
    "temara": "BON_QUARTIER",
    "témara": "BON_QUARTIER",
    "harhoura": "PREMIUM",
    "ain atig": "URBAIN",
    "aïn atig": "URBAIN",
    "skhirat": "BON_QUARTIER",
    "mers el kheir": "VILLE_MOYENNE",
    // KÉNITRA
    "bir rami": "BON_QUARTIER",
    "maamoura": "URBAIN",
    "saknia": "URBAIN",
    "mehdia": "VILLE_MOYENNE",
    // CASA - arrondissements clés
    "anfa": "PREMIUM",
    "maarif": "BON_QUARTIER",
    "gauthier": "PREMIUM",
    "bourgogne": "BON_QUARTIER",
    "racine": "PREMIUM",
    "ain diab": "PREMIUM",
    "aïn diab": "PREMIUM",
    "ain sebaa": "URBAIN",
    "hay hassani": "PERIPHERIE",
    "sidi bernoussi": "PERIPHERIE",
    "sidi maarouf": "URBAIN",
    "californie": "BON_QUARTIER",
    "bd d'anfa": "ULTRA",
    "anfa superieur": "ULTRA",
    "cfc": "ULTRA",
    // MARRAKECH
    "gueliz": "BON_QUARTIER",
    "guéliz": "BON_QUARTIER",
    "hivernage": "PREMIUM",
    "palmeraie": "PREMIUM",
    "targa": "URBAIN",
    "massira": "URBAIN",
    "daoudiate": "URBAIN",
    "sidi ghanem": "PERIPHERIE",
    "mhamid": "PERIPHERIE",
    // TANGER
    "marina": "PREMIUM",
    "iberia": "BON_QUARTIER",
    "marshan": "BON_QUARTIER",
    "malabata": "URBAIN",
    "boukhalef": "URBAIN",
    "branes": "PERIPHERIE",
    "tanger ville": "BON_QUARTIER",
};
const HIGH_VALUE_AXES = [
    // RABAT — Agdal axes immeubles R+5+
    { pattern: /\bavenue\s+abtal|\bav\.?\s+abtal|\babtal\b/i, arrondMatch: ["agdal", "agdal-ryad"],
        tier: "PREMIUM", suggestedFamily: "GRAND_COLLECTIF",
        reasoning: "Avenue Abtal (Agdal) — axe R+5+ immeubles denses, signature marché 20-30 000 DH/m² pour terrain immeuble." },
    { pattern: /\bavenue\s+(?:de\s+)?fal\s*ould?\s*oumeir/i, arrondMatch: ["agdal", "agdal-ryad"],
        tier: "PREMIUM", suggestedFamily: "GRAND_COLLECTIF",
        reasoning: "Avenue Fal Ould Oumeir (Agdal) — axe principal immeubles haut Agdal." },
    { pattern: /\b(?:av\.?|avenue|bd|boulevard)\s+(?:de\s+)?france\b/i, arrondMatch: ["agdal", "agdal-ryad", "hassan"],
        tier: "PREMIUM", suggestedFamily: "GRAND_COLLECTIF",
        reasoning: "Avenue de France (Agdal/Hassan) — axe FAR immeubles premium, jusqu'à 30 000 DH/m²." },
    { pattern: /\b(?:av\.?|avenue|bd|boulevard)\s+(?:des\s+)?f\.?a\.?r\.?\b|\bforces\s+arm/i, arrondMatch: ["agdal", "hassan"],
        tier: "PREMIUM", suggestedFamily: "GRAND_COLLECTIF",
        reasoning: "Avenue des FAR (Agdal/Hassan) — axe immeubles premium." },
    { pattern: /\bavenue\s+(?:al\s*)?(?:médi?n[ea]|medina)\b/i, arrondMatch: ["agdal", "agdal-ryad"],
        tier: "BON_QUARTIER", suggestedFamily: "PETIT_COLLECTIF",
        reasoning: "Avenue Médina (Agdal) — axe immeubles intermédiaires." },
    // RABAT — Mohammed VI (selon le tronçon : varie énormément)
    { pattern: /\b(?:av\.?|avenue|bd|boulevard)\s+mohamm?ed\s*(?:vi|6)\b/i, arrondMatch: ["agdal", "agdal-ryad", "hay riad", "ryad"],
        tier: "PREMIUM", suggestedFamily: "GRAND_COLLECTIF",
        reasoning: "Avenue Mohammed VI tronçon Agdal/Hay Riad — axe prestige immeubles + commerces, 20-35 000 DH/m²." },
    { pattern: /\b(?:av\.?|avenue|bd|boulevard)\s+mohamm?ed\s*(?:vi|6)\b/i, arrondMatch: ["souissi"],
        tier: "PRESTIGE", suggestedFamily: "GRAND_COLLECTIF",
        reasoning: "Avenue Mohammed VI tronçon Souissi — proche palais et ambassades, foncier exceptionnel." },
    { pattern: /\b(?:av\.?|avenue|bd|boulevard)\s+mohamm?ed\s*(?:vi|6)\b/i, arrondMatch: ["hassan"],
        tier: "PREMIUM", suggestedFamily: "GRAND_COLLECTIF",
        reasoning: "Avenue Mohammed VI tronçon Hassan — axe central R+8+ immeubles premium." },
    // RABAT — Souissi axes villa
    { pattern: /\bavenue\s+imam\s+malik|\bambassade|\borangerai?e/i, arrondMatch: ["souissi"],
        tier: "PREMIUM", suggestedFamily: "VILLA",
        reasoning: "Souissi — quartier ambassades / Orangerie, villas grand standing 15-25 000 DH/m²." },
    // CASA — Bd d'Anfa et Anfa Supérieur
    { pattern: /\b(?:bd|boulevard|av\.?|avenue)\s+(?:d')?anfa\b/i, arrondMatch: ["anfa"],
        tier: "ULTRA", suggestedFamily: "GRAND_COLLECTIF",
        reasoning: "Boulevard d'Anfa (Casablanca) — artère prestige absolue, foncier immeuble 35-60 000 DH/m²." },
    { pattern: /\banfa\s+sup(?:e|é)rieur/i, arrondMatch: ["anfa"],
        tier: "ULTRA", suggestedFamily: "VILLA",
        reasoning: "Anfa Supérieur — villas premium et ultra-prime Casablanca." },
    { pattern: /\b(?:cfc|casa\s*finance\s*city)\b/i,
        tier: "ULTRA", suggestedFamily: "GRAND_COLLECTIF",
        reasoning: "Casa Finance City — zone IFC, foncier business tower exceptionnel." },
    { pattern: /\b(?:ain\s+diab|ain-diab)\b/i, arrondMatch: ["anfa", "ain diab", "ain chock"],
        tier: "PRESTIGE", suggestedFamily: "VILLA",
        reasoning: "Aïn Diab front de mer — villa premium et immeubles vue océan." },
    // MARRAKECH
    { pattern: /\bhivernage\b/i, arrondMatch: ["marrakech", "hivernage"],
        tier: "PREMIUM", suggestedFamily: "GRAND_COLLECTIF",
        reasoning: "Hivernage Marrakech — quartier hôtelier et résidentiel premium." },
    { pattern: /\bpalmer?aie\b/i, arrondMatch: ["marrakech", "palmeraie"],
        tier: "PREMIUM", suggestedFamily: "VILLA",
        reasoning: "Palmeraie Marrakech — lots villa grand standing." },
    // TANGER
    { pattern: /\bmarina\b/i, arrondMatch: ["tanger"],
        tier: "PREMIUM", suggestedFamily: "GRAND_COLLECTIF",
        reasoning: "Marina Tanger — front portuaire haut standing." },
];
function detectAxisOverride(address, arrondissement) {
    if (!address)
        return null;
    const addrLower = address.toLowerCase();
    const arrondLower = (arrondissement || "").toLowerCase();
    for (const axis of HIGH_VALUE_AXES) {
        if (!axis.pattern.test(addrLower))
            continue;
        if (axis.arrondMatch && axis.arrondMatch.length > 0) {
            const matches = axis.arrondMatch.some(a => arrondLower.includes(a));
            if (!matches)
                continue;
        }
        return axis;
    }
    return null;
}
/**
 * Suggestion automatique du bienFamily depuis le zoning AURS détecté.
 * Logique : on lit le code zone + COS + hauteur_max pour déduire la vocation
 * dominante (villa R+2 max vs immeuble R+5+ vs équipement).
 */
function suggestFamilyFromZoning(zoning) {
    if (!zoning)
        return null;
    const code = (zoning.zone || "").trim().toUpperCase();
    const def = (zoning.definition || "").toLowerCase();
    const cos = typeof zoning.cos === "number" ? zoning.cos : null;
    const hMax = typeof zoning.hauteurMax === "number" ? zoning.hauteurMax : null;
    // Hauteur ou COS très élevés → immeuble en hauteur certain
    if ((hMax != null && hMax >= 20) || (cos != null && cos >= 2.5)) {
        return { family: "GRAND_COLLECTIF", reasoning: `Zoning ${code || ""} avec ${hMax ? `hauteur max ${hMax}m` : `COS ${cos}`} → grand collectif R+5+ certain.` };
    }
    // Hauteur intermédiaire → petit collectif
    if ((hMax != null && hMax >= 12 && hMax < 20) || (cos != null && cos >= 1.5 && cos < 2.5)) {
        return { family: "PETIT_COLLECTIF", reasoning: `Zoning ${code || ""} avec ${hMax ? `hauteur ${hMax}m` : `COS ${cos}`} → petit collectif R+1 à R+4.` };
    }
    // Codes villa R1/R2/V
    if (/^(R1|R2|V|VL|RH|RM)/.test(code) || def.includes("villa") || def.includes("habitations néo-traditionnelles")) {
        return { family: "VILLA", reasoning: `Zoning ${code} (zone villa / habitations) → terrain destiné villa R+2 max.` };
    }
    // Codes immeubles R3+
    if (/^R[3-9]/.test(code) || def.includes("immeuble")) {
        return { family: "GRAND_COLLECTIF", reasoning: `Zoning ${code} → terrain destiné immeuble en hauteur.` };
    }
    // Zones d'équipement
    if (/^E\d?$/.test(code) || /^UGE/.test(code) || def.includes("équipement") || def.includes("equipement")) {
        return { family: "EQUIPEMENT", reasoning: `Zoning ${code} → terrain destiné équipement public (école, hôtel, hangar…).` };
    }
    // Zones naturelles/agricoles → terrain nu sans construction
    if (/^(RB|A|NA|ZA)/.test(code) || def.includes("naturelle") || def.includes("protection") || def.includes("agricole")) {
        return { family: "TERRAIN_NU", reasoning: `Zoning ${code} (zone naturelle / agricole / protégée) → terrain non constructible.` };
    }
    return null;
}
/**
 * Mapping zone réglementaire AURS (code `zone` ou mots-clés `definition`)
 * → ajustement du tier de base. Peut faire MONTER (centre urbain dense) ou
 * BAISSER (zone naturelle/agricole/industrielle) le tier dérivé du quartier.
 *
 * v2 — boost basé sur COS et hauteur_max quand disponibles.
 */
function adjustTierByZoning(baseTier, zoning) {
    const tierOrder = ["RURAL", "PERIPHERIE", "VILLE_MOYENNE", "URBAIN", "BON_QUARTIER", "PREMIUM", "PRESTIGE", "ULTRA"];
    const idx = tierOrder.indexOf(baseTier);
    const adjust = (delta, why) => {
        const newIdx = Math.max(0, Math.min(tierOrder.length - 1, idx + delta));
        return { tier: tierOrder[newIdx], reasoning: why };
    };
    const code = (zoning.zone || "").trim().toUpperCase();
    const def = (zoning.definition || "").toLowerCase();
    const cos = typeof zoning.cos === "number" ? zoning.cos : null;
    const hMax = typeof zoning.hauteurMax === "number" ? zoning.hauteurMax : null;
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
    if (def.includes("équipement") || def.includes("equipement") || /^E\d?$/.test(code) || /^UGE/.test(code)) {
        return { tier: "BON_QUARTIER", reasoning: `Zone d'équipement (${code || "code N/A"}) — alignée sur le tier BON_QUARTIER.` };
    }
    // COS / hauteur élevés : la rente du foncier monte avec le COS (immeuble R+5+)
    // Boost progressif : COS 2-3 → +1, COS 3+ ou hauteur >25m → +2
    if ((cos != null && cos >= 3.0) || (hMax != null && hMax >= 25)) {
        return adjust(2, `Zone à très haute densité (${cos ? `COS ${cos}` : `hauteur ${hMax}m`}) → tier rehaussé de 2 crans (rente foncière maximale).`);
    }
    if ((cos != null && cos >= 2.0) || (hMax != null && hMax >= 20)) {
        return adjust(1, `Zone à haute densité (${cos ? `COS ${cos}` : `hauteur ${hMax}m`}) → tier rehaussé d'un cran (rente immeuble R+5+).`);
    }
    // Zones villas (R1, R2, V, RH = résidence habitations) → +1 tier
    if (/^(R[12]|V|VL|RH)/.test(code) || def.includes("villa") || def.includes("habitations néo-traditionnelles")) {
        return adjust(1, `Zone réglementaire villa (${code || "définition contient « villa »"}) — tier rehaussé d'un cran.`);
    }
    // Zones immeubles denses (R4+) → +1 tier (rente du COS implicite)
    if (/^R[4-9]/.test(code) || def.includes("immeuble")) {
        return adjust(1, `Zone d'immeubles en hauteur (${code}) — COS élevé, tier rehaussé d'un cran.`);
    }
    // Centre urbain / quartier d'habitat dense
    if (def.includes("centre") || def.includes("dense") || def.includes("habitat et d'activité") || def.includes("habitat et activité")) {
        return { tier: baseTier, reasoning: `Zone d'habitat et d'activité (${code || "centre urbain"}) — tier de base conservé.` };
    }
    return { tier: baseTier, reasoning: `Zoning ${code || "non spécifique"} — fourchette basée sur la signature prix du quartier.` };
}
function normalizeArrondissement(s) {
    if (!s)
        return "";
    return s.toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip accents
        .trim();
}
/**
 * Point-in-polygon par ray casting (suffisant pour polygones simples + multi).
 */
function pointInRing(point, ring) {
    let inside = false;
    const [px, py] = point;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        const intersect = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-12) + xi);
        if (intersect)
            inside = !inside;
    }
    return inside;
}
function pointInFeature(point, feature) {
    const geom = feature?.geometry;
    if (!geom)
        return false;
    if (geom.type === "Polygon") {
        // Premier ring = outer, suivants = trous
        if (!pointInRing(point, geom.coordinates[0]))
            return false;
        for (let k = 1; k < geom.coordinates.length; k++) {
            if (pointInRing(point, geom.coordinates[k]))
                return false;
        }
        return true;
    }
    if (geom.type === "MultiPolygon") {
        return geom.coordinates.some((poly) => {
            if (!pointInRing(point, poly[0]))
                return false;
            for (let k = 1; k < poly.length; k++) {
                if (pointInRing(point, poly[k]))
                    return false;
            }
            return true;
        });
    }
    return false;
}
let ZoneDetectorService = ZoneDetectorService_1 = class ZoneDetectorService {
    sig;
    logger = new common_1.Logger(ZoneDetectorService_1.name);
    constructor(sig) {
        this.sig = sig;
    }
    /**
     * Auto-détection complète à partir d'une géolocalisation + métadonnées.
     *
     * Renvoie toujours un résultat exploitable :
     *  - Si GPS + zone AURS trouvée → fourchette précise basée sur zoning réel
     *  - Si GPS seul → fourchette basée sur arrondissement détecté par AURS
     *  - Si commune seule (pas de GPS) → fourchette basée sur mapping commune
     *  - Si rien (pas de GPS ni commune) → tier par défaut URBAIN + warning
     */
    async detect(input) {
        let chosenFamily = input.bienFamily || "VILLA";
        let suggestedFamily = null;
        let detected = { source: "default" };
        let baseTier = "URBAIN";
        let reasoning = [];
        // 1) Si on a des coords GPS, on tente le point-in-polygon sur les couches AURS
        if (input.lat != null && input.lng != null
            && Number.isFinite(+input.lat) && Number.isFinite(+input.lng)) {
            const point = [+input.lng, +input.lat]; // GeoJSON = [lng, lat]
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
                    // Auto-suggestion bien family depuis le zoning officiel
                    suggestedFamily = suggestFamilyFromZoning(aursMatch.zoning);
                    if (suggestedFamily) {
                        reasoning.push(`Vocation urbanistique détectée : ${suggestedFamily.family} — ${suggestedFamily.reasoning}`);
                    }
                }
            }
            else {
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
            }
            else {
                reasoning.push(`Commune « ${input.commune} » non dans le mapping fin — tier par défaut URBAIN appliqué.`);
                detected = { source: "default_fallback", commune: input.commune };
            }
        }
        if (detected.source === "default") {
            reasoning.push("Aucune géolocalisation ni commune exploitable — tier URBAIN par défaut.");
        }
        // 2.5) Override par AXE ROUTIER (priorité haute : Abtal, Mohammed VI, Anfa)
        //      On regarde l'adresse texte fournie + l'arrondissement détecté pour
        //      matcher un axe à haute valeur (granularité plus fine que l'arrondissement).
        if (input.address) {
            const arrondForAxis = detected.arrondissement || input.commune;
            const axisOverride = detectAxisOverride(input.address, arrondForAxis);
            if (axisOverride) {
                baseTier = axisOverride.tier;
                reasoning.push(`🛣 Axe routier reconnu : « ${input.address} » → ${axisOverride.reasoning}`);
                if (axisOverride.suggestedFamily && !suggestedFamily) {
                    suggestedFamily = { family: axisOverride.suggestedFamily, reasoning: `Vocation typique de l'axe « ${input.address} ».` };
                }
            }
        }
        // 3) Décision finale sur le bienFamily à appliquer pour le calcul prix :
        //    - Si l'utilisateur a explicitement passé un bienFamily → on respecte
        //    - Sinon, on utilise la suggestion auto (si disponible)
        //    - Sinon, VILLA par défaut
        const familyForPricing = input.bienFamily || suggestedFamily?.family || "VILLA";
        chosenFamily = familyForPricing;
        const familyMult = FONCIER_MULTIPLIER_BY_FAMILY[familyForPricing] ?? 1.0;
        // 4) Calcul de la fourchette finale (× multiplicateur destination)
        const range = ZONE_PRICE_RANGE[baseTier];
        const finalMin = Math.round(range.min * familyMult);
        const finalMax = Math.round(range.max * familyMult);
        const finalMid = Math.round(((range.min + range.max) / 2) * familyMult);
        if (familyMult !== 1.0) {
            reasoning.push(`Multiplicateur destination ${familyForPricing} ×${familyMult} appliqué (rente COS pour immeubles vs villa).`);
        }
        // 5) Détermine la fiche DGI/AU pertinente
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
                bienFamily: chosenFamily,
                suggestedBienFamily: suggestedFamily?.family, // ce que le zoning suggère
                suggestedBienFamilyReason: suggestedFamily?.reasoning,
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
    async queryAursLayers(point) {
        // Ordre : zonage régl (31) > secteurs (32) > lotissements (28) > îlots (29)
        const layerPriority = [
            { id: "31", label: "Zonage réglementaire", isZoning: true },
            { id: "32", label: "Secteurs urbains", isZoning: true },
            { id: "28", label: "Lotissements", isZoning: false },
            { id: "29", label: "Îlots", isZoning: false },
        ];
        for (const layer of layerPriority) {
            try {
                const data = await this.sig.getLayerGeoJson("aurs", layer.id);
                const feats = data?.features || [];
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
            }
            catch (e) {
                this.logger.warn(`[zone-detector] AURS layer ${layer.id} failed: ${e.message}`);
            }
        }
        return null;
    }
};
exports.ZoneDetectorService = ZoneDetectorService;
exports.ZoneDetectorService = ZoneDetectorService = ZoneDetectorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sig_data_service_1.SigDataService])
], ZoneDetectorService);
