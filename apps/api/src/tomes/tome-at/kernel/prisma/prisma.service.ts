import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    this.logger.log("PrismaService ready (lazy connect).");
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {
      // ignore
    }
  }
}
