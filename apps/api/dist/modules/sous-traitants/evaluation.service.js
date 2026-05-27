"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EvaluationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvaluationService = void 0;
const common_1 = require("@nestjs/common");
/**
 * EvaluationService — système notation post-mission sous-traitant.
 *
 * Calcule un score moyen 0-5 sur 4 dimensions (qualité, délai, communication,
 * relation). Ce score agrège ensuite dans le Score L7 P6 du sous-traitant
 * (cf. /p6/scoring) via une moyenne pondérée des évaluations cumulées.
 *
 * Convention : pondération uniforme 25 % par dimension au MVP.
 *   Ajustable plus tard via une matrice de pondération par type d'opération.
 */
let EvaluationService = EvaluationService_1 = class EvaluationService {
    logger = new common_1.Logger(EvaluationService_1.name);
    /** Pondérations (somme = 1). MVP : uniforme. */
    weights = {
        qualite: 0.25,
        delai: 0.25,
        communication: 0.25,
        relation: 0.25,
    };
    /**
     * Valide les notes (chacune 0..5) et calcule le score moyen pondéré.
     */
    buildEvaluation(input, evaluatedBy) {
        this.assertNote(input.qualite, "qualite");
        this.assertNote(input.delai, "delai");
        this.assertNote(input.communication, "communication");
        this.assertNote(input.relation, "relation");
        const scoreMoyen = input.qualite * this.weights.qualite +
            input.delai * this.weights.delai +
            input.communication * this.weights.communication +
            input.relation * this.weights.relation;
        return {
            qualite: input.qualite,
            delai: input.delai,
            communication: input.communication,
            relation: input.relation,
            scoreMoyen: Math.round(scoreMoyen * 100) / 100,
            commentaire: input.commentaire?.slice(0, 2000),
            evaluatedAt: new Date().toISOString(),
            evaluatedBy,
        };
    }
    /**
     * Convertit un score moyen (0..5) en bonus score L7 P6 (0..20 points).
     * Une évaluation 5/5 ajoute 20 points; 0/5 retire 10 points.
     *
     *  score 5  → +20
     *  score 4  → +12
     *  score 3  → +4
     *  score 2  → -4
     *  score 1  → -10
     *  score 0  → -10 (plancher)
     */
    toL7Bonus(scoreMoyen) {
        const s = Math.max(0, Math.min(5, scoreMoyen));
        const raw = -10 + s * 6;
        return Math.max(-10, Math.min(20, Math.round(raw)));
    }
    /**
     * Moyenne pondérée sur N évaluations (utilisé pour mise à jour Score L7).
     */
    averageScore(evaluations) {
        if (!evaluations.length)
            return 0;
        const sum = evaluations.reduce((a, e) => a + (e.scoreMoyen ?? 0), 0);
        return Math.round((sum / evaluations.length) * 100) / 100;
    }
    assertNote(value, field) {
        if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new common_1.BadRequestException(`Note ${field} invalide`);
        }
        if (value < 0 || value > 5) {
            throw new common_1.BadRequestException(`Note ${field} hors plage (0..5)`);
        }
    }
};
exports.EvaluationService = EvaluationService;
exports.EvaluationService = EvaluationService = EvaluationService_1 = __decorate([
    (0, common_1.Injectable)()
], EvaluationService);
