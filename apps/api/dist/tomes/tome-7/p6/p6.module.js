"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.P6Module = void 0;
const common_1 = require("@nestjs/common");
const p6_controller_1 = require("./p6.controller");
const registry_controller_1 = require("./registry.controller");
const scoring_service_1 = require("./scoring.service");
const supplier_catalog_service_1 = require("./supplier-catalog.service");
const supplier_catalog_controller_1 = require("./supplier-catalog.controller");
const tome_at_1 = require("../../tome-at");
const auth_module_1 = require("../../tome-5/auth/auth.module");
let P6Module = class P6Module {
};
exports.P6Module = P6Module;
exports.P6Module = P6Module = __decorate([
    (0, common_1.Module)({
        imports: [tome_at_1.PrismaModule, auth_module_1.Tome5AuthModule],
        controllers: [p6_controller_1.P6Controller, registry_controller_1.P6RegistryController, supplier_catalog_controller_1.SupplierCatalogController],
        providers: [scoring_service_1.P6ScoringService, supplier_catalog_service_1.SupplierCatalogService],
        exports: [supplier_catalog_service_1.SupplierCatalogService],
    })
], P6Module);
