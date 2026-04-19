import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient as PrismaClientDossiers } from "@prisma/client-dossiers";

@Injectable()
export class PrismaDossiersService extends PrismaClientDossiers implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaDossiersService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("PrismaDossiers connected to database.");
    } catch (err: any) {
      this.logger.warn(
        `PrismaDossiers could not connect (DOSSIERS_DATABASE_URL absent ou DB inaccessible). ` +
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
