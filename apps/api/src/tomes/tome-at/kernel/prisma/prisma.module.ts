import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/**
 * TOME @ — Kernel Prisma
 * Global module so every tome can inject PrismaService.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
