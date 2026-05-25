import { Module, forwardRef } from "@nestjs/common";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { Tome2Module } from "../../tome-2/tome-2.module";
import { DossierInteractionsController } from "./dossier-interactions.controller";
import { DossierInteractionsService } from "./dossier-interactions.service";
import { DossierNotifService } from "./dossier-notif.service";

/**
 * DossierInteractionsModule — fil d'interactions Dossier (Tome 6).
 *
 * Dépendances :
 *  - PrismaService (kernel) — persistence dans Dossier.payload (transition)
 *  - Tome2Module → AntiDesintService (scan contentMD)
 *  - EmailService + TwilioService (Global modules → import implicite)
 */
@Module({
  imports: [forwardRef(() => Tome2Module)],
  controllers: [DossierInteractionsController],
  providers: [
    PrismaService,
    DossierInteractionsService,
    DossierNotifService,
  ],
  exports: [DossierInteractionsService, DossierNotifService],
})
export class DossierInteractionsModule {}
