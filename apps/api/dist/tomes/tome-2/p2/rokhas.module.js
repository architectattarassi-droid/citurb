"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RokhasModule = void 0;
const common_1 = require("@nestjs/common");
const rokhas_service_1 = require("./rokhas.service");
const rokhas_controller_1 = require("./rokhas.controller");
const tome_at_1 = require("../../tome-at");
let RokhasModule = class RokhasModule {
};
exports.RokhasModule = RokhasModule;
exports.RokhasModule = RokhasModule = __decorate([
    (0, common_1.Module)({
        imports: [tome_at_1.PrismaModule],
        providers: [rokhas_service_1.RokhasService],
        controllers: [rokhas_controller_1.RokhasController],
        exports: [rokhas_service_1.RokhasService],
    })
], RokhasModule);
