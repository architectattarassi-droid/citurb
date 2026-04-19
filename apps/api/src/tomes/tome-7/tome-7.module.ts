import { Module } from "@nestjs/common";
import { P6Module } from "./p6/p6.module";
import { Tome7Service } from "./tome-7.service";

@Module({
  imports: [P6Module],
  providers: [Tome7Service],
  exports: [Tome7Service, P6Module],
})
export class Tome7Module {}
