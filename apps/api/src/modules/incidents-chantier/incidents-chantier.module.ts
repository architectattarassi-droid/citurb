import { Module } from "@nestjs/common";

import { KernelModule } from "../kernel/kernel.module";
// TwilioModule + EmailModule are @Global() — injectable everywhere.

import { IncidentsChantierController } from "./incidents-chantier.controller";
import { IncidentsChantierService } from "./incidents-chantier.service";
import { SosService } from "./sos.service";
import { WeatherReplanService } from "./weather-replan.service";

@Module({
  imports: [KernelModule],
  controllers: [IncidentsChantierController],
  providers: [IncidentsChantierService, SosService, WeatherReplanService],
  exports: [IncidentsChantierService, SosService, WeatherReplanService],
})
export class IncidentsChantierModule {}
