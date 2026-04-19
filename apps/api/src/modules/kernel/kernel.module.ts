import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { MutationGateGuard } from "../../common/guards/mutation-gate.guard";
import { IncidentsService } from "./services/incidents.service";
import { ProbativeLogService } from "./services/probative-log.service";

@Module({
  providers: [IncidentsService, ProbativeLogService],
  exports: [IncidentsService, ProbativeLogService],
})
export class KernelModule {}
