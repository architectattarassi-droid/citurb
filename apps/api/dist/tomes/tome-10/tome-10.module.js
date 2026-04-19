"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tome10FinancingModule = void 0;
const common_1 = require("@nestjs/common");
const tome_10_controller_1 = require("./tome-10.controller");
const tome_10_service_1 = require("./tome-10.service");
/**
 * TOME 10 — FINANCING & BANK BROKER (P1-first)
 * But: générer un dossier bancaire "prêt à déposer" APRÈS un plan (type ou personnalisé)
 *      + orchestrer partenaires banques (sans exposer données brutes côté public).
 *
 * Rappels doctrinaux:
 * - Payment/Entitlements (T1) restent la source de vérité.
 * - State machine (T3) dicte quand le financement est accessible.
 * - DataLake/DataProduct (T0) : les pièces brutes restent internes.
 */
let Tome10FinancingModule = class Tome10FinancingModule {
};
exports.Tome10FinancingModule = Tome10FinancingModule;
exports.Tome10FinancingModule = Tome10FinancingModule = __decorate([
    (0, common_1.Module)({
        controllers: [tome_10_controller_1.Tome10FinancingController],
        providers: [tome_10_service_1.Tome10FinancingService],
        exports: [tome_10_service_1.Tome10FinancingService],
    })
], Tome10FinancingModule);
