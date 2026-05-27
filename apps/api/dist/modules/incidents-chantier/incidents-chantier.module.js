"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentsChantierModule = void 0;
const common_1 = require("@nestjs/common");
const kernel_module_1 = require("../kernel/kernel.module");
// TwilioModule + EmailModule are @Global() — injectable everywhere.
const incidents_chantier_controller_1 = require("./incidents-chantier.controller");
const incidents_chantier_service_1 = require("./incidents-chantier.service");
const sos_service_1 = require("./sos.service");
const weather_replan_service_1 = require("./weather-replan.service");
let IncidentsChantierModule = class IncidentsChantierModule {
};
exports.IncidentsChantierModule = IncidentsChantierModule;
exports.IncidentsChantierModule = IncidentsChantierModule = __decorate([
    (0, common_1.Module)({
        imports: [kernel_module_1.KernelModule],
        controllers: [incidents_chantier_controller_1.IncidentsChantierController],
        providers: [incidents_chantier_service_1.IncidentsChantierService, sos_service_1.SosService, weather_replan_service_1.WeatherReplanService],
        exports: [incidents_chantier_service_1.IncidentsChantierService, sos_service_1.SosService, weather_replan_service_1.WeatherReplanService],
    })
], IncidentsChantierModule);
