import { Module } from "@nestjs/common";
import { P2Module } from "./p2/p2.module";
import { Tome2Service } from "./tome-2.service";

@Module({
  imports: [P2Module],
  providers: [Tome2Service],
  exports: [Tome2Service, P2Module],
})
export class Tome2Module {}
