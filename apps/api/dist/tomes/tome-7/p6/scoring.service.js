"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.P6ScoringService = void 0;
const common_1 = require("@nestjs/common");
const registry_1 = require("./registry");
/**
 * P6 Scoring Service — Calcul du score interne CITURBAREA L7
 *
 * Doctrine: ce score override les classifications externes.
 * Il sert à :
 *  - Filtrer/ranker les prestataires lors d'une consultation
 *  - Restreindre l'accès aux dossiers selon la classe minimale requise
 *  - Détecter les profils non-conformes (alertes admin)
 *
 * Échelle: 0-100 (calculs proportionnels, additifs avec plafonds)
 *
 * Composantes:
 *  - Classe BTP officielle             (max 30 points: classe 1=30 / classe 7=4)
 *  - Catégorie d'agrément valide       (max 15 points)
 *  - Documents administratifs complets (max 25 points)
 *  - Décennale + RC pro valides        (max 15 points)
 *  - Références chantiers + photos     (max 10 points)
 *  - Bonus ancienneté (>5 ans)         (max 5 points)
 */
const CLASSE_POINTS = {
    "1": 30, "2": 26, "3": 22, "4": 18, "5": 14, "6": 10, "7": 6,
};
let P6ScoringService = class P6ScoringService {
    computeScore(input) {
        const breakdown = {
            classe: this.scoreClasse(input),
            agrement: this.scoreAgrement(input),
            documents: this.scoreDocuments(input),
            assurances: this.scoreAssurances(input),
            references: this.scoreReferences(input),
            anciennete: this.scoreAnciennete(input),
        };
        const score = Math.round(breakdown.classe + breakdown.agrement + breakdown.documents +
            breakdown.assurances + breakdown.references + breakdown.anciennete);
        const tier = score >= 80 ? "GOLD" :
            score >= 60 ? "SILVER" :
                score >= 40 ? "BRONZE" :
                    "INSUFFICIENT";
        const missingDocuments = this.checkMissingDocuments(input);
        const warnings = [];
        const recommendations = [];
        if (input.type === "PRESTATAIRE_SERVICE") {
            if (!input.classeBTP)
                warnings.push("Aucune classe BTP renseignée — l'éligibilité aux marchés publics est limitée.");
            if (!input.decennaleValide)
                warnings.push("Police décennale non valide ou non renseignée — bloquant pour la majorité des dossiers.");
            if (!input.rcProValide)
                warnings.push("RC professionnelle manquante.");
            if (!input.ancienneteAnnees || input.ancienneteAnnees < 2)
                warnings.push("Ancienneté inférieure à 2 ans — accès restreint aux gros chantiers.");
            if ((input.nbReferences ?? 0) < 3)
                recommendations.push("Ajouter au moins 3 références chantiers pour améliorer le score.");
            if ((input.nbPhotosChantiers ?? 0) < 5)
                recommendations.push("Joindre 5+ photos de chantiers terminés (bonus de visibilité).");
        }
        else {
            if ((input.nbMateriauxCatalogue ?? 0) === 0)
                warnings.push("Aucun matériau dans le catalogue — la fiche n'est pas visible côté client.");
            if (!input.zonesFourniture?.length)
                warnings.push("Aucune zone de fourniture déclarée.");
        }
        if (missingDocuments.length > 0)
            recommendations.push(`Documents à fournir : ${missingDocuments.join(", ")}`);
        let status = "DRAFT";
        if (missingDocuments.length === 0 && tier !== "INSUFFICIENT") {
            status = "PENDING_REVIEW"; // prêt pour review admin
        }
        else if (missingDocuments.length > 0) {
            status = "NEEDS_DOCS";
        }
        return { score, tier, status, breakdown, missingDocuments, warnings, recommendations };
    }
    scoreClasse(input) {
        if (input.type !== "PRESTATAIRE_SERVICE")
            return 0;
        if (!input.classeBTP)
            return 0;
        return CLASSE_POINTS[input.classeBTP] ?? 0;
    }
    scoreAgrement(input) {
        if (input.type !== "PRESTATAIRE_SERVICE")
            return 0;
        let pts = 0;
        if (input.categoriesAgrement?.length)
            pts += 8;
        if (input.agrementMetleNumero && input.agrementMetleValidite) {
            const valid = new Date(input.agrementMetleValidite).getTime() > Date.now();
            if (valid)
                pts += 5;
        }
        if (input.ordreInscription)
            pts += 2;
        return Math.min(15, pts);
    }
    scoreDocuments(input) {
        const required = input.type === "PRESTATAIRE_SERVICE"
            ? registry_1.DOCUMENTS_REQUIS_PRESTATAIRE.filter(d => d.obligatoire)
            : registry_1.DOCUMENTS_REQUIS_FOURNISSEUR.filter(d => d.obligatoire);
        if (required.length === 0)
            return 25;
        const provided = required.filter(d => input.documents?.[d.slug] === true).length;
        const ratio = provided / required.length;
        return Math.round(25 * ratio);
    }
    scoreAssurances(input) {
        if (input.type !== "PRESTATAIRE_SERVICE")
            return 15; // N/A pour fournisseurs (non bloquant)
        let pts = 0;
        if (input.decennaleValide)
            pts += 10;
        if (input.rcProValide)
            pts += 5;
        return pts;
    }
    scoreReferences(input) {
        if (input.type === "FOURNISSEUR_MATERIAUX") {
            // Pour fournisseurs: score basé sur catalogue
            const nbMat = input.nbMateriauxCatalogue ?? 0;
            if (nbMat >= 50)
                return 10;
            if (nbMat >= 20)
                return 7;
            if (nbMat >= 5)
                return 4;
            return 0;
        }
        let pts = 0;
        const refs = input.nbReferences ?? 0;
        if (refs >= 10)
            pts += 6;
        else if (refs >= 5)
            pts += 4;
        else if (refs >= 3)
            pts += 2;
        const photos = input.nbPhotosChantiers ?? 0;
        if (photos >= 10)
            pts += 4;
        else if (photos >= 5)
            pts += 2;
        return Math.min(10, pts);
    }
    scoreAnciennete(input) {
        const ans = input.ancienneteAnnees ?? 0;
        if (ans >= 15)
            return 5;
        if (ans >= 10)
            return 4;
        if (ans >= 5)
            return 3;
        if (ans >= 3)
            return 2;
        if (ans >= 1)
            return 1;
        return 0;
    }
    checkMissingDocuments(input) {
        const required = input.type === "PRESTATAIRE_SERVICE"
            ? registry_1.DOCUMENTS_REQUIS_PRESTATAIRE.filter(d => d.obligatoire)
            : registry_1.DOCUMENTS_REQUIS_FOURNISSEUR.filter(d => d.obligatoire);
        return required
            .filter(d => input.documents?.[d.slug] !== true)
            .map(d => d.label);
    }
};
exports.P6ScoringService = P6ScoringService;
exports.P6ScoringService = P6ScoringService = __decorate([
    (0, common_1.Injectable)()
], P6ScoringService);
