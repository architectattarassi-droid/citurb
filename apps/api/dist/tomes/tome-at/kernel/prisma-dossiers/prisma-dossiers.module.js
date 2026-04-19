"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaDossiersModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_dossiers_service_1 = require("./prisma-dossiers.service");
let PrismaDossiersModule = class PrismaDossiersModule {
};
exports.PrismaDossiersModule = PrismaDossiersModule;
exports.PrismaDossiersModule = PrismaDossiersModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [prisma_dossiers_service_1.PrismaDossiersService],
        exports: [prisma_dossiers_service_1.PrismaDossiersService],
    })
], PrismaDossiersModule);
