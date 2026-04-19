import { Module } from "@nestjs/common";
import { P6Controller } from "./p6.controller";

@Module({
  controllers: [P6Controller],
})
export class P6Module {}
