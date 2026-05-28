"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpciTokeniseModule = void 0;
const common_1 = require("@nestjs/common");
const kernel_module_1 = require("../kernel/kernel.module");
const auth_module_1 = require("../../tomes/tome-5/auth/auth.module");
const opci_tokenise_controller_1 = require("./opci-tokenise.controller");
const opci_tokenise_service_1 = require("./opci-tokenise.service");
/**
 * OpciTokeniseModule — OPCI tokenisé loi 70-14 + AMMC (Tome 4).
 * Permet aux MRE d'investir fractionné dans l'immobilier marocain.
 */
let OpciTokeniseModule = class OpciTokeniseModule {
};
exports.OpciTokeniseModule = OpciTokeniseModule;
exports.OpciTokeniseModule = OpciTokeniseModule = __decorate([
    (0, common_1.Module)({
        imports: [kernel_module_1.KernelModule, auth_module_1.Tome5AuthModule],
        controllers: [opci_tokenise_controller_1.OpciTokeniseController],
        providers: [opci_tokenise_service_1.OpciTokeniseService],
        exports: [opci_tokenise_service_1.OpciTokeniseService],
    })
], OpciTokeniseModule);
