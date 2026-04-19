import { Module } from "@nestjs/common";
import { P4Controller } from "./p4.controller";

@Module({
  controllers: [P4Controller],
})
export class P4Module {}
