import { Module } from "@nestjs/common";
import { Tome10FinancingController } from "./tome-10.controller";
import { Tome10FinancingService } from "./tome-10.service";

/**
 * TOME 10 — FINANCING & BANK BROKER (P1-first)
 * But: générer un dossier bancaire "prêt à déposer" APRÈS un plan (type ou personnalisé)
 *      + orchestrer partenaires banques (sans exposer données brutes côté public).
 *
 * Rappels doctrinaux:
 * - Payment/Entitlements (T1) restent la source de vérité.
 * - State machine (T3) dicte quand le financement est accessible.
 * - DataLake/DataProduct (T0) : les pièces brutes restent internes.
 */
@Module({
  controllers: [Tome10FinancingController],
  providers: [Tome10FinancingService],
  exports: [Tome10FinancingService],
})
export class Tome10FinancingModule {}
