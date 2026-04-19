"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SousPhaseModule = void 0;
const common_1 = require("@nestjs/common");
const sous_phase_service_1 = require("./sous-phase.service");
const sous_phase_controller_1 = require("./sous-phase.controller");
let SousPhaseModule = class SousPhaseModule {
};
exports.SousPhaseModule = SousPhaseModule;
exports.SousPhaseModule = SousPhaseModule = __decorate([
    (0, common_1.Module)({ providers: [sous_phase_service_1.SousPhaseService], exports: [sous_phase_service_1.SousPhaseService], controllers: [sous_phase_controller_1.SousPhaseController] })
], SousPhaseModule);
