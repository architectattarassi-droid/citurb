/**
 * apps/api/src/modules/livraisons-materiaux/livraisons-materiaux.module.ts
 *
 * Module Livraisons Matériaux (Tome 5).
 * Importé par AppModule. Dépend de PrismaModule (global) + KernelModule
 * (ProbativeLogService).
 */

import { Module } from "@nestjs/common";
import { KernelModule } from "../kernel/kernel.module";
import { LivraisonsMateriauxController } from "./livraisons-materiaux.controller";
import { LivraisonsMateriauxService } from "./livraisons-materiaux.service";

@Module({
  imports: [KernelModule],
  controllers: [LivraisonsMateriauxController],
  providers: [LivraisonsMateriauxService],
  exports: [LivraisonsMateriauxService],
})
export class LivraisonsMateriauxModule {}
