"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrestataireTarifsModule = void 0;
const common_1 = require("@nestjs/common");
const prestataire_tarifs_controller_1 = require("./prestataire-tarifs.controller");
const prestataire_tarifs_service_1 = require("./prestataire-tarifs.service");
/**
 * TOME 5 — Module Tarifs Contractuels Prestataires P6
 *
 * Voir INTEGRATION.md pour intégration AppModule + allow-list MutationGate.
 */
let PrestataireTarifsModule = class PrestataireTarifsModule {
};
exports.PrestataireTarifsModule = PrestataireTarifsModule;
exports.PrestataireTarifsModule = PrestataireTarifsModule = __decorate([
    (0, common_1.Module)({
        controllers: [prestataire_tarifs_controller_1.PrestataireTarifsController],
        providers: [prestataire_tarifs_service_1.PrestataireTarifsService],
        exports: [prestataire_tarifs_service_1.PrestataireTarifsService],
    })
], PrestataireTarifsModule);
