"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tome8Module = void 0;
const common_1 = require("@nestjs/common");
const tome_8_service_1 = require("./tome-8.service");
let Tome8Module = class Tome8Module {
};
exports.Tome8Module = Tome8Module;
exports.Tome8Module = Tome8Module = __decorate([
    (0, common_1.Module)({
        providers: [tome_8_service_1.Tome8Service],
        exports: [tome_8_service_1.Tome8Service],
    })
], Tome8Module);
