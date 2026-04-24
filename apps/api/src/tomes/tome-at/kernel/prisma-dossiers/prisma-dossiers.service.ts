import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient as PrismaClientDossiers } from "@prisma/client-dossiers";

@Injectable()
export class PrismaDossiersService extends PrismaClientDossiers implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaDossiersService.name);

  async onModuleInit() {
    this.logger.log("PrismaDossiersService ready (lazy connect).");
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {
      // ignore
    }
  }
}
