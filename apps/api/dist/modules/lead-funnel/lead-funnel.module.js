"use strict";
/**
 * lead-funnel.module.ts
 *
 * Module NestJS — Tome 0 (capture & qualification leads).
 *
 * Dépendances :
 *  - EmailService (module global) — envoi accusé + nurture.
 *  - @nestjs/schedule — cron quotidien (déjà importé au niveau AppModule).
 *
 * À ajouter dans `app.module.ts` :
 *   imports: [ …, LeadFunnelModule ]
 *
 * MutationGate allow-list : `/api/lead-funnel`
 * (cf. apps/api/src/common/guards/mutation-gate.guard.ts).
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadFunnelModule = void 0;
const common_1 = require("@nestjs/common");
const kernel_module_1 = require("../kernel/kernel.module");
const lead_funnel_controller_1 = require("./lead-funnel.controller");
const lead_funnel_service_1 = require("./lead-funnel.service");
const lead_nurture_service_1 = require("./lead-nurture.service");
let LeadFunnelModule = class LeadFunnelModule {
};
exports.LeadFunnelModule = LeadFunnelModule;
exports.LeadFunnelModule = LeadFunnelModule = __decorate([
    (0, common_1.Module)({
        // KernelModule importé pour ProbativeLogService (audit traçable des notifs leads).
        // L'injection se fait via @Optional() côté service donc dégrade gracieusement
        // si jamais l'ordre d'import change.
        imports: [kernel_module_1.KernelModule],
        controllers: [lead_funnel_controller_1.LeadFunnelController],
        providers: [lead_funnel_service_1.LeadFunnelService, lead_nurture_service_1.LeadNurtureService],
        exports: [lead_funnel_service_1.LeadFunnelService, lead_nurture_service_1.LeadNurtureService],
    })
], LeadFunnelModule);
