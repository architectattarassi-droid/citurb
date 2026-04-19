import { Module } from "@nestjs/common";
import { P5Module } from "./p5/p5.module";
import { Tome6Service } from "./tome-6.service";

@Module({
  imports: [P5Module],
  providers: [Tome6Service],
  exports: [Tome6Service, P5Module],
})
export class Tome6Module {}
