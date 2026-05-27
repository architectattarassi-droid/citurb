import { Module } from "@nestjs/common";
import { DossierOverviewController } from "./dossier-overview.controller";
import { DossierOverviewService } from "./dossier-overview.service";

/**
 * DossierOverviewModule — agrégateur "Mon Parcours" pour le client.
 *
 * Tome 0 — gouvernance données / lecture transverse.
 * PrismaService est exposé globalement via PrismaModule (@Global),
 * aucun import explicite nécessaire.
 *
 * À ajouter dans app.module.ts dans la section "Non-tome modules"
 * (cf. INTEGRATION.md).
 */
@Module({
  controllers: [DossierOverviewController],
  providers: [DossierOverviewService],
  exports: [DossierOverviewService],
})
export class DossierOverviewModule {}
