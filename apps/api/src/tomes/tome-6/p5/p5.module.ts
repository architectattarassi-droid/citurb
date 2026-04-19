import { Module } from "@nestjs/common";
import { P5Controller } from "./p5.controller";

@Module({
  controllers: [P5Controller],
})
export class P5Module {}
