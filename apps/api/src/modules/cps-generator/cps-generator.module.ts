import { Module } from "@nestjs/common";
import { PrismaModule } from "../../tomes/tome-at/kernel/prisma/prisma.module";
import { CpsGeneratorController } from "./cps-generator.controller";
import { CpsGeneratorService } from "./cps-generator.service";
import { CpsMarketplaceService } from "./cps-marketplace.service";

/**
 * CpsGeneratorModule — génération de CPS (Tome 2) + pont marketplace.
 * Le générateur lit les gabarits `data/cps-templates/` ; le pont
 * `CpsMarketplaceService` lit le catalogue matériaux + interroge la
 * marketplace Cercles (Prisma) pour produits/prix/commande.
 */
@Module({
  imports: [PrismaModule],
  controllers: [CpsGeneratorController],
  providers: [CpsGeneratorService, CpsMarketplaceService],
  exports: [CpsGeneratorService, CpsMarketplaceService],
})
export class CpsGeneratorModule {}
