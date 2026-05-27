"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RokhasTrackerModule = void 0;
/**
 * Rokhas Tracker — Module
 *
 * Dépendances :
 *  - PrismaModule       (lecture/écriture Dossier.payload.rokhasTracker)
 *  - KernelModule       (ProbativeLogService + IncidentsService, optionnels via @Optional)
 *  - Tome5AuthModule    (JwtAuthGuard pour les endpoints authentifiés)
 *
 * À importer dans `app.module.ts` (cf. INTEGRATION.md) — pas dans
 * `tome-2.module.ts` car ce module vit sous `apps/api/src/modules/`
 * pour rester indépendant du cycle de release des tomes.
 */
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../tomes/tome-at/kernel/prisma/prisma.module");
const kernel_module_1 = require("../kernel/kernel.module");
const auth_module_1 = require("../../tomes/tome-5/auth/auth.module");
const rokhas_tracker_controller_1 = require("./rokhas-tracker.controller");
const rokhas_tracker_service_1 = require("./rokhas-tracker.service");
let RokhasTrackerModule = class RokhasTrackerModule {
};
exports.RokhasTrackerModule = RokhasTrackerModule;
exports.RokhasTrackerModule = RokhasTrackerModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, kernel_module_1.KernelModule, auth_module_1.Tome5AuthModule],
        controllers: [rokhas_tracker_controller_1.RokhasTrackerController],
        providers: [rokhas_tracker_service_1.RokhasTrackerService],
        exports: [rokhas_tracker_service_1.RokhasTrackerService],
    })
], RokhasTrackerModule);
