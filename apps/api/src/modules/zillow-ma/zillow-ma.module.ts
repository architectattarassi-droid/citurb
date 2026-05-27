import { Module } from "@nestjs/common";
import { KernelModule } from "../kernel/kernel.module";
import { ZillowMaController } from "./zillow-ma.controller";
import { EstimationService } from "./estimation.service";

/**
 * ZillowMaModule — module estimation foncière publique (Tome 0).
 * Pivot Visa du foncier maghrébin — Livrable Q3-2026 #2.
 */
@Module({
  imports: [KernelModule],
  controllers: [ZillowMaController],
  providers: [EstimationService],
  exports: [EstimationService],
})
export class ZillowMaModule {}
