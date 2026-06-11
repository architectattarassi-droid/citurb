"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.P1Module = void 0;
const common_1 = require("@nestjs/common");
const contract_controller_1 = require("./contract.controller");
const contract_service_1 = require("./contract.service");
const p2_module_1 = require("../p2/p2.module"); // pour réutiliser P2ContractService (template HTML)
const tome_at_1 = require("../../tome-at");
const auth_module_1 = require("../../tome-5/auth/auth.module");
/**
 * Tome 2 — P1 (particulier) module.
 *
 * Pour l'instant, ce module ne contient que la génération de contrat type
 * unifié d'Architecte (CNOA Construction 2024) pour les dossiers P1 :
 *   - GET /p1/admin/dossiers/:id/contrat (ADMIN/OWNER/OPS)
 *   - GET /p1/dossiers/:id/contrat (CLIENT propriétaire, avec consentement)
 *
 * Autres flux P1 (intake, quote, etc.) restent dans /apps/api/src/p1/ et
 * /apps/api/src/tomes/tome-4/public/ (architecture historique pré-tome-2).
 */
let P1Module = class P1Module {
};
exports.P1Module = P1Module;
exports.P1Module = P1Module = __decorate([
    (0, common_1.Module)({
        imports: [tome_at_1.PrismaModule, p2_module_1.P2Module, auth_module_1.Tome5AuthModule],
        controllers: [contract_controller_1.P1ContractController],
        providers: [contract_service_1.P1ContractService],
        exports: [contract_service_1.P1ContractService],
    })
], P1Module);
