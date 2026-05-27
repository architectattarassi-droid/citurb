"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DossierOverviewModule = void 0;
const common_1 = require("@nestjs/common");
const dossier_overview_controller_1 = require("./dossier-overview.controller");
const dossier_overview_service_1 = require("./dossier-overview.service");
/**
 * DossierOverviewModule — agrégateur "Mon Parcours" pour le client.
 *
 * Tome 0 — gouvernance données / lecture transverse.
 * PrismaService est exposé globalement via PrismaModule (@Global),
 * aucun import explicite nécessaire.
 *
 * À ajouter dans app.module.ts dans la section "Non-tome modules"
 * (cf. INTEGRATION.md).
 */
let DossierOverviewModule = class DossierOverviewModule {
};
exports.DossierOverviewModule = DossierOverviewModule;
exports.DossierOverviewModule = DossierOverviewModule = __decorate([
    (0, common_1.Module)({
        controllers: [dossier_overview_controller_1.DossierOverviewController],
        providers: [dossier_overview_service_1.DossierOverviewService],
        exports: [dossier_overview_service_1.DossierOverviewService],
    })
], DossierOverviewModule);
