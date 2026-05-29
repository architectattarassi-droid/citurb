import { Module } from "@nestjs/common";
import { PrismaModule } from "../../tome-at/kernel/prisma/prisma.module";
import { KernelModule } from "../../../modules/kernel/kernel.module";
import { Tome5AuthModule } from "../../tome-5/auth/auth.module";
import { PvChantierController } from "./pv-chantier.controller";
import { PvChantierRenderer } from "./pv-chantier.renderer";
import { PvChantierService } from "./pv-chantier.service";
import { PvComplianceService } from "./pv-compliance.service";

/**
 * Tome 2 — Module PV de Chantier.
 *
 * Expose le service pour usage croisé (génération contrat, dashboards, etc.).
 * PvComplianceService applique la cadence PV obligatoire (1 PV / 15 jours,
 * doctrine T2-R-PV-CADENCE-001) : cron + blocage chantier + alertes.
 */
@Module({
  imports: [PrismaModule, KernelModule, Tome5AuthModule],
  controllers: [PvChantierController],
  providers: [PvChantierService, PvChantierRenderer, PvComplianceService],
  exports: [PvChantierService, PvChantierRenderer, PvComplianceService],
})
export class PvChantierModule {}
