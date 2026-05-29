import { Module } from "@nestjs/common";
import { PrismaModule } from "../../tomes/tome-at/kernel/prisma/prisma.module";
import { KernelModule } from "../kernel/kernel.module";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";
import { CpsGeneratorController } from "./cps-generator.controller";
import { CpsGeneratorService } from "./cps-generator.service";
import { CpsMarketplaceService } from "./cps-marketplace.service";
import { CpsDossierController } from "./cps-dossier.controller";
import { CpsDossierService } from "./cps-dossier.service";

/**
 * CpsGeneratorModule — génération de CPS (Tome 2) + pont marketplace + CPS dossier.
 *  - CpsGeneratorService : moteur trilingue (gabarits `data/cps-templates/`)
 *  - CpsMarketplaceService : pont catalogue/marketplace (prix, commande)
 *  - CpsDossierService : CPS lié au dossier (paywall, porte, filigrane, signatures Barid)
 */
@Module({
  imports: [PrismaModule, KernelModule, Tome5AuthModule],
  controllers: [CpsGeneratorController, CpsDossierController],
  providers: [CpsGeneratorService, CpsMarketplaceService, CpsDossierService],
  exports: [CpsGeneratorService, CpsMarketplaceService, CpsDossierService],
})
export class CpsGeneratorModule {}
