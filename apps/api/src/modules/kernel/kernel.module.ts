import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { IncidentsService } from "./services/incidents.service";
import { ProbativeLogService } from "./services/probative-log.service";
import { GlobalExceptionFilter } from "./global-exception.filter";
import { PrismaModule } from "../../tomes/tome-at";

@Module({
  imports: [PrismaModule],
  providers: [
    IncidentsService,
    ProbativeLogService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
  exports: [IncidentsService, ProbativeLogService],
})
export class KernelModule {}
