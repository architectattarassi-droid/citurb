"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorModule = void 0;
const common_1 = require("@nestjs/common");
const tome_0_module_1 = require("../tomes/tome-0/tome-0.module");
const tome_1_module_1 = require("../tomes/tome-1/tome-1.module");
const tome_2_module_1 = require("../tomes/tome-2/tome-2.module");
const tome_3_module_1 = require("../tomes/tome-3/tome-3.module");
const tome_4_module_1 = require("../tomes/tome-4/tome-4.module");
const tome_5_module_1 = require("../tomes/tome-5/tome-5.module");
const tome_6_module_1 = require("../tomes/tome-6/tome-6.module");
const tome_7_module_1 = require("../tomes/tome-7/tome-7.module");
const tome_8_module_1 = require("../tomes/tome-8/tome-8.module");
const tome_9_module_1 = require("../tomes/tome-9/tome-9.module");
const tome_10_module_1 = require("../tomes/tome-10/tome-10.module");
const orchestrator_controller_1 = require("./orchestrator.controller");
const orchestrator_service_1 = require("./orchestrator.service");
const tome_pipeline_service_1 = require("./tome-pipeline.service");
/**
 * App-level orchestration module.
 * Lives OUTSIDE tomes to avoid forbidden import direction (kernel importing lower tomes).
 */
let OrchestratorModule = class OrchestratorModule {
};
exports.OrchestratorModule = OrchestratorModule;
exports.OrchestratorModule = OrchestratorModule = __decorate([
    (0, common_1.Module)({
        imports: [
            tome_0_module_1.Tome0Module,
            tome_1_module_1.Tome1Module,
            tome_2_module_1.Tome2Module,
            tome_3_module_1.Tome3Module,
            tome_4_module_1.Tome4Module,
            tome_5_module_1.Tome5Module,
            tome_6_module_1.Tome6Module,
            tome_7_module_1.Tome7Module,
            tome_8_module_1.Tome8Module,
            tome_9_module_1.Tome9Module,
            tome_10_module_1.Tome10FinancingModule,
        ],
        controllers: [orchestrator_controller_1.OrchestratorController],
        providers: [orchestrator_service_1.OrchestratorService, tome_pipeline_service_1.TomePipelineService],
        exports: [orchestrator_service_1.OrchestratorService],
    })
], OrchestratorModule);
