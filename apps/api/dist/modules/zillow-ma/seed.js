"use strict";
/**
 * apps/api/src/modules/zillow-ma/seed.ts
 *
 * Génère DÉTERMINISTIQUEMENT 500 parcelles pilotes + 1000 comparables
 * historiques fictifs mais cohérents avec le marché MA 2026 (DGI 2017 × IPAI BAM).
 *
 * Méthode :
 *  - PRNG LCG seed=42 (mêmes nombres à chaque démarrage → tests stables)
 *  - Distribution multinomiale par quartier (pondérée)
 *  - Surface par bienFamily (terrain nu ≠ appartement)
 *  - Prix : baseline DGI × marché × IPAI(date) ± gaussienne σ=12%
 *
 * Le service ZillowMaService appelle generateSeed() au boot et charge tout
 * en RAM (~3 MB) — suffisant pour 500+1000 lignes.
 *
 * Les fichiers JSON dans apps/api/data/zillow-ma/ contiennent un EXTRAIT
 * (50+50) de ce même seed, committé pour servir de fixture humaine /
 * spec-by-example.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateParcelles = generateParcelles;
exports.generateComparables = generateComparables;
exports.quartierCentroids = quartierCentroids;
// ── PRNG déterministe ─────────────────────────────────────────────────────
function makePrng(seedInit) {
    let s = seedInit;
    return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };
}
function makeRandInt(rand) {
    return (min, max) => Math.floor(rand() * (max - min + 1)) + min;
}
function makeGauss(rand) {
    return (mean, stddev) => {
        let u = 0, v = 0;
        while (u === 0)
            u = rand();
        while (v === 0)
            v = rand();
        return mean + stddev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
}
function pickWeighted(items, rand) {
    const totalW = items.reduce((s, it) => s + it.w, 0);
    let r = rand() * totalW;
    for (const it of items) {
        r -= it.w;
        if (r <= 0)
            return it.v;
    }
    return items[items.length - 1].v;
}
const ZONES = {
    casablanca: {
        villeId: "casablanca",
        ville: "Casablanca",
        bbox: { latMin: 33.575, latMax: 33.605, lngMin: -7.660, lngMax: -7.610 },
        quartiers: [
            { name: "Anfa Supérieur", dgi: 18000, weight: 0.20 },
            { name: "Anfa Place", dgi: 22000, weight: 0.15 },
            { name: "California", dgi: 15000, weight: 0.15 },
            { name: "Aïn Diab", dgi: 20000, weight: 0.20 },
            { name: "Racine", dgi: 16000, weight: 0.15 },
            { name: "Bourgogne", dgi: 13000, weight: 0.10 },
            { name: "Triangle d'Or", dgi: 25000, weight: 0.05 },
        ],
        marcheFactor: { min: 1.30, max: 1.70, central: 1.50 },
        n: 170,
    },
    marrakech: {
        villeId: "marrakech",
        ville: "Marrakech",
        bbox: { latMin: 31.615, latMax: 31.645, lngMin: -8.005, lngMax: -7.960 },
        quartiers: [
            { name: "Gueliz Centre", dgi: 14000, weight: 0.25 },
            { name: "Hivernage", dgi: 18000, weight: 0.15 },
            { name: "Majorelle", dgi: 16000, weight: 0.15 },
            { name: "Targa", dgi: 9000, weight: 0.20 },
            { name: "Semlalia", dgi: 11000, weight: 0.15 },
            { name: "Avenue Mohammed VI", dgi: 13000, weight: 0.10 },
        ],
        marcheFactor: { min: 1.25, max: 1.65, central: 1.45 },
        n: 170,
    },
    tanger: {
        villeId: "tanger",
        ville: "Tanger",
        bbox: { latMin: 35.745, latMax: 35.785, lngMin: -5.860, lngMax: -5.795 },
        quartiers: [
            { name: "Marshan", dgi: 13000, weight: 0.20 },
            { name: "Boulevard Pasteur", dgi: 16000, weight: 0.15 },
            { name: "Iberia", dgi: 14000, weight: 0.15 },
            { name: "California Tanger", dgi: 12000, weight: 0.15 },
            { name: "Achakar (route)", dgi: 9000, weight: 0.15 },
            { name: "Malabata", dgi: 11000, weight: 0.20 },
        ],
        marcheFactor: { min: 1.20, max: 1.55, central: 1.38 },
        n: 160,
    },
};
const BIEN_FAMILY_DIST = [
    { v: "terrain_nu", w: 0.12 },
    { v: "terrain_constructible", w: 0.18 },
    { v: "villa", w: 0.20 },
    { v: "appartement", w: 0.32 },
    { v: "immeuble", w: 0.06 },
    { v: "local_commercial", w: 0.06 },
    { v: "bureau", w: 0.04 },
    { v: "industriel", w: 0.02 },
];
const STATUT_DIST = [
    { v: "TITRE_FONCIER", w: 0.60 },
    { v: "REQUISITION", w: 0.12 },
    { v: "MELK", w: 0.18 },
    { v: "COLLECTIF", w: 0.04 },
    { v: "HABOUS", w: 0.03 },
    { v: "DOMANIAL_PRIVE", w: 0.02 },
    { v: "INCONNU", w: 0.01 },
];
const RUES = {
    casablanca: ["Rue Jean Jaurès", "Rue d'Alger", "Boulevard d'Anfa", "Rue Ibnou Khaldoun", "Rue Soumaya", "Boulevard Yacoub El Mansour", "Rue de Provence", "Avenue Hassan II", "Rue Tahar Sebti", "Rue de la Mer Égée"],
    marrakech: ["Avenue Mohammed V", "Avenue Hassan II", "Rue de la Liberté", "Avenue Mohamed VI", "Rue Yougoslavie", "Rue Loubnane", "Boulevard Zerktouni", "Rue Ibn Aïcha", "Avenue Allal Ben Ahmed"],
    tanger: ["Boulevard Pasteur", "Avenue Mohammed VI", "Rue de Belgique", "Rue d'Espagne", "Avenue Hassan II", "Rue Sanlucar", "Boulevard Mohammed V", "Rue du Maroc"],
};
const TAGS_POOL = ["vue mer", "vue Atlas", "vue jardin", "ancien", "récent", "neuf", "rénové", "lotissement homologué", "proche école", "proche tramway", "calme", "à rénover", "sur axe principal", "résidence sécurisée", "piscine"];
function pickQuartier(quartiers, rand) {
    const totalW = quartiers.reduce((s, q) => s + q.weight, 0);
    let r = rand() * totalW;
    for (const q of quartiers) {
        r -= q.weight;
        if (r <= 0)
            return q;
    }
    return quartiers[quartiers.length - 1];
}
function surfaceFor(bienFamily, randInt) {
    switch (bienFamily) {
        case "terrain_nu": return randInt(150, 2000);
        case "terrain_constructible": return randInt(120, 800);
        case "villa": return randInt(180, 600);
        case "appartement": return randInt(45, 220);
        case "immeuble": return randInt(250, 1200);
        case "local_commercial": return randInt(30, 300);
        case "bureau": return randInt(40, 350);
        case "industriel": return randInt(500, 5000);
    }
}
function isoDateDaysAgo(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
}
function genTitreFoncier(villeId, randInt) {
    const prefix = villeId === "casablanca" ? "CA" : villeId === "marrakech" ? "MA" : "TG";
    return `${randInt(1000, 99999)}/${prefix}`;
}
function pickTags(rand, n = 2) {
    const out = [];
    const copy = [...TAGS_POOL];
    for (let i = 0; i < n && copy.length > 0; i++) {
        const idx = Math.floor(rand() * copy.length);
        out.push(copy.splice(idx, 1)[0]);
    }
    return out;
}
function generateParcelles() {
    const rand = makePrng(42);
    const randInt = makeRandInt(rand);
    const out = [];
    let pid = 0;
    for (const zoneKey of ["casablanca", "marrakech", "tanger"]) {
        const z = ZONES[zoneKey];
        for (let i = 0; i < z.n; i++) {
            const quartier = pickQuartier(z.quartiers, rand);
            const lat = z.bbox.latMin + rand() * (z.bbox.latMax - z.bbox.latMin);
            const lng = z.bbox.lngMin + rand() * (z.bbox.lngMax - z.bbox.lngMin);
            const bienFamily = pickWeighted(BIEN_FAMILY_DIST, rand);
            const statusJuridique = pickWeighted(STATUT_DIST, rand);
            const surfaceM2 = surfaceFor(bienFamily, randInt);
            const prixDgi2017PerM2 = Math.round(quartier.dgi * (0.85 + rand() * 0.30));
            let derniereTransaction = null;
            if (rand() < 0.60) {
                const monthsAgo = randInt(1, 30);
                const dateIso = isoDateDaysAgo(monthsAgo * 30);
                const ipai = Math.pow(1.05, (30 - monthsAgo) / 12);
                const central = quartier.dgi * z.marcheFactor.central * ipai;
                const gauss = makeGauss(rand);
                const prixPerM2 = Math.max(2000, Math.round(gauss(central, central * 0.12)));
                derniereTransaction = {
                    dateIso,
                    prixMad: prixPerM2 * surfaceM2,
                    prixMadPerM2: prixPerM2,
                };
            }
            const rues = RUES[zoneKey];
            const adresse = `${randInt(1, 250)} ${rues[Math.floor(rand() * rues.length)]}, ${quartier.name}, ${z.ville}`;
            const titreFoncierRef = statusJuridique === "TITRE_FONCIER" ? genTitreFoncier(zoneKey, randInt) : null;
            pid++;
            const numStr = String(pid).padStart(3, "0");
            out.push({
                id: `${zoneKey}-${numStr}`,
                ville: z.ville,
                villeId: zoneKey,
                quartier: quartier.name,
                adresse,
                lat: +lat.toFixed(6),
                lng: +lng.toFixed(6),
                surfaceM2,
                bienFamily,
                statusJuridique,
                prixDgi2017PerM2,
                derniereTransaction,
                titreFoncierRef,
                tags: pickTags(rand, 2),
            });
        }
    }
    return out;
}
function generateComparables() {
    // PRNG SÉPARÉ pour les comparables — on continue la séquence APRÈS les
    // parcelles pour stabilité (mais on consomme d'abord en générant les parcelles).
    // Pour rester strictement déterministe et indépendant, on prend seed=43.
    const rand = makePrng(43);
    const randInt = makeRandInt(rand);
    const gauss = makeGauss(rand);
    const out = [];
    let cid = 0;
    for (const zoneKey of ["casablanca", "marrakech", "tanger"]) {
        const z = ZONES[zoneKey];
        const nCity = zoneKey === "tanger" ? 334 : 333; // 333 + 333 + 334 = 1000
        for (let i = 0; i < nCity; i++) {
            const quartier = pickQuartier(z.quartiers, rand);
            const lat = z.bbox.latMin + rand() * (z.bbox.latMax - z.bbox.latMin);
            const lng = z.bbox.lngMin + rand() * (z.bbox.lngMax - z.bbox.lngMin);
            const bienFamily = pickWeighted(BIEN_FAMILY_DIST, rand);
            const surfaceM2 = surfaceFor(bienFamily, randInt);
            const monthsAgo = randInt(1, 36);
            const dateIso = isoDateDaysAgo(monthsAgo * 30);
            const ipai = Math.pow(1.05, (30 - monthsAgo) / 12);
            const central = quartier.dgi * z.marcheFactor.central * ipai;
            const prixPerM2 = Math.max(2000, Math.round(gauss(central, central * 0.14)));
            const prixMad = prixPerM2 * surfaceM2;
            const sourceRoll = rand();
            const source = sourceRoll < 0.40 ? "DGI_DECLARATIVE"
                : sourceRoll < 0.75 ? "ANNONCE_SCRAPE"
                    : sourceRoll < 0.92 ? "OBSERVATION_CITURBAREA"
                        : "NOTAIRE_PARTENAIRE";
            cid++;
            const numStr = String(cid).padStart(4, "0");
            out.push({
                id: `cmp-${numStr}`,
                ville: z.ville,
                villeId: zoneKey,
                quartier: quartier.name,
                lat: +lat.toFixed(6),
                lng: +lng.toFixed(6),
                surfaceM2,
                bienFamily,
                prixMad,
                prixMadPerM2: prixPerM2,
                dateIso,
                source,
            });
        }
    }
    return out;
}
/**
 * Centroïdes des quartiers — calculés à partir des coordonnées seedées.
 * Évite un fetch externe. Cohérent avec la heatmap.
 */
function quartierCentroids(parcelles) {
    const groups = new Map();
    for (const p of parcelles) {
        const key = `${p.villeId}::${p.quartier}`;
        const cur = groups.get(key) ?? { latSum: 0, lngSum: 0, n: 0 };
        cur.latSum += p.lat;
        cur.lngSum += p.lng;
        cur.n += 1;
        groups.set(key, cur);
    }
    const out = new Map();
    for (const [k, v] of groups)
        out.set(k, { lat: v.latSum / v.n, lng: v.lngSum / v.n });
    return out;
}
