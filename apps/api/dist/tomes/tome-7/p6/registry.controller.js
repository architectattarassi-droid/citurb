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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.P6RegistryController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const registry_1 = require("./registry");
const scoring_service_1 = require("./scoring.service");
/**
 * P6 endpoints publics — registry + scoring
 *  GET  /p6/types               → 2 types fiche (PRESTATAIRE_SERVICE / FOURNISSEUR_MATERIAUX)
 *  GET  /p6/classes-btp         → 7 classes BTP Maroc
 *  GET  /p6/categories-agrement → catégories METLE (A/B/C/D/E)
 *  GET  /p6/specialites         → spécialités hors BTP (architecte, géomètre…)
 *  GET  /p6/documents-requis    → liste docs par type fiche
 *  POST /p6/scoring             → calcule le score d'une fiche P6 (preview)
 */
let P6RegistryController = class P6RegistryController {
    scoring;
    constructor(scoring) {
        this.scoring = scoring;
    }
    types() {
        return { ok: true, items: registry_1.P6_TYPES };
    }
    classesBtp() {
        return { ok: true, items: registry_1.CLASSES_BTP };
    }
    categoriesAgrement() {
        return { ok: true, items: registry_1.CATEGORIES_AGREMENT };
    }
    specialites() {
        return { ok: true, items: registry_1.SPECIALITES_PRESTATAIRE };
    }
    documentsRequis() {
        return {
            ok: true,
            PRESTATAIRE_SERVICE: registry_1.DOCUMENTS_REQUIS_PRESTATAIRE,
            FOURNISSEUR_MATERIAUX: registry_1.DOCUMENTS_REQUIS_FOURNISSEUR,
        };
    }
    statusLabels() {
        return { ok: true, items: registry_1.P6_STATUS_LABELS };
    }
    scoringPreview(input) {
        try {
            return { ok: true, ...this.scoring.computeScore(input) };
        }
        catch (e) {
            return { ok: false, error: e.message || "Erreur scoring" };
        }
    }
};
exports.P6RegistryController = P6RegistryController;
__decorate([
    (0, common_1.Get)("types"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], P6RegistryController.prototype, "types", null);
__decorate([
    (0, common_1.Get)("classes-btp"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], P6RegistryController.prototype, "classesBtp", null);
__decorate([
    (0, common_1.Get)("categories-agrement"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], P6RegistryController.prototype, "categoriesAgrement", null);
__decorate([
    (0, common_1.Get)("specialites"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], P6RegistryController.prototype, "specialites", null);
__decorate([
    (0, common_1.Get)("documents-requis"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], P6RegistryController.prototype, "documentsRequis", null);
__decorate([
    (0, common_1.Get)("status-labels"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], P6RegistryController.prototype, "statusLabels", null);
__decorate([
    (0, common_1.Post)("scoring"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], P6RegistryController.prototype, "scoringPreview", null);
exports.P6RegistryController = P6RegistryController = __decorate([
    (0, tome_at_1.Tome)("tome7"),
    (0, common_1.Controller)("p6"),
    __metadata("design:paramtypes", [scoring_service_1.P6ScoringService])
], P6RegistryController);
