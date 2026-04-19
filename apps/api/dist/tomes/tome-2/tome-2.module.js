"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tome2Module = void 0;
const common_1 = require("@nestjs/common");
const p2_module_1 = require("./p2/p2.module");
const tome_2_service_1 = require("./tome-2.service");
let Tome2Module = class Tome2Module {
};
exports.Tome2Module = Tome2Module;
exports.Tome2Module = Tome2Module = __decorate([
    (0, common_1.Module)({
        imports: [p2_module_1.P2Module],
        providers: [tome_2_service_1.Tome2Service],
        exports: [tome_2_service_1.Tome2Service, p2_module_1.P2Module],
    })
], Tome2Module);
