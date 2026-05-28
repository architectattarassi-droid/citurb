import { Module } from "@nestjs/common";
import { KernelModule } from "../kernel/kernel.module";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";
import { OpciTokeniseController } from "./opci-tokenise.controller";
import { OpciTokeniseService } from "./opci-tokenise.service";

/**
 * OpciTokeniseModule — OPCI tokenisé loi 70-14 + AMMC (Tome 4).
 * Permet aux MRE d'investir fractionné dans l'immobilier marocain.
 */
@Module({
  imports: [KernelModule, Tome5AuthModule],
  controllers: [OpciTokeniseController],
  providers: [OpciTokeniseService],
  exports: [OpciTokeniseService],
})
export class OpciTokeniseModule {}
