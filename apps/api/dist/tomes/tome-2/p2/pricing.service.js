"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.P2PricingService = exports.BAREME_CNOA_2021 = void 0;
const common_1 = require("@nestjs/common");
exports.BAREME_CNOA_2021 = {
    // 1.x — Habitat individuel petit gabarit
    "1.1": { label: "Habitat RDC ou R+3 max — surface plancher ≤ 500 m² — zone d'aménagement", costPerM2: 1900, validSections: ["IMM", "GR"], photoOptionAvailable: true },
    "1.2": { label: "Habitat social 250 000 / 140 000 DH (convention Etat) — lotissement obligatoire", costPerM2: 1900, validSections: ["IMM", "GR"], photoOptionAvailable: true },
    // 3.x — Immeubles collectifs et bureaux R+4 et plus
    "3.1": { label: "Immeubles collectifs et bureaux R+4+", costPerM2: 2500, validSections: ["IMM", "GR"], photoOptionAvailable: true },
    "3.2": { label: "Immeubles collectifs moyen standing R+4+", costPerM2: 3700, validSections: ["IMM", "GR"], photoOptionAvailable: true },
    "3.3": { label: "Immeubles collectifs haut standing R+4+", costPerM2: 5000, validSections: ["IMM", "GR"], photoOptionAvailable: true },
    // 4.x — Villas
    "4.1": { label: "Villas en bande", costPerM2: 3500, validSections: ["IMM", "GR"], photoOptionAvailable: true },
    "4.2": { label: "Villas en bande de standing", costPerM2: 4000, validSections: ["IMM", "GR"], photoOptionAvailable: true },
    "4.3": { label: "Villas jumelées", costPerM2: 4000, validSections: ["IMM", "GR"], photoOptionAvailable: true },
    "4.4": { label: "Villas jumelées de standing", costPerM2: 6000, validSections: ["IMM", "GR"], photoOptionAvailable: true },
    "4.5": { label: "Villas isolées", costPerM2: 4000, validSections: ["IMM", "GR"], photoOptionAvailable: true },
    "4.6": { label: "Villas isolées de standing", costPerM2: 6000, validSections: ["IMM", "GR"], photoOptionAvailable: true },
    // 5.x — Équipements privés d'intérêt général (EPIG)
    "5.1": { label: "Hangars agricoles", costPerM2: 1500, validSections: ["EPIG"], photoOptionAvailable: true },
    "5.2": { label: "Hangars et dépôts industriels", costPerM2: 2500, validSections: ["EPIG"], photoOptionAvailable: true },
    "5.3": { label: "Écoles, collèges, lycées, mosquées", costPerM2: 3500, validSections: ["EPIG"], photoOptionAvailable: true },
    "5.4": { label: "Usines", costPerM2: 2500, validSections: ["EPIG"], photoOptionAvailable: true },
    "5.5": { label: "Hôtel 2★ / résidence touristique / maison d'hôte / hémodialyse / laboratoire", costPerM2: 3500, validSections: ["EPIG"], photoOptionAvailable: false, notes: "DCE + CPS + suivi physique obligatoires" },
    "5.6": { label: "Hôtel 3★", costPerM2: 5000, validSections: ["EPIG"], photoOptionAvailable: false, notes: "DCE + CPS + suivi physique obligatoires" },
    "5.7": { label: "Cliniques", costPerM2: 5500, validSections: ["EPIG"], photoOptionAvailable: false, notes: "Hospitalier — DCE + CPS + suivi physique obligatoires" },
    "5.8": { label: "Hôtel 4★", costPerM2: 7000, validSections: ["EPIG"], photoOptionAvailable: false, notes: "DCE + CPS + suivi physique obligatoires" },
    "5.9": { label: "Hôtel 5★ et équipement haut standing", costPerM2: 9000, validSections: ["EPIG"], photoOptionAvailable: false, notes: "Haut standing — DCE + CPS + suivi physique obligatoires" },
    // 6.x — Aménagements
    "6.1": { label: "Petit aménagement intérieur (locaux divers ≤ 50 m²)", costPerM2: 2500, validSections: ["AMG"], photoOptionAvailable: true },
    "6.2": { label: "Grand aménagement (agences bancaires, télécom, show-room, …)", costPerM2: 4500, validSections: ["AMG"], photoOptionAvailable: true },
};
const SECTION_LABELS = {
    IMM: "Immeuble (unité)",
    GR: "Groupement résidentiel",
    LOT: "Lotissement / morcellement",
    EPIG: "Équipement privé d'intérêt général",
    AMG: "Aménagement (transformation usage)",
};
const HONORAIRES_RATE = 0.05;
const TVA_RATE = 0.2;
const PHASE_A_RATE = 0.4;
const PHASE_B_RATE = 0.3;
const PHASE_C_ON_SITE_RATE = 0.3;
const PHASE_C_PHOTOS_RATE = 0.1;
let P2PricingService = class P2PricingService {
    computeQuote(input) {
        const section = input.section;
        const followMode = input.followMode ?? "ON_SITE";
        const nbBatiments = Math.max(1, Math.floor(input.nbBatiments ?? 1));
        // Cas LOT: pas de calcul auto (grille à finaliser)
        if (section === "LOT") {
            return {
                ok: true,
                currency: "MAD",
                meta: {
                    section: "LOT",
                    sectionLabel: SECTION_LABELS.LOT,
                    followMode: "ON_SITE",
                    photoOptionAvailable: false,
                    requiresQuotePersonnalise: true,
                },
                base: { nbBatiments: 1, surfaceTerrainHa: input.surfaceTerrainHa },
                honoraires: {
                    rate: HONORAIRES_RATE,
                    totalHT: null,
                    tvaRate: TVA_RATE,
                    tva: null,
                    totalTTC: null,
                    breakdown: { phaseA_esquisseAutorisation: null, phaseB_dceCps: null, phaseC_suivi: null },
                },
                visaCroa: { payableSeparately: true, note: this.visaCroaNote() },
                decennale: {
                    applicable: false,
                    note: "Pas de garantie décennale sur les travaux de lotissement (voiries/réseaux divers). La décennale s'applique aux constructions à venir sur chaque lot.",
                },
                notes: [
                    "La grille tarifaire des honoraires de lotissement (par tranche de surface en hectares) est en cours de finalisation par CITURBAREA.",
                    "Notre équipe vous recontacte sous 24h pour vous proposer un devis personnalisé.",
                    "Référence légale : Loi 25-90 (lotissements) + Contrat type unifié Lotissement (CNOA 28-02-2024).",
                ],
            };
        }
        // Cas IMM, GR, EPIG, AMG : nécessitent categoryCode + surfacePlancher
        const categoryCode = input.categoryCode;
        if (!categoryCode) {
            throw new Error(`categoryCode requis pour la section ${section}`);
        }
        const cat = exports.BAREME_CNOA_2021[categoryCode];
        if (!cat) {
            throw new Error(`Catégorie inconnue : ${categoryCode}`);
        }
        if (!cat.validSections.includes(section)) {
            throw new Error(`Catégorie ${categoryCode} non valide pour la section ${section}. Sections valides : ${cat.validSections.join(", ")}`);
        }
        const surfacePlancherM2 = input.surfacePlancherM2;
        if (!surfacePlancherM2 || surfacePlancherM2 <= 0) {
            throw new Error("surfacePlancherM2 requis et > 0");
        }
        // Photo option: désactivée si la catégorie l'interdit
        const effectiveFollowMode = !cat.photoOptionAvailable && followMode === "PHOTOS" ? "ON_SITE" : followMode;
        const phaseCRate = effectiveFollowMode === "PHOTOS" ? PHASE_C_PHOTOS_RATE : PHASE_C_ON_SITE_RATE;
        const coutTravauxEstime = surfacePlancherM2 * cat.costPerM2 * nbBatiments;
        const totalHT = Math.round(coutTravauxEstime * HONORAIRES_RATE);
        const tva = Math.round(totalHT * TVA_RATE);
        const totalTTC = totalHT + tva;
        const phaseA = Math.round(totalHT * PHASE_A_RATE);
        const phaseB = Math.round(totalHT * PHASE_B_RATE);
        const phaseC = Math.round(totalHT * phaseCRate);
        const decennale = this.buildDecennale(section);
        const notes = [
            "Honoraires calculés sur estimation provisoire (article 5 du contrat type unifié Construction CNOA).",
            "Le montant final sera révisé sur la base du coût réel des travaux après adjudication.",
            "Standing à confirmer par le client : les honoraires peuvent être révisés à la hausse en cas de constatation d'un standing supérieur ou de demande de montée en gamme du maître d'ouvrage.",
            "TVA 20% incluse en sus des honoraires HT.",
        ];
        if (cat.notes)
            notes.push(`Catégorie : ${cat.notes}`);
        if (!cat.photoOptionAvailable && followMode === "PHOTOS") {
            notes.push("Suivi photos non disponible pour cette catégorie — DCE+CPS+suivi physique obligatoires. Suivi physique appliqué (30%).");
        }
        if (effectiveFollowMode === "PHOTOS") {
            notes.push("Suivi par photos plateforme : 1 photo par réception (gros œuvre par élément de structure + second œuvre par étage).");
        }
        return {
            ok: true,
            currency: "MAD",
            meta: {
                section,
                sectionLabel: SECTION_LABELS[section],
                category: categoryCode,
                categoryLabel: cat.label,
                followMode: effectiveFollowMode,
                photoOptionAvailable: cat.photoOptionAvailable,
                requiresQuotePersonnalise: false,
            },
            base: {
                surfacePlancherM2,
                nbBatiments,
                coutConstructionM2: cat.costPerM2,
                coutTravauxEstime,
            },
            honoraires: {
                rate: HONORAIRES_RATE,
                totalHT,
                tvaRate: TVA_RATE,
                tva,
                totalTTC,
                breakdown: {
                    phaseA_esquisseAutorisation: phaseA,
                    phaseB_dceCps: phaseB,
                    phaseC_suivi: phaseC,
                },
            },
            visaCroa: { payableSeparately: true, note: this.visaCroaNote() },
            decennale,
            notes,
        };
    }
    /** Liste les catégories pour une section donnée (pour formulaire frontend) */
    listCategories(section) {
        return Object.entries(exports.BAREME_CNOA_2021)
            .filter(([_, cat]) => cat.validSections.includes(section))
            .map(([code, cat]) => ({
            code: code,
            label: cat.label,
            costPerM2: cat.costPerM2,
            photoOptionAvailable: cat.photoOptionAvailable,
            notes: cat.notes,
        }));
    }
    visaCroaNote() {
        return "Le visa du contrat par le Conseil Régional de l'Ordre des Architectes (CROA) est obligatoire avant dépôt du dossier d'autorisation (Chap V Règlement Intérieur CNOA 2024, délai max 15 jours calendaires). Facturé séparément, payable directement via plateforme CITURBAREA — reversé au CROA territorialement compétent.";
    }
    buildDecennale(section) {
        if (section === "AMG") {
            return {
                applicable: true,
                options: ["CONSTRUCTEUR_INITIAL"],
                note: "Garantie décennale conservée par le constructeur initial du bâtiment. L'aménageur (porteur P2-AMG) s'engage formellement à n'effectuer aucune intervention sur les éléments de structure (murs porteurs, dalles, fondations, charpente).",
            };
        }
        return {
            applicable: true,
            options: ["PROMOTEUR_GARDE", "CITURBAREA_PORTE"],
            note: "Deux scénarios proposés : (A) Le promoteur conserve sa décennale (moins cher, mais traçabilité entreprises maintenue par CITURBAREA — polices, PV, photos avant fermeture). (B) CITURBAREA porte la décennale (plus cher, prise en charge totale du risque par CITURBAREA).",
        };
    }
};
exports.P2PricingService = P2PricingService;
exports.P2PricingService = P2PricingService = __decorate([
    (0, common_1.Injectable)()
], P2PricingService);
