"use strict";
/**
 * Tome 2 — Permis de Construire controller.
 *
 * Préfixe : /api/permis-construire
 *
 * Endpoints :
 *  POST   /dossier/:dossierId/init               crée brouillon (auth)
 *  GET    /dossier/:dossierId                    état brouillon + checklist
 *  PATCH  /dossier/:dossierId/step/:stepId       update step data (auth)
 *  POST   /dossier/:dossierId/upload-piece       upload pièce base64 (auth)
 *  POST   /dossier/:dossierId/generate-formulaires  génère HTML pré-rempli (auth)
 *  GET    /dossier/:dossierId/formulaire/:code   HTML imprimable d'un formulaire
 *  POST   /dossier/:dossierId/compile-master     compile master HTML (auth)
 *  GET    /dossier/:dossierId/master.pdf         HTML master imprimable (Print → PDF)
 *  GET    /dossier/:dossierId/attestation        HTML attestation
 *  POST   /dossier/:dossierId/submit             soumission finale (auth)
 *
 * Toutes les mutations passent l'allow-list MutationGateGuard via /api/permis-construire.
 */
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
exports.PermisConstruireController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const service_1 = require("./service");
let PermisConstruireController = class PermisConstruireController {
    service;
    constructor(service) {
        this.service = service;
    }
    // ─── Init brouillon
    async init(dossierId, body) {
        return this.service.init(dossierId, body ?? {});
    }
    // ─── Lecture brouillon
    async get(dossierId) {
        return this.service.get(dossierId);
    }
    // ─── Patch step
    async patchStep(dossierId, stepId, body) {
        return this.service.patchStep(dossierId, stepId, body ?? {});
    }
    // ─── Upload pièce
    async uploadPiece(dossierId, body) {
        return this.service.uploadPiece(dossierId, body);
    }
    // ─── Génération formulaires
    async generateFormulaires(dossierId) {
        return this.service.generateFormulaires(dossierId);
    }
    // ─── Formulaire HTML (public read)
    async getFormulaire(dossierId, code, res) {
        const html = await this.service.readFormulaireHtml(dossierId, code);
        res.send(html);
    }
    // ─── Compile master
    async compileMaster(dossierId) {
        return this.service.compileMaster(dossierId);
    }
    // ─── Download master (HTML imprimable)
    async getMaster(dossierId, res) {
        const html = await this.service.readMasterHtml(dossierId);
        res.send(html);
    }
    // ─── Attestation
    async getAttestation(dossierId, res) {
        const html = await this.service.readAttestationHtml(dossierId);
        res.send(html);
    }
    // ─── Soumission finale
    async submit(dossierId, body) {
        return this.service.submit(dossierId, body?.method ?? "self");
    }
};
exports.PermisConstruireController = PermisConstruireController;
__decorate([
    (0, common_1.Post)("dossier/:dossierId/init"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.HttpCode)(201),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PermisConstruireController.prototype, "init", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PermisConstruireController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)("dossier/:dossierId/step/:stepId"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Param)("stepId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PermisConstruireController.prototype, "patchStep", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/upload-piece"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PermisConstruireController.prototype, "uploadPiece", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/generate-formulaires"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PermisConstruireController.prototype, "generateFormulaires", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId/formulaire/:code"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Param)("code")),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PermisConstruireController.prototype, "getFormulaire", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/compile-master"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PermisConstruireController.prototype, "compileMaster", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId/master.pdf"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PermisConstruireController.prototype, "getMaster", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId/attestation"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PermisConstruireController.prototype, "getAttestation", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/submit"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PermisConstruireController.prototype, "submit", null);
exports.PermisConstruireController = PermisConstruireController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("api/permis-construire"),
    __metadata("design:paramtypes", [service_1.PermisConstruireService])
], PermisConstruireController);
