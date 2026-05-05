import { Module } from "@nestjs/common";
import { P6Controller } from "./p6.controller";
import { P6RegistryController } from "./registry.controller";
import { P6ScoringService } from "./scoring.service";

@Module({
  controllers: [P6Controller, P6RegistryController],
  providers: [P6ScoringService],
})
export class P6Module {}
