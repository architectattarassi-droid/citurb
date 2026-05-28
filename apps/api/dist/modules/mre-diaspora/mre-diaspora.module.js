"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MreDiasporaModule = void 0;
const common_1 = require("@nestjs/common");
const kernel_module_1 = require("../kernel/kernel.module");
const auth_module_1 = require("../../tomes/tome-5/auth/auth.module");
const mre_diaspora_controller_1 = require("./mre-diaspora.controller");
const mre_diaspora_service_1 = require("./mre-diaspora.service");
/**
 * MreDiasporaModule — parcours MRE (Pivot Visa du foncier maghrébin).
 * Adresse 4M Marocains à l'étranger : procuration eIDAS + escrow + mandataires.
 */
let MreDiasporaModule = class MreDiasporaModule {
};
exports.MreDiasporaModule = MreDiasporaModule;
exports.MreDiasporaModule = MreDiasporaModule = __decorate([
    (0, common_1.Module)({
        imports: [kernel_module_1.KernelModule, auth_module_1.Tome5AuthModule],
        controllers: [mre_diaspora_controller_1.MreDiasporaController],
        providers: [mre_diaspora_service_1.MreDiasporaService],
        exports: [mre_diaspora_service_1.MreDiasporaService],
    })
], MreDiasporaModule);
