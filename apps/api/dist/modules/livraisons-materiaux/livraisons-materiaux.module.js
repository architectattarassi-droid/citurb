"use strict";
/**
 * apps/api/src/modules/livraisons-materiaux/livraisons-materiaux.module.ts
 *
 * Module Livraisons Matériaux (Tome 5).
 * Importé par AppModule. Dépend de PrismaModule (global) + KernelModule
 * (ProbativeLogService).
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LivraisonsMateriauxModule = void 0;
const common_1 = require("@nestjs/common");
const kernel_module_1 = require("../kernel/kernel.module");
const livraisons_materiaux_controller_1 = require("./livraisons-materiaux.controller");
const livraisons_materiaux_service_1 = require("./livraisons-materiaux.service");
let LivraisonsMateriauxModule = class LivraisonsMateriauxModule {
};
exports.LivraisonsMateriauxModule = LivraisonsMateriauxModule;
exports.LivraisonsMateriauxModule = LivraisonsMateriauxModule = __decorate([
    (0, common_1.Module)({
        imports: [kernel_module_1.KernelModule],
        controllers: [livraisons_materiaux_controller_1.LivraisonsMateriauxController],
        providers: [livraisons_materiaux_service_1.LivraisonsMateriauxService],
        exports: [livraisons_materiaux_service_1.LivraisonsMateriauxService],
    })
], LivraisonsMateriauxModule);
