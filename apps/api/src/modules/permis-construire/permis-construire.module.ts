/**
 * Tome 2 — Module Permis de Construire.
 *
 * Wizard 5 étapes : identification → pièces → formulaires → review → soumission.
 *
 * Dépendances : PrismaModule (stockage dans `Dossier.payload.permisConstruire`).
 */

import { Module } from "@nestjs/common";
import { PermisConstruireController } from "./controller";
import { PermisConstruireService } from "./service";

/**
 * PrismaModule est @Global (cf. tomes/tome-at/kernel/prisma/prisma.module.ts),
 * donc PrismaService est injectable sans import explicite.
 */
@Module({
  controllers: [PermisConstruireController],
  providers: [PermisConstruireService],
  exports: [PermisConstruireService],
})
export class PermisConstruireModule {}
