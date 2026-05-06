import { Module } from "@nestjs/common";
import { P6Module } from "./p6/p6.module";
import { Tome7Service } from "./tome-7.service";
import { ReportRendererService } from "./report-renderer.service";
import { ReportController } from "./report.controller";
import { PrismaModule } from "../tome-at";
import { Tome5AuthModule } from "../tome-5/auth/auth.module";

@Module({
  imports: [P6Module, PrismaModule, Tome5AuthModule],
  controllers: [ReportController],
  providers: [Tome7Service, ReportRendererService],
  exports: [Tome7Service, P6Module, ReportRendererService],
})
export class Tome7Module {}
