"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DossierInteractionsModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const tome_2_module_1 = require("../../tome-2/tome-2.module");
const dossier_interactions_controller_1 = require("./dossier-interactions.controller");
const dossier_interactions_service_1 = require("./dossier-interactions.service");
const dossier_notif_service_1 = require("./dossier-notif.service");
/**
 * DossierInteractionsModule — fil d'interactions Dossier (Tome 6).
 *
 * Dépendances :
 *  - PrismaService (kernel) — persistence dans Dossier.payload (transition)
 *  - Tome2Module → AntiDesintService (scan contentMD)
 *  - EmailService + TwilioService (Global modules → import implicite)
 */
let DossierInteractionsModule = class DossierInteractionsModule {
};
exports.DossierInteractionsModule = DossierInteractionsModule;
exports.DossierInteractionsModule = DossierInteractionsModule = __decorate([
    (0, common_1.Module)({
        imports: [(0, common_1.forwardRef)(() => tome_2_module_1.Tome2Module)],
        controllers: [dossier_interactions_controller_1.DossierInteractionsController],
        providers: [
            prisma_service_1.PrismaService,
            dossier_interactions_service_1.DossierInteractionsService,
            dossier_notif_service_1.DossierNotifService,
        ],
        exports: [dossier_interactions_service_1.DossierInteractionsService, dossier_notif_service_1.DossierNotifService],
    })
], DossierInteractionsModule);
