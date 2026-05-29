/**
 * ObjectStorageModule — façade upload présigné (R2 prod / local dev).
 * Importe Tome5AuthModule pour exposer JwtAuthGuard au contrôleur d'upload.
 */
import { Module } from "@nestjs/common";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";
import { ObjectStorageService } from "./object-storage.service";
import { UploadsController } from "./uploads.controller";

@Module({
  imports: [Tome5AuthModule],
  controllers: [UploadsController],
  providers: [ObjectStorageService],
  exports: [ObjectStorageService],
})
export class ObjectStorageModule {}
