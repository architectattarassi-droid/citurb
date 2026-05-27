import { Module } from "@nestjs/common";
import { P3Module } from "./p3/p3.module";
import { Tome3Service } from "./tome-3.service";
import { ReceptionConformiteModule } from "../../modules/reception-conformite/reception-conformite.module";

@Module({
  imports: [P3Module, ReceptionConformiteModule],
  providers: [Tome3Service],
  exports: [Tome3Service, P3Module, ReceptionConformiteModule],
})
export class Tome3Module {}
