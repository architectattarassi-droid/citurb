"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialsCatalogModule = void 0;
const common_1 = require("@nestjs/common");
const materials_catalog_controller_1 = require("./materials-catalog.controller");
const materials_catalog_service_1 = require("./materials-catalog.service");
/**
 * TOME 5 — Materials Catalog Module
 *
 * Imported by Tome5Module facade. No external dependencies (reads static JSON).
 */
let MaterialsCatalogModule = class MaterialsCatalogModule {
};
exports.MaterialsCatalogModule = MaterialsCatalogModule;
exports.MaterialsCatalogModule = MaterialsCatalogModule = __decorate([
    (0, common_1.Module)({
        controllers: [materials_catalog_controller_1.MaterialsCatalogController],
        providers: [materials_catalog_service_1.MaterialsCatalogService],
        exports: [materials_catalog_service_1.MaterialsCatalogService],
    })
], MaterialsCatalogModule);
