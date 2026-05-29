"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PvChantierModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../tome-at/kernel/prisma/prisma.module");
const kernel_module_1 = require("../../../modules/kernel/kernel.module");
const auth_module_1 = require("../../tome-5/auth/auth.module");
const pv_chantier_controller_1 = require("./pv-chantier.controller");
const pv_chantier_renderer_1 = require("./pv-chantier.renderer");
const pv_chantier_service_1 = require("./pv-chantier.service");
const pv_compliance_service_1 = require("./pv-compliance.service");
/**
 * Tome 2 — Module PV de Chantier.
 *
 * Expose le service pour usage croisé (génération contrat, dashboards, etc.).
 * PvComplianceService applique la cadence PV obligatoire (1 PV / 15 jours,
 * doctrine T2-R-PV-CADENCE-001) : cron + blocage chantier + alertes.
 */
let PvChantierModule = class PvChantierModule {
};
exports.PvChantierModule = PvChantierModule;
exports.PvChantierModule = PvChantierModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, kernel_module_1.KernelModule, auth_module_1.Tome5AuthModule],
        controllers: [pv_chantier_controller_1.PvChantierController],
        providers: [pv_chantier_service_1.PvChantierService, pv_chantier_renderer_1.PvChantierRenderer, pv_compliance_service_1.PvComplianceService],
        exports: [pv_chantier_service_1.PvChantierService, pv_chantier_renderer_1.PvChantierRenderer, pv_compliance_service_1.PvComplianceService],
    })
], PvChantierModule);
