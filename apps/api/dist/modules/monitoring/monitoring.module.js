"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringModule = void 0;
const common_1 = require("@nestjs/common");
const analytics_service_1 = require("./analytics.service");
const monitoring_controller_1 = require("./monitoring.controller");
/**
 * MonitoringModule — supervision & rapports (Sprint monitoring-notifications).
 *
 * B1 : analytics visites via Umami (AnalyticsService + endpoint lecture OPS).
 * B2..B4 (à venir) : notifications dossier, rapport quotidien, rapport hebdo SEO/GEO.
 *
 * Module transverse (non-tome), enregistré dans app.module.ts. EmailModule,
 * TwilioModule et NotificationsHubModule sont globaux et déjà disponibles ici.
 */
let MonitoringModule = class MonitoringModule {
};
exports.MonitoringModule = MonitoringModule;
exports.MonitoringModule = MonitoringModule = __decorate([
    (0, common_1.Module)({
        controllers: [monitoring_controller_1.MonitoringController],
        providers: [analytics_service_1.AnalyticsService],
        exports: [analytics_service_1.AnalyticsService],
    })
], MonitoringModule);
