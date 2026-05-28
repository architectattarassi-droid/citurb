"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsHubModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../../tomes/tome-5/auth/auth.module");
const analytics_hub_controller_1 = require("./analytics-hub.controller");
const analytics_hub_service_1 = require("./analytics-hub.service");
/**
 * AnalyticsHubModule — instrumentation des 6 portes (Tome 0).
 * "Laissons le marché décider" : on mesure conversion + GMV + NPS par porte.
 */
let AnalyticsHubModule = class AnalyticsHubModule {
};
exports.AnalyticsHubModule = AnalyticsHubModule;
exports.AnalyticsHubModule = AnalyticsHubModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.Tome5AuthModule],
        controllers: [analytics_hub_controller_1.AnalyticsHubController],
        providers: [analytics_hub_service_1.AnalyticsHubService],
        exports: [analytics_hub_service_1.AnalyticsHubService],
    })
], AnalyticsHubModule);
