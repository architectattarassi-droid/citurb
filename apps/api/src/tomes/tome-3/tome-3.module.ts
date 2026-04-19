import { Module } from "@nestjs/common";
import { P3Module } from "./p3/p3.module";
import { Tome3Service } from "./tome-3.service";

@Module({
  imports: [P3Module],
  providers: [Tome3Service],
  exports: [Tome3Service, P3Module],
})
export class Tome3Module {}
