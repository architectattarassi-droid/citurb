import { Module } from "@nestjs/common";
import { Tome5AuthModule } from "./auth/auth.module";
import { MaterialsCatalogModule } from "./materials-catalog/materials-catalog.module";
import { PrestataireTarifsModule } from "./prestataire-tarifs/prestataire-tarifs.module";

/**
 * TOME@5 — Facade module (canonical import for AppModule)
 * Doctrine: AppModule importe uniquement depuis ./tomes/tome-x/tome-x.module
 */
@Module({
  imports: [Tome5AuthModule, MaterialsCatalogModule, PrestataireTarifsModule],
  exports: [Tome5AuthModule, MaterialsCatalogModule, PrestataireTarifsModule],
})
export class Tome5Module {}
