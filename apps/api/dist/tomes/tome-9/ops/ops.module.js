"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tome9OpsModule = void 0;
const common_1 = require("@nestjs/common");
const opsIncidents_controller_1 = require("./opsIncidents.controller");
const opsSituations_controller_1 = require("./opsSituations.controller");
const opsSituations_service_1 = require("./opsSituations.service");
const ops_dossiers_controller_1 = require("./dossiers/ops.dossiers.controller");
/**
 * TOME 9 — OPS console endpoints
 * Protected endpoints for internal operations.
 */
let Tome9OpsModule = class Tome9OpsModule {
};
exports.Tome9OpsModule = Tome9OpsModule;
exports.Tome9OpsModule = Tome9OpsModule = __decorate([
    (0, common_1.Module)({
        controllers: [opsIncidents_controller_1.OpsIncidentsController, opsSituations_controller_1.OpsSituationsController, ops_dossiers_controller_1.OpsDossiersController],
        providers: [opsSituations_service_1.OpsSituationsService],
    })
], Tome9OpsModule);
