import { Module } from "@nestjs/common";
import { OpsIncidentsController } from "./opsIncidents.controller";
import { OpsSituationsController } from "./opsSituations.controller";
import { OpsSituationsService } from "./opsSituations.service";
import { OpsDossiersController } from "./dossiers/ops.dossiers.controller";

/**
 * TOME 9 — OPS console endpoints
 * Protected endpoints for internal operations.
 */
@Module({
  controllers: [OpsIncidentsController, OpsSituationsController, OpsDossiersController],
  providers: [OpsSituationsService],
})
export class Tome9OpsModule {}
