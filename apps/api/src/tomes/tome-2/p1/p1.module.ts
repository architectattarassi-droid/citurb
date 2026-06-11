import { Module } from "@nestjs/common";
import { P1ContractController } from "./contract.controller";
import { P1ContractService } from "./contract.service";
import { P2Module } from "../p2/p2.module"; // pour réutiliser P2ContractService (template HTML)
import { PrismaModule } from "../../tome-at";
import { Tome5AuthModule } from "../../tome-5/auth/auth.module";

/**
 * Tome 2 — P1 (particulier) module.
 *
 * Pour l'instant, ce module ne contient que la génération de contrat type
 * unifié d'Architecte (CNOA Construction 2024) pour les dossiers P1 :
 *   - GET /p1/admin/dossiers/:id/contrat (ADMIN/OWNER/OPS)
 *   - GET /p1/dossiers/:id/contrat (CLIENT propriétaire, avec consentement)
 *
 * Autres flux P1 (intake, quote, etc.) restent dans /apps/api/src/p1/ et
 * /apps/api/src/tomes/tome-4/public/ (architecture historique pré-tome-2).
 */
@Module({
  imports: [PrismaModule, P2Module, Tome5AuthModule],
  controllers: [P1ContractController],
  providers: [P1ContractService],
  exports: [P1ContractService],
})
export class P1Module {}
