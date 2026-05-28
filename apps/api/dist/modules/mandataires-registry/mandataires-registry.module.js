"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MandatairesRegistryModule = void 0;
const common_1 = require("@nestjs/common");
const kernel_module_1 = require("../kernel/kernel.module");
const auth_module_1 = require("../../tomes/tome-5/auth/auth.module");
const mandataires_registry_controller_1 = require("./mandataires-registry.controller");
const mandataires_registry_service_1 = require("./mandataires-registry.service");
/**
 * MandatairesRegistryModule — annuaire mandataires agréés CITURBAREA (Tome 2).
 * 50 mandataires pilotes / 12 villes. Brique du parcours MRE.
 */
let MandatairesRegistryModule = class MandatairesRegistryModule {
};
exports.MandatairesRegistryModule = MandatairesRegistryModule;
exports.MandatairesRegistryModule = MandatairesRegistryModule = __decorate([
    (0, common_1.Module)({
        imports: [kernel_module_1.KernelModule, auth_module_1.Tome5AuthModule],
        controllers: [mandataires_registry_controller_1.MandatairesRegistryController],
        providers: [mandataires_registry_service_1.MandatairesRegistryService],
        exports: [mandataires_registry_service_1.MandatairesRegistryService],
    })
], MandatairesRegistryModule);
