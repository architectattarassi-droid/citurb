"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SousTraitantsModule = void 0;
const common_1 = require("@nestjs/common");
const kernel_module_1 = require("../kernel/kernel.module");
const sous_traitants_controller_1 = require("./sous-traitants.controller");
const sous_traitants_service_1 = require("./sous-traitants.service");
const evaluation_service_1 = require("./evaluation.service");
/**
 * Sous-Traitants — Module (Tome 3 / P3 — MOD délégué).
 *
 * Voir INTEGRATION.md (routes, MutationGate, i18n keys, import dans tome-3).
 */
let SousTraitantsModule = class SousTraitantsModule {
};
exports.SousTraitantsModule = SousTraitantsModule;
exports.SousTraitantsModule = SousTraitantsModule = __decorate([
    (0, common_1.Module)({
        imports: [kernel_module_1.KernelModule], // PrismaService + ProbativeLogService
        controllers: [sous_traitants_controller_1.SousTraitantsController],
        providers: [sous_traitants_service_1.SousTraitantsService, evaluation_service_1.EvaluationService],
        exports: [sous_traitants_service_1.SousTraitantsService, evaluation_service_1.EvaluationService],
    })
], SousTraitantsModule);
