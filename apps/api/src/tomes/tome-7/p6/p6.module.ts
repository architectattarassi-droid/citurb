import { Module } from "@nestjs/common";
import { P6Controller } from "./p6.controller";
import { P6RegistryController } from "./registry.controller";
import { P6ScoringService } from "./scoring.service";
import { SupplierCatalogService } from "./supplier-catalog.service";
import { SupplierCatalogController } from "./supplier-catalog.controller";
import { P6ReviewController } from "./p6-review.controller";
import { PrismaModule } from "../../tome-at";
import { Tome5AuthModule } from "../../tome-5/auth/auth.module";

@Module({
  imports: [PrismaModule, Tome5AuthModule],
  controllers: [P6Controller, P6RegistryController, SupplierCatalogController, P6ReviewController],
  providers: [P6ScoringService, SupplierCatalogService],
  exports: [SupplierCatalogService],
})
export class P6Module {}
