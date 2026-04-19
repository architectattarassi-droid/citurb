"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tome5Module = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("./auth/auth.module");
/**
 * TOME@5 — Facade module (canonical import for AppModule)
 * Doctrine: AppModule importe uniquement depuis ./tomes/tome-x/tome-x.module
 */
let Tome5Module = class Tome5Module {
};
exports.Tome5Module = Tome5Module;
exports.Tome5Module = Tome5Module = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.Tome5AuthModule],
        exports: [auth_module_1.Tome5AuthModule],
    })
], Tome5Module);
