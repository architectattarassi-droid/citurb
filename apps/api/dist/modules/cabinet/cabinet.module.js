"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CabinetModule = void 0;
/**
 * CabinetModule — fiche cabinet d'architecte (ancrée sur ProProfile).
 * Cf. memory `citurb-cabinet-portfolio-anchor` : on étend ProProfile, on ne crée
 * PAS de modèle Cabinet/Firm parallèle (collisions documentées).
 */
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../tomes/tome-at/kernel/prisma/prisma.module");
const auth_module_1 = require("../../tomes/tome-5/auth/auth.module");
const cabinet_controller_1 = require("./cabinet.controller");
const cabinet_service_1 = require("./cabinet.service");
let CabinetModule = class CabinetModule {
};
exports.CabinetModule = CabinetModule;
exports.CabinetModule = CabinetModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, auth_module_1.Tome5AuthModule],
        controllers: [cabinet_controller_1.CabinetController],
        providers: [cabinet_service_1.CabinetService],
        exports: [cabinet_service_1.CabinetService],
    })
], CabinetModule);
