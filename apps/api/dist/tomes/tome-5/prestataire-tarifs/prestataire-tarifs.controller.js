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
exports.PrestataireTarifsController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const prestataire_tarifs_service_1 = require("./prestataire-tarifs.service");
/**
 * TOME 5 — Controller Prestataire Tarifs
 *
 * Routes publiques (corpus, search, comparator) + routes "prestataire"
 * (création/édition/soumission/signature) — auth JWT déléguée au reverse-proxy
 * et au guard global pour le MVP (cf. INTEGRATION.md).
 *
 * Mount: `/api/prestataire-tarifs`
 */
let PrestataireTarifsController = class PrestataireTarifsController {
    service;
    constructor(service) {
        this.service = service;
    }
    /** GET /api/prestataire-tarifs/corpus — corpus 40+ prestations standardisées. */
    getCorpus() {
        return {
            ok: true,
            count: this.service.getCorpus().length,
            prestations: this.service.getCorpus(),
        };
    }
    /**
     * GET /api/prestataire-tarifs/search?prestation=&zone=&maxPrice=
     * Recherche client multi-critères, status=PUBLIE uniquement.
     */
    search(prestation, zone, maxPrice) {
        const filters = {
            prestation,
            zone,
            maxPrice: maxPrice ? Number(maxPrice) : undefined,
        };
        const results = this.service.search(filters);
        return { ok: true, count: results.length, results };
    }
    /** GET /api/prestataire-tarifs/prestataire/:id — tarifs publiés d'un prestataire. */
    listByPrestataire(prestataireId) {
        const tarifs = this.service.listByPrestataire(prestataireId);
        return { ok: true, prestataireId, count: tarifs.length, tarifs };
    }
    /** GET /api/prestataire-tarifs/:id — détail d'un tarif. */
    getOne(id) {
        return { ok: true, tarif: this.service.getById(id) };
    }
    /**
     * GET /api/prestataire-tarifs/:id/comparator?clientPrice=...
     * Compare un prix client à la grille publique pour la même prestation.
     */
    comparator(id, clientPrice) {
        const price = Number(clientPrice);
        if (!Number.isFinite(price) || price <= 0) {
            return { ok: false, error: "clientPrice doit être un nombre > 0." };
        }
        return { ok: true, comparison: this.service.comparePrice(id, price) };
    }
    /**
     * POST /api/prestataire-tarifs — création d'un tarif (status BROUILLON).
     * MVP: prestataireId fourni dans le body. En prod, source du JWT via guard.
     */
    create(body) {
        const tarif = this.service.create(body);
        return { ok: true, tarif };
    }
    /** PATCH /api/prestataire-tarifs/:id — édition partielle. */
    update(id, body) {
        return { ok: true, tarif: this.service.update(id, body) };
    }
    /** POST /api/prestataire-tarifs/:id/submit — soumission validation CITURBAREA. */
    submit(id) {
        return { ok: true, tarif: this.service.submit(id) };
    }
    /** POST /api/prestataire-tarifs/:id/contract — signature contrat → PUBLIE. */
    contract(id) {
        return { ok: true, tarif: this.service.signContract(id) };
    }
    /** POST /api/prestataire-tarifs/:id/suspend — suspension d'un tarif PUBLIE. */
    suspend(id) {
        return { ok: true, tarif: this.service.suspend(id) };
    }
};
exports.PrestataireTarifsController = PrestataireTarifsController;
__decorate([
    (0, common_1.Get)("corpus"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PrestataireTarifsController.prototype, "getCorpus", null);
__decorate([
    (0, common_1.Get)("search"),
    __param(0, (0, common_1.Query)("prestation")),
    __param(1, (0, common_1.Query)("zone")),
    __param(2, (0, common_1.Query)("maxPrice")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], PrestataireTarifsController.prototype, "search", null);
__decorate([
    (0, common_1.Get)("prestataire/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PrestataireTarifsController.prototype, "listByPrestataire", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PrestataireTarifsController.prototype, "getOne", null);
__decorate([
    (0, common_1.Get)(":id/comparator"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)("clientPrice")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PrestataireTarifsController.prototype, "comparator", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PrestataireTarifsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PrestataireTarifsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(":id/submit"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PrestataireTarifsController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)(":id/contract"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PrestataireTarifsController.prototype, "contract", null);
__decorate([
    (0, common_1.Post)(":id/suspend"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PrestataireTarifsController.prototype, "suspend", null);
exports.PrestataireTarifsController = PrestataireTarifsController = __decorate([
    (0, tome_at_1.Tome)("tome5"),
    (0, common_1.Controller)("api/prestataire-tarifs"),
    __metadata("design:paramtypes", [prestataire_tarifs_service_1.PrestataireTarifsService])
], PrestataireTarifsController);
