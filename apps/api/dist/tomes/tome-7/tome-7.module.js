"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tome7Module = void 0;
const common_1 = require("@nestjs/common");
const p6_module_1 = require("./p6/p6.module");
const tome_7_service_1 = require("./tome-7.service");
const report_renderer_service_1 = require("./report-renderer.service");
const report_controller_1 = require("./report.controller");
const tome_at_1 = require("../tome-at");
const auth_module_1 = require("../tome-5/auth/auth.module");
let Tome7Module = class Tome7Module {
};
exports.Tome7Module = Tome7Module;
exports.Tome7Module = Tome7Module = __decorate([
    (0, common_1.Module)({
        imports: [p6_module_1.P6Module, tome_at_1.PrismaModule, auth_module_1.Tome5AuthModule],
        controllers: [report_controller_1.ReportController],
        providers: [tome_7_service_1.Tome7Service, report_renderer_service_1.ReportRendererService],
        exports: [tome_7_service_1.Tome7Service, p6_module_1.P6Module, report_renderer_service_1.ReportRendererService],
    })
], Tome7Module);
