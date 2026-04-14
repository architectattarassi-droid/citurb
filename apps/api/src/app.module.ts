import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// Kernel
import { HealthModule } from "./modules/health/health.module";

// Infra
import { PrismaDossiersModule } from "./tomes/tome-at/kernel/prisma-dossiers/prisma-dossiers.module";

// Modules
import { UniverseModule } from "./modules/universe/universe.module";
import { CCModule } from "./command-center/cc.module";

// Tome modules
import { TomeAtModule } from "./tomes/tome-at/tome-at.module";
import { Tome0Module } from "./tomes/tome-0/tome-0.module";
import { Tome1Module } from "./tomes/tome-1/tome-1.module";
import { Tome2Module } from "./tomes/tome-2/tome-2.module";
import { RokhasModule } from "./tomes/tome-2/p2/rokhas.module";
import { Tome3Module } from "./tomes/tome-3/tome-3.module";
import { Tome4Module } from "./tomes/tome-4/tome-4.module";
import { Tome5Module } from "./tomes/tome-5/tome-5.module";
import { Tome6Module } from "./tomes/tome-6/tome-6.module";
import { Tome7Module } from "./tomes/tome-7/tome-7.module";
import { Tome8Module } from "./tomes/tome-8/tome-8.module";
import { Tome9Module } from "./tomes/tome-9/tome-9.module";
import { Tome10FinancingModule } from "./tomes/tome-10/tome-10.module";

// App-level orchestration
import { OrchestratorModule } from "./orchestrator/orchestrator.module";
import { FirmModule } from "./modules/firm/firm.module";
import { StorageModule } from "./modules/storage/storage.module";
import { GeoModule } from "./modules/geo/geo.module";
import { PhaseEngineModule } from "./modules/phase-engine/phase-engine.module";
import { MessagerieModule } from "./modules/messagerie/messagerie.module";
import { SousPhaseModule } from "./modules/sous-phase/sous-phase.module";

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'apps', 'web', 'dist'),
      exclude: ['/p2/(.*)', '/auth/(.*)', '/health(.*)', '/firms/(.*)', '/api/(.*)'],
    }),
    ScheduleModule.forRoot(),
    HealthModule,
    PrismaDossiersModule,
    CCModule,

    // ── Tomes (@ → 0 → 1 → … → 10)
    TomeAtModule,
    OrchestratorModule,
    Tome0Module,
    Tome1Module,
    Tome2Module,
    RokhasModule,
    Tome3Module,
    Tome4Module,
    Tome5Module,
    Tome6Module,
    Tome7Module,
    Tome8Module,
    Tome9Module,
    Tome10FinancingModule,

    // Non-tome modules
    UniverseModule,
    FirmModule,
    StorageModule,
    GeoModule,
    PhaseEngineModule,
    MessagerieModule,
    SousPhaseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
