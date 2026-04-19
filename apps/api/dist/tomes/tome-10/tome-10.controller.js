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
exports.Tome10FinancingController = void 0;
const common_1 = require("@nestjs/common");
const tome_10_service_1 = require("./tome-10.service");
const tome_at_1 = require("../tome-at");
/**
 * NOTE: endpoints sont volontairement simples (stubs) pour ne pas casser le monorepo.
 * L'implémentation réelle doit passer par Orchestrator + Guards (T@ + T3).
 */
let Tome10FinancingController = class Tome10FinancingController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async getEligibility(projectId) {
        return this.svc.getEligibility(projectId);
    }
    async createPrequal(projectId, body) {
        return this.svc.createOrUpdatePrequal(projectId, body);
    }
    async buildBankDossier(projectId, body) {
        return this.svc.buildBankDossier(projectId, body);
    }
};
exports.Tome10FinancingController = Tome10FinancingController;
__decorate([
    (0, common_1.Get)("projects/:projectId/eligibility"),
    __param(0, (0, common_1.Param)("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Tome10FinancingController.prototype, "getEligibility", null);
__decorate([
    (0, common_1.Post)("projects/:projectId/prequal"),
    __param(0, (0, common_1.Param)("projectId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], Tome10FinancingController.prototype, "createPrequal", null);
__decorate([
    (0, common_1.Post)("projects/:projectId/dossier"),
    __param(0, (0, common_1.Param)("projectId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], Tome10FinancingController.prototype, "buildBankDossier", null);
exports.Tome10FinancingController = Tome10FinancingController = __decorate([
    (0, tome_at_1.Tome)('tome10'),
    (0, common_1.Controller)("t10/financing"),
    __metadata("design:paramtypes", [tome_10_service_1.Tome10FinancingService])
], Tome10FinancingController);
