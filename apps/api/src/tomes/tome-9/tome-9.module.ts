import { Module } from "@nestjs/common";
import { Tome9OpsModule } from "./ops/ops.module";

/**
 * TOME@9 — Facade module (canonical import for AppModule)
 */
@Module({
  imports: [Tome9OpsModule],
  exports: [Tome9OpsModule],
})
export class Tome9Module {}
