"use strict";
/**
 * Tome 2 — PC Checklist builder.
 *
 * Compose la liste de pièces requises à partir du référentiel
 * `apps/api/data/permis-construire/pieces-requises.json` selon le couple
 * (projectType, commune).
 *
 * Pure function : aucun side-effect, idéal pour tests + appel depuis service.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadReferential = loadReferential;
exports.buildChecklist = buildChecklist;
exports.estimateZoneSismique = estimateZoneSismique;
const fs = require("fs");
const path = require("path");
/** Cache lazy du JSON (lecture disque 1× par process). */
let _cache = null;
/** Charge le référentiel depuis disque (lazy). */
function loadReferential() {
    if (_cache)
        return _cache;
    // Résolution robuste : essaie cwd, puis dirname remontant jusqu'à `data/`.
    const candidates = [
        path.resolve(process.cwd(), "apps/api/data/permis-construire/pieces-requises.json"),
        path.resolve(process.cwd(), "data/permis-construire/pieces-requises.json"),
        path.resolve(__dirname, "../../../data/permis-construire/pieces-requises.json"),
        path.resolve(__dirname, "../../../../data/permis-construire/pieces-requises.json"),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            const raw = fs.readFileSync(p, "utf8");
            _cache = JSON.parse(raw);
            return _cache;
        }
    }
    throw new Error("[permis-construire] Référentiel pieces-requises.json introuvable — vérifier apps/api/data/permis-construire/");
}
/** Normalisation simple commune (uppercase, sans accents). */
function normalizeCommune(c) {
    if (!c)
        return "";
    return c
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/['’`-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}
/**
 * Construit la checklist complète pour un projet donné.
 * Déduplique par `code` (le dernier ajouté gagne).
 */
function buildChecklist(opts) {
    const ref = loadReferential();
    const out = new Map();
    for (const p of ref.commonPieces)
        out.set(p.code, p);
    if (opts.projectType && ref.byProjectType[opts.projectType]) {
        for (const p of ref.byProjectType[opts.projectType].additional ?? []) {
            out.set(p.code, p);
        }
    }
    const communeKey = normalizeCommune(opts.commune);
    if (communeKey && ref.communeOverrides[communeKey]) {
        for (const p of ref.communeOverrides[communeKey].add ?? []) {
            out.set(p.code, p);
        }
    }
    return Array.from(out.values()).sort((a, b) => {
        // Tri stable : required d'abord, puis category, puis label.
        if (a.required !== b.required)
            return a.required ? -1 : 1;
        if (a.category !== b.category)
            return a.category.localeCompare(b.category);
        return a.label.localeCompare(b.label, "fr");
    });
}
/** Estime la zone sismique RPS 2011 selon la commune (mapping simplifié). */
function estimateZoneSismique(commune) {
    const key = normalizeCommune(commune);
    if (!key)
        return null;
    // Mapping simplifié RPS 2011 — à enrichir via maroc-admin si besoin.
    const ZONES = {
        AGADIR: "IV",
        "AL HOCEIMA": "IV",
        NADOR: "III",
        TANGER: "III",
        TETOUAN: "III",
        FES: "III",
        MEKNES: "II",
        RABAT: "II",
        SALE: "II",
        CASABLANCA: "II",
        MARRAKECH: "II",
        OUARZAZATE: "III",
        OUJDA: "II",
        LAAYOUNE: "I",
        DAKHLA: "I",
    };
    return ZONES[key] ?? "II";
}
