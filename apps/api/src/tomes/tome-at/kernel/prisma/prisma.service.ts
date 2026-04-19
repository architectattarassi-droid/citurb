import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("Prisma connected to database.");
    } catch (err: any) {
      // En dev sans DATABASE_URL, on log un warning mais on ne bloque PAS le démarrage.
      // Les endpoints qui nécessitent la DB renverront une erreur claire à la demande.
      this.logger.warn(
        `Prisma could not connect (DATABASE_URL absent ou DB inaccessible). ` +
        `L'API démarre en mode dégradé — endpoints DB retourneront 503. ` +
        `Erreur : ${err?.message ?? err}`
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {
      // ignore
    }
  }
}
