import { Module } from "@nestjs/common";

import { Tome0Module } from "../tomes/tome-0/tome-0.module";
import { Tome1Module } from "../tomes/tome-1/tome-1.module";
import { Tome2Module } from "../tomes/tome-2/tome-2.module";
import { Tome3Module } from "../tomes/tome-3/tome-3.module";
import { Tome4Module } from "../tomes/tome-4/tome-4.module";
import { Tome5Module } from "../tomes/tome-5/tome-5.module";
import { Tome6Module } from "../tomes/tome-6/tome-6.module";
import { Tome7Module } from "../tomes/tome-7/tome-7.module";
import { Tome8Module } from "../tomes/tome-8/tome-8.module";
import { Tome9Module } from "../tomes/tome-9/tome-9.module";
import { Tome10FinancingModule } from "../tomes/tome-10/tome-10.module";

import { OrchestratorController } from "./orchestrator.controller";
import { OrchestratorService } from "./orchestrator.service";
import { TomePipelineService } from "./tome-pipeline.service";

/**
 * App-level orchestration module.
 * Lives OUTSIDE tomes to avoid forbidden import direction (kernel importing lower tomes).
 */
@Module({
  imports: [
    Tome0Module,
    Tome1Module,
    Tome2Module,
    Tome3Module,
    Tome4Module,
    Tome5Module,
    Tome6Module,
    Tome7Module,
    Tome8Module,
    Tome9Module,
    Tome10FinancingModule,
  ],
  controllers: [OrchestratorController],
  providers: [OrchestratorService, TomePipelineService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
