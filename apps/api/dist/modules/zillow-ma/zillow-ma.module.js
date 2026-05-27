"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZillowMaModule = void 0;
const common_1 = require("@nestjs/common");
const kernel_module_1 = require("../kernel/kernel.module");
const zillow_ma_controller_1 = require("./zillow-ma.controller");
const estimation_service_1 = require("./estimation.service");
/**
 * ZillowMaModule — module estimation foncière publique (Tome 0).
 * Pivot Visa du foncier maghrébin — Livrable Q3-2026 #2.
 */
let ZillowMaModule = class ZillowMaModule {
};
exports.ZillowMaModule = ZillowMaModule;
exports.ZillowMaModule = ZillowMaModule = __decorate([
    (0, common_1.Module)({
        imports: [kernel_module_1.KernelModule],
        controllers: [zillow_ma_controller_1.ZillowMaController],
        providers: [estimation_service_1.EstimationService],
        exports: [estimation_service_1.EstimationService],
    })
], ZillowMaModule);
