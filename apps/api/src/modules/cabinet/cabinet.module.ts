/**
 * CabinetModule — fiche cabinet d'architecte (ancrée sur ProProfile).
 * Cf. memory `citurb-cabinet-portfolio-anchor` : on étend ProProfile, on ne crée
 * PAS de modèle Cabinet/Firm parallèle (collisions documentées).
 */
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../tomes/tome-at/kernel/prisma/prisma.module";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";
import { CabinetController } from "./cabinet.controller";
import { CabinetService } from "./cabinet.service";

@Module({
  imports: [PrismaModule, Tome5AuthModule],
  controllers: [CabinetController],
  providers: [CabinetService],
  exports: [CabinetService],
})
export class CabinetModule {}
