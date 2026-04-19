import { Module } from "@nestjs/common";
import { UniverseController, LotissementController } from "./universe.controller";
import { UniverseService } from "./universe.service";

@Module({
  controllers: [UniverseController, LotissementController],
  providers: [UniverseService],
  exports: [UniverseService],
})
export class UniverseModule {}
