import { Module } from "@nestjs/common";
import { DriveService } from "./drive.service";
import { DriveController } from "./drive.controller";
import { ArchiveModule } from "../archive/archive.module";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";

@Module({
  imports: [ArchiveModule, Tome5AuthModule],
  controllers: [DriveController],
  providers: [DriveService],
  exports: [DriveService],
})
export class DriveModule {}
