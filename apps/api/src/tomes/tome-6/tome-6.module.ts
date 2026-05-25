import { Module } from "@nestjs/common";
import { P5Module } from "./p5/p5.module";
import { Tome6Service } from "./tome-6.service";
import { ProjectCalendarModule } from "./project-calendar/project-calendar.module";
import { DossierInteractionsModule } from "./dossier-interactions/dossier-interactions.module";

@Module({
  imports: [P5Module, ProjectCalendarModule, DossierInteractionsModule],
  providers: [Tome6Service],
  exports: [Tome6Service, P5Module, ProjectCalendarModule, DossierInteractionsModule],
})
export class Tome6Module {}
