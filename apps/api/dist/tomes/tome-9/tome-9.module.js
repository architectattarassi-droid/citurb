"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tome9Module = void 0;
const common_1 = require("@nestjs/common");
const ops_module_1 = require("./ops/ops.module");
/**
 * TOME@9 — Facade module (canonical import for AppModule)
 */
let Tome9Module = class Tome9Module {
};
exports.Tome9Module = Tome9Module;
exports.Tome9Module = Tome9Module = __decorate([
    (0, common_1.Module)({
        imports: [ops_module_1.Tome9OpsModule],
        exports: [ops_module_1.Tome9OpsModule],
    })
], Tome9Module);
