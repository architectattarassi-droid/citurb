"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceptionConformiteModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../tomes/tome-at/kernel/prisma/prisma.module");
const kernel_module_1 = require("../kernel/kernel.module");
const auth_module_1 = require("../../tomes/tome-5/auth/auth.module");
const reception_conformite_controller_1 = require("./reception-conformite.controller");
const reception_conformite_service_1 = require("./reception-conformite.service");
const pv_reception_renderer_1 = require("./pv-reception-renderer");
const certificat_conformite_renderer_1 = require("./certificat-conformite-renderer");
/**
 * Tome 3 — Module Réception + Certificat de Conformité + Permis d'Habiter.
 *
 * Exposé pour usage croisé (timeline dossier, exports admin, alertes garanties).
 */
let ReceptionConformiteModule = class ReceptionConformiteModule {
};
exports.ReceptionConformiteModule = ReceptionConformiteModule;
exports.ReceptionConformiteModule = ReceptionConformiteModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, kernel_module_1.KernelModule, auth_module_1.Tome5AuthModule],
        controllers: [reception_conformite_controller_1.ReceptionConformiteController],
        providers: [
            reception_conformite_service_1.ReceptionConformiteService,
            pv_reception_renderer_1.PvReceptionRenderer,
            certificat_conformite_renderer_1.CertificatConformiteRenderer,
        ],
        exports: [
            reception_conformite_service_1.ReceptionConformiteService,
            pv_reception_renderer_1.PvReceptionRenderer,
            certificat_conformite_renderer_1.CertificatConformiteRenderer,
        ],
    })
], ReceptionConformiteModule);
