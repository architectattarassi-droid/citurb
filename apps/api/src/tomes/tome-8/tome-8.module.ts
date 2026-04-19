import { Module } from "@nestjs/common";
import { Tome8Service } from "./tome-8.service";

@Module({
  providers: [Tome8Service],
  exports: [Tome8Service],
})
export class Tome8Module {}
