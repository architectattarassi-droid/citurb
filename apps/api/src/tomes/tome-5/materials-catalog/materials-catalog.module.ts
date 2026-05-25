import { Module } from "@nestjs/common";
import { MaterialsCatalogController } from "./materials-catalog.controller";
import { MaterialsCatalogService } from "./materials-catalog.service";

/**
 * TOME 5 — Materials Catalog Module
 *
 * Imported by Tome5Module facade. No external dependencies (reads static JSON).
 */
@Module({
  controllers: [MaterialsCatalogController],
  providers: [MaterialsCatalogService],
  exports: [MaterialsCatalogService],
})
export class MaterialsCatalogModule {}
