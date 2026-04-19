import { Module } from "@nestjs/common";
import { Tome1Service } from "./tome-1.service";

@Module({
  providers: [Tome1Service],
  exports: [Tome1Service],
})
export class Tome1Module {}
