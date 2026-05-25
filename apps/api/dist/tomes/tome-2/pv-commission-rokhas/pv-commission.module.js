"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PvCommissionModule = void 0;
/**
 * Tome 2 — PV Commission Rokhas — Module
 *
 * Dépendances :
 *  - PrismaModule (lecture/écriture Dossier.payload, à terme PvCommissionRokhas)
 *  - KernelModule (IncidentsService + ProbativeLogService via @Optional dans le workflow)
 *
 * À importer dans `tome-2.module.ts` (cf. INTEGRATION.md).
 */
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const kernel_module_1 = require("../../../modules/kernel/kernel.module");
const auth_module_1 = require("../../tome-5/auth/auth.module");
const pv_commission_controller_1 = require("./pv-commission.controller");
const pv_commission_service_1 = require("./pv-commission.service");
const pv_commission_parser_1 = require("./pv-commission.parser");
const pv_commission_workflow_1 = require("./pv-commission.workflow");
let PvCommissionModule = class PvCommissionModule {
};
exports.PvCommissionModule = PvCommissionModule;
exports.PvCommissionModule = PvCommissionModule = __decorate([
    (0, common_1.Module)({
        imports: [tome_at_1.PrismaModule, kernel_module_1.KernelModule, auth_module_1.Tome5AuthModule],
        controllers: [pv_commission_controller_1.PvCommissionController],
        providers: [pv_commission_service_1.PvCommissionService, pv_commission_parser_1.PvCommissionParser, pv_commission_workflow_1.PvCommissionWorkflow],
        exports: [pv_commission_service_1.PvCommissionService],
    })
], PvCommissionModule);
