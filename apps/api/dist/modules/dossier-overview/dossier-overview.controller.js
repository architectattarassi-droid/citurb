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
exports.DossierOverviewController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const dossier_overview_service_1 = require("./dossier-overview.service");
/**
 * DossierOverviewController — endpoint "Mon Parcours".
 *
 * Route :
 *   GET /api/dossier-overview/:dossierId  (JWT, lecture seule)
 *
 * Doctrine :
 *  - Lecture seule → pas de MutationGate.
 *  - L'utilisateur doit être propriétaire OU rôle ADMIN/OPS/OWNER/SUPER_ADMIN.
 *  - L'agrégat est calculé à la volée ; il n'y a pas de side-effect.
 *
 * Métadonnée Tome 0 (gouvernance données / lecture transverse).
 */
let DossierOverviewController = class DossierOverviewController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async overview(dossierId, req) {
        const userId = req.user?.userId ?? req.user?.id ?? "";
        const role = req.user?.role ?? "CLIENT";
        const overview = await this.svc.getOverview(dossierId, userId, role);
        return { ok: true, overview };
    }
};
exports.DossierOverviewController = DossierOverviewController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)("dossierId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DossierOverviewController.prototype, "overview", null);
exports.DossierOverviewController = DossierOverviewController = __decorate([
    (0, tome_at_1.Tome)("tome0"),
    (0, common_1.Controller)("api/dossier-overview/:dossierId"),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __metadata("design:paramtypes", [dossier_overview_service_1.DossierOverviewService])
], DossierOverviewController);
