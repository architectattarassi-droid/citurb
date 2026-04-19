import { Module } from "@nestjs/common";
import { Tome0Service } from "./tome-0.service";

@Module({
  providers: [Tome0Service],
  exports: [Tome0Service],
})
export class Tome0Module {}
