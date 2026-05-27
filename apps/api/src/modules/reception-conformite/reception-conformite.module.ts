import { Module } from "@nestjs/common";
import { PrismaModule } from "../../tomes/tome-at/kernel/prisma/prisma.module";
import { KernelModule } from "../kernel/kernel.module";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";
import { ReceptionConformiteController } from "./reception-conformite.controller";
import { ReceptionConformiteService } from "./reception-conformite.service";
import { PvReceptionRenderer } from "./pv-reception-renderer";
import { CertificatConformiteRenderer } from "./certificat-conformite-renderer";

/**
 * Tome 3 — Module Réception + Certificat de Conformité + Permis d'Habiter.
 *
 * Exposé pour usage croisé (timeline dossier, exports admin, alertes garanties).
 */
@Module({
  imports: [PrismaModule, KernelModule, Tome5AuthModule],
  controllers: [ReceptionConformiteController],
  providers: [
    ReceptionConformiteService,
    PvReceptionRenderer,
    CertificatConformiteRenderer,
  ],
  exports: [
    ReceptionConformiteService,
    PvReceptionRenderer,
    CertificatConformiteRenderer,
  ],
})
export class ReceptionConformiteModule {}
