import { Module } from "@nestjs/common";
import { KernelModule } from "../kernel/kernel.module";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";
import { MreDiasporaController } from "./mre-diaspora.controller";
import { MreDiasporaService } from "./mre-diaspora.service";

/**
 * MreDiasporaModule — parcours MRE (Pivot Visa du foncier maghrébin).
 * Adresse 4M Marocains à l'étranger : procuration eIDAS + escrow + mandataires.
 */
@Module({
  imports: [KernelModule, Tome5AuthModule],
  controllers: [MreDiasporaController],
  providers: [MreDiasporaService],
  exports: [MreDiasporaService],
})
export class MreDiasporaModule {}
