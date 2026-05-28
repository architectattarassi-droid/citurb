import { Module } from "@nestjs/common";
import { KernelModule } from "../kernel/kernel.module";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";
import { AvanceTresorerieController } from "./avance-tresorerie.controller";
import { AvanceTresorerieService } from "./avance-tresorerie.service";

/**
 * AvanceTresorerieModule — avance trésorerie sur situation (Tome 3).
 * Wishlist persona Brahim : flux de trésorerie chantier.
 */
@Module({
  imports: [KernelModule, Tome5AuthModule],
  controllers: [AvanceTresorerieController],
  providers: [AvanceTresorerieService],
  exports: [AvanceTresorerieService],
})
export class AvanceTresorerieModule {}
