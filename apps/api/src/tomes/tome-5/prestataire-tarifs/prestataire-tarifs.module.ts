import { Module } from "@nestjs/common";

import { PrestataireTarifsController } from "./prestataire-tarifs.controller";
import { PrestataireTarifsService } from "./prestataire-tarifs.service";

/**
 * TOME 5 — Module Tarifs Contractuels Prestataires P6
 *
 * Voir INTEGRATION.md pour intégration AppModule + allow-list MutationGate.
 */
@Module({
  controllers: [PrestataireTarifsController],
  providers: [PrestataireTarifsService],
  exports: [PrestataireTarifsService],
})
export class PrestataireTarifsModule {}
