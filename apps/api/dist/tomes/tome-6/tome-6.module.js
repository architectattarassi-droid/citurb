"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tome6Module = void 0;
const common_1 = require("@nestjs/common");
const p5_module_1 = require("./p5/p5.module");
const tome_6_service_1 = require("./tome-6.service");
let Tome6Module = class Tome6Module {
};
exports.Tome6Module = Tome6Module;
exports.Tome6Module = Tome6Module = __decorate([
    (0, common_1.Module)({
        imports: [p5_module_1.P5Module],
        providers: [tome_6_service_1.Tome6Service],
        exports: [tome_6_service_1.Tome6Service, p5_module_1.P5Module],
    })
], Tome6Module);
