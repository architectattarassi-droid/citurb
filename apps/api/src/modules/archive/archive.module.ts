import { Module } from "@nestjs/common";
import { ArchiveService } from "./archive.service";
import { ArchiveController } from "./archive.controller";
import { PrismaModule } from "../../tomes/tome-at/kernel/prisma/prisma.module";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";

@Module({
  imports: [PrismaModule, Tome5AuthModule],
  controllers: [ArchiveController],
  providers: [ArchiveService],
  exports: [ArchiveService],
})
export class ArchiveModule {}
