import { Module } from "@nestjs/common";
import { KernelModule } from "../kernel/kernel.module";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";
import { MandatairesRegistryController } from "./mandataires-registry.controller";
import { MandatairesRegistryService } from "./mandataires-registry.service";

/**
 * MandatairesRegistryModule — annuaire mandataires agréés CITURBAREA (Tome 2).
 * 50 mandataires pilotes / 12 villes. Brique du parcours MRE.
 */
@Module({
  imports: [KernelModule, Tome5AuthModule],
  controllers: [MandatairesRegistryController],
  providers: [MandatairesRegistryService],
  exports: [MandatairesRegistryService],
})
export class MandatairesRegistryModule {}
