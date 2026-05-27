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
exports.ReceptionConformiteController = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs/promises");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const reception_conformite_service_1 = require("./reception-conformite.service");
/**
 * Tome 3 — Réception + Certificat de Conformité + Permis d'Habiter.
 *
 * Endpoints :
 *   GET    /api/reception/dossier/:dossierId
 *   GET    /api/reception/dossier/:dossierId/garanties
 *
 *   POST   /api/reception/dossier/:dossierId/provisoire          (JWT)
 *   POST   /api/reception/dossier/:dossierId/provisoire/sign     (JWT)
 *   POST   /api/reception/dossier/:dossierId/provisoire/finalize (JWT)
 *
 *   POST   /api/reception/dossier/:dossierId/leveereserves       (JWT)
 *
 *   POST   /api/reception/dossier/:dossierId/definitive          (JWT)
 *   POST   /api/reception/dossier/:dossierId/definitive/sign     (JWT)
 *   POST   /api/reception/dossier/:dossierId/definitive/finalize (JWT)
 *
 *   POST   /api/reception/dossier/:dossierId/demande-permis-habiter (JWT)
 *   POST   /api/reception/dossier/:dossierId/visite-conformite      (JWT)
 *   POST   /api/reception/dossier/:dossierId/certificat-conformite  (JWT)
 *
 *   POST   /api/reception/dossier/:dossierId/sinistre               (JWT)
 *
 *   POST   /api/reception/dossier/:dossierId/photos                 (JWT)
 *
 *   GET    /api/reception/dossier/:dossierId/pdf/provisoire
 *   GET    /api/reception/dossier/:dossierId/pdf/definitive
 *   GET    /api/reception/dossier/:dossierId/pdf/levee/:reserveId
 *   GET    /api/reception/dossier/:dossierId/pdf/certificat
 */
let ReceptionConformiteController = class ReceptionConformiteController {
    service;
    constructor(service) {
        this.service = service;
    }
    // ───────── Lecture
    async getState(dossierId) {
        return this.service.getState(dossierId);
    }
    async getGaranties(dossierId) {
        return this.service.getGaranties(dossierId);
    }
    // ───────── Réception provisoire
    async upsertProvisoire(dossierId, body) {
        return this.service.createOrUpdateProvisoire(dossierId, body ?? {});
    }
    async signProvisoire(dossierId, body) {
        return this.service.addSignature(dossierId, { ...body, cible: "PROVISOIRE" });
    }
    async finalizeProvisoire(dossierId) {
        return this.service.finalizeProvisoire(dossierId);
    }
    // ───────── Levée de réserves
    async leveeReserve(dossierId, body) {
        return this.service.leveeReserve(dossierId, body);
    }
    // ───────── Réception définitive
    async upsertDefinitive(dossierId, body) {
        return this.service.createOrUpdateDefinitive(dossierId, body ?? {});
    }
    async signDefinitive(dossierId, body) {
        return this.service.addSignature(dossierId, { ...body, cible: "DEFINITIVE" });
    }
    async finalizeDefinitive(dossierId) {
        return this.service.finalizeDefinitive(dossierId);
    }
    // ───────── Permis d'habiter
    async demandePh(dossierId, body) {
        return this.service.demandePermisHabiter(dossierId, body);
    }
    async visiteConformite(dossierId, body) {
        return this.service.visiteConformite(dossierId, body);
    }
    async certificatConformite(dossierId, body) {
        return this.service.certificatConformite(dossierId, body);
    }
    // ───────── Sinistres
    async declareSinistre(dossierId, body, req) {
        const declarantId = req.user?.userId ?? req.user?.sub ?? null;
        return this.service.declareSinistre(dossierId, body, declarantId);
    }
    // ───────── Photos
    async uploadPhoto(dossierId, body) {
        return this.service.savePhoto({
            dossierId,
            bucket: body?.bucket || "general",
            contentBase64: body?.contentBase64 ?? "",
            mimeType: body?.mimeType ?? "image/jpeg",
            filenameHint: body?.filenameHint,
        });
    }
    // ───────── HTML imprimables (sert de "PDF source")
    async pdfProvisoire(dossierId, res) {
        const state = await this.service.getState(dossierId);
        if (state.provisoire?.pvUrl) {
            try {
                const abs = await this.service.resolveSnapshot(dossierId, "provisoire/provisoire.html");
                const html = await fs.readFile(abs, "utf8");
                res.send(html);
                return;
            }
            catch {
                /* fallthrough */
            }
        }
        if (!state.provisoire) {
            res.status(404).send("<p>Aucune réception provisoire</p>");
            return;
        }
        const html = await this.service["pvRenderer"].renderProvisoire(state.provisoire);
        res.send(html);
    }
    async pdfDefinitive(dossierId, res) {
        const state = await this.service.getState(dossierId);
        if (state.definitive?.pvUrl) {
            try {
                const abs = await this.service.resolveSnapshot(dossierId, "definitive/definitive.html");
                const html = await fs.readFile(abs, "utf8");
                res.send(html);
                return;
            }
            catch {
                /* fallthrough */
            }
        }
        if (!state.definitive) {
            res.status(404).send("<p>Aucune réception définitive</p>");
            return;
        }
        const html = await this.service["pvRenderer"].renderDefinitive(state.definitive, state.provisoire ?? null);
        res.send(html);
    }
    async pdfLevee(dossierId, reserveId, res) {
        const html = await this.service.renderLeveeHtml(dossierId, reserveId);
        res.send(html);
    }
    async pdfCertificat(dossierId, res) {
        const html = await this.service.renderCertificatHtml(dossierId);
        res.send(html);
    }
};
exports.ReceptionConformiteController = ReceptionConformiteController;
__decorate([
    (0, common_1.Get)("dossier/:dossierId"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "getState", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId/garanties"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "getGaranties", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/provisoire"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "upsertProvisoire", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/provisoire/sign"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "signProvisoire", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/provisoire/finalize"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "finalizeProvisoire", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/leveereserves"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "leveeReserve", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/definitive"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "upsertDefinitive", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/definitive/sign"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "signDefinitive", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/definitive/finalize"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "finalizeDefinitive", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/demande-permis-habiter"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "demandePh", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/visite-conformite"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "visiteConformite", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/certificat-conformite"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "certificatConformite", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/sinistre"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "declareSinistre", null);
__decorate([
    (0, common_1.Post)("dossier/:dossierId/photos"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "uploadPhoto", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId/pdf/provisoire"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "pdfProvisoire", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId/pdf/definitive"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "pdfDefinitive", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId/pdf/levee/:reserveId"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Param)("reserveId")),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "pdfLevee", null);
__decorate([
    (0, common_1.Get)("dossier/:dossierId/pdf/certificat"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReceptionConformiteController.prototype, "pdfCertificat", null);
exports.ReceptionConformiteController = ReceptionConformiteController = __decorate([
    (0, tome_at_1.Tome)("tome3"),
    (0, common_1.Controller)("api/reception"),
    __metadata("design:paramtypes", [reception_conformite_service_1.ReceptionConformiteService])
], ReceptionConformiteController);
