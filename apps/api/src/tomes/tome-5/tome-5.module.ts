import { Module } from "@nestjs/common";
import { Tome5AuthModule } from "./auth/auth.module";

/**
 * TOME@5 — Facade module (canonical import for AppModule)
 * Doctrine: AppModule importe uniquement depuis ./tomes/tome-x/tome-x.module
 */
@Module({
  imports: [Tome5AuthModule],
  exports: [Tome5AuthModule],
})
export class Tome5Module {}
