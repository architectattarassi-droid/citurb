"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
// Kernel
const health_module_1 = require("./modules/health/health.module");
// Infra
const prisma_dossiers_module_1 = require("./tomes/tome-at/kernel/prisma-dossiers/prisma-dossiers.module");
// Modules
const universe_module_1 = require("./modules/universe/universe.module");
const cc_module_1 = require("./command-center/cc.module");
// Tome modules
const tome_at_module_1 = require("./tomes/tome-at/tome-at.module");
const tome_0_module_1 = require("./tomes/tome-0/tome-0.module");
const tome_1_module_1 = require("./tomes/tome-1/tome-1.module");
const tome_2_module_1 = require("./tomes/tome-2/tome-2.module");
const rokhas_module_1 = require("./tomes/tome-2/p2/rokhas.module");
const tome_3_module_1 = require("./tomes/tome-3/tome-3.module");
const tome_4_module_1 = require("./tomes/tome-4/tome-4.module");
const tome_5_module_1 = require("./tomes/tome-5/tome-5.module");
const tome_6_module_1 = require("./tomes/tome-6/tome-6.module");
const tome_7_module_1 = require("./tomes/tome-7/tome-7.module");
const tome_8_module_1 = require("./tomes/tome-8/tome-8.module");
const tome_9_module_1 = require("./tomes/tome-9/tome-9.module");
const tome_10_module_1 = require("./tomes/tome-10/tome-10.module");
// App-level orchestration
const orchestrator_module_1 = require("./orchestrator/orchestrator.module");
const firm_module_1 = require("./modules/firm/firm.module");
const storage_module_1 = require("./modules/storage/storage.module");
const geo_module_1 = require("./modules/geo/geo.module");
const phase_engine_module_1 = require("./modules/phase-engine/phase-engine.module");
const messagerie_module_1 = require("./modules/messagerie/messagerie.module");
const sous_phase_module_1 = require("./modules/sous-phase/sous-phase.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            health_module_1.HealthModule,
            prisma_dossiers_module_1.PrismaDossiersModule,
            cc_module_1.CCModule,
            // ── Tomes (@ → 0 → 1 → … → 10)
            tome_at_module_1.TomeAtModule,
            orchestrator_module_1.OrchestratorModule,
            tome_0_module_1.Tome0Module,
            tome_1_module_1.Tome1Module,
            tome_2_module_1.Tome2Module,
            rokhas_module_1.RokhasModule,
            tome_3_module_1.Tome3Module,
            tome_4_module_1.Tome4Module,
            tome_5_module_1.Tome5Module,
            tome_6_module_1.Tome6Module,
            tome_7_module_1.Tome7Module,
            tome_8_module_1.Tome8Module,
            tome_9_module_1.Tome9Module,
            tome_10_module_1.Tome10FinancingModule,
            // Non-tome modules
            universe_module_1.UniverseModule,
            firm_module_1.FirmModule,
            storage_module_1.StorageModule,
            geo_module_1.GeoModule,
            phase_engine_module_1.PhaseEngineModule,
            messagerie_module_1.MessagerieModule,
            sous_phase_module_1.SousPhaseModule,
        ],
        controllers: [],
        providers: [],
    })
], AppModule);
